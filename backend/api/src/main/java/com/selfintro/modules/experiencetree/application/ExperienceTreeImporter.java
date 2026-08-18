package com.selfintro.modules.experiencetree.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.selfintro.modules.experiencetree.domain.entity.*;
import com.selfintro.modules.experiencetree.domain.enums.TradeoffCriterion;
import com.selfintro.modules.experiencetree.domain.repository.*;
import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExperienceTreeImporter {
    private static final String RESOURCE_PATTERN = "classpath*:experience-tree/*/*.yaml";
    private static final String TOPOLOGY_RESOURCE = "experience-tree/topology.yaml";
    private static final String IMPORT_LOCK = "self-intro:experience-tree-import";

    private final DecisionSituationRepository situationRepository;
    private final DecisionOptionRepository optionRepository;
    private final DecisionTradeoffRepository tradeoffRepository;
    private final DecisionWarningRepository warningRepository;
    private final DecisionSourceRepository sourceRepository;
    private final DecisionSituationRelationRepository relationRepository;
    private final DecisionStudyLinkRepository studyLinkRepository;
    private final StudyRepository studyRepository;
    private final PublicWorkspaceResolver publicWorkspaceResolver;
    private final CacheManager cacheManager;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public ImportResult importAll() {
        if (!isMySql()) {
            return doImport();
        }
        Integer acquired =
                jdbcTemplate.queryForObject("SELECT GET_LOCK(?, 30)", Integer.class, IMPORT_LOCK);
        if (!Objects.equals(acquired, 1)) {
            throw new IllegalStateException("Experience Tree import lock을 획득하지 못했습니다.");
        }
        try {
            return doImport();
        } finally {
            jdbcTemplate.queryForObject("SELECT RELEASE_LOCK(?)", Integer.class, IMPORT_LOCK);
        }
    }

    private boolean isMySql() {
        Boolean result =
                jdbcTemplate.execute(
                        (ConnectionCallback<Boolean>)
                                connection ->
                                        connection
                                                .getMetaData()
                                                .getDatabaseProductName()
                                                .toLowerCase(Locale.ROOT)
                                                .contains("mysql"));
        return Boolean.TRUE.equals(result);
    }

    private ImportResult doImport() {
        List<LoadedDocument> loaded = loadDocuments();
        ExperienceTreeTopologyDocument topology = loadTopology();
        validate(loaded, topology);

        Map<String, DecisionSituation> situations = new LinkedHashMap<>();
        for (LoadedDocument item : loaded) {
            ExperienceTreeDocument document = item.document();
            DecisionSituation situation =
                    situationRepository
                            .findByStableKey(document.stableKey())
                            .orElseGet(() -> DecisionSituation.create(document.stableKey()));
            applySituation(situation, null, document, item.hash());
            situations.put(document.stableKey(), situationRepository.save(situation));
        }
        for (LoadedDocument item : loaded) {
            ExperienceTreeDocument document = item.document();
            DecisionSituation situation = situations.get(document.stableKey());
            String parentKey =
                    topology.parents().getOrDefault(document.stableKey(), document.parentKey());
            DecisionSituation parent =
                    StringUtils.hasText(parentKey) ? situations.get(parentKey) : null;
            applySituation(situation, parent, document, item.hash());
        }

        int optionCount = 0;
        int warningCount = 0;
        for (LoadedDocument item : loaded) {
            ExperienceTreeDocument document = item.document();
            DecisionSituation situation = situations.get(document.stableKey());
            Map<String, DecisionOption> options = new HashMap<>();
            for (ExperienceTreeDocument.OptionDocument draft : safe(document.options())) {
                DecisionOption option =
                        optionRepository
                                .findByStableKey(draft.stableKey())
                                .orElseGet(
                                        () ->
                                                DecisionOption.create(
                                                        situation,
                                                        draft.stableKey(),
                                                        draft.title(),
                                                        draft.summary(),
                                                        text(draft.mechanism()),
                                                        text(draft.applicableWhen()),
                                                        text(draft.avoidWhen()),
                                                        text(draft.advantages()),
                                                        text(draft.disadvantages()),
                                                        text(draft.operationalNotes()),
                                                        draft.displayOrder()));
                option.update(
                        situation,
                        draft.title(),
                        draft.summary(),
                        text(draft.mechanism()),
                        text(draft.applicableWhen()),
                        text(draft.avoidWhen()),
                        text(draft.advantages()),
                        text(draft.disadvantages()),
                        text(draft.operationalNotes()),
                        draft.displayOrder());
                option = optionRepository.save(option);
                options.put(draft.stableKey(), option);
                optionCount++;
                DecisionOption savedOption = option;
                for (ExperienceTreeDocument.TradeoffDocument tradeoffDraft :
                        safe(draft.tradeoffs())) {
                    DecisionTradeoff tradeoff =
                            tradeoffRepository
                                    .findByOptionIdAndCriterion(
                                            savedOption.getId(), tradeoffDraft.criterion())
                                    .orElseGet(
                                            () ->
                                                    DecisionTradeoff.create(
                                                            savedOption,
                                                            tradeoffDraft.criterion(),
                                                            tradeoffDraft.level(),
                                                            tradeoffDraft.explanation(),
                                                            tradeoffDraft.displayOrder()));
                    tradeoff.update(
                            tradeoffDraft.level(),
                            tradeoffDraft.explanation(),
                            tradeoffDraft.displayOrder());
                    tradeoffRepository.save(tradeoff);
                }
                reconcileTradeoffs(savedOption, draft);
            }
            reconcileOptions(situation, options.keySet());

            Map<String, DecisionWarning> warnings = new HashMap<>();
            for (ExperienceTreeDocument.WarningDocument draft : safe(document.warnings())) {
                DecisionOption option =
                        StringUtils.hasText(draft.optionKey())
                                ? required(options, draft.optionKey(), "warning option")
                                : null;
                DecisionWarning warning =
                        warningRepository
                                .findByStableKey(draft.stableKey())
                                .orElseGet(
                                        () ->
                                                DecisionWarning.create(
                                                        situation,
                                                        option,
                                                        draft.stableKey(),
                                                        draft.classification(),
                                                        draft.reasonType(),
                                                        draft.title(),
                                                        text(draft.description()),
                                                        text(draft.failureCondition()),
                                                        text(draft.consequence()),
                                                        text(draft.correction()),
                                                        draft.severity(),
                                                        draft.displayOrder()));
                warning.update(
                        situation,
                        option,
                        draft.classification(),
                        draft.reasonType(),
                        draft.title(),
                        text(draft.description()),
                        text(draft.failureCondition()),
                        text(draft.consequence()),
                        text(draft.correction()),
                        draft.severity(),
                        draft.displayOrder());
                warning = warningRepository.save(warning);
                warnings.put(draft.stableKey(), warning);
                warningCount++;
            }
            reconcileWarnings(situation, warnings.keySet());

            sourceRepository.deleteAllBySituationId(situation.getId());
            for (ExperienceTreeDocument.SourceDocument draft : safe(document.sources())) {
                DecisionOption option =
                        StringUtils.hasText(draft.optionKey())
                                ? required(options, draft.optionKey(), "source option")
                                : null;
                DecisionWarning warning =
                        StringUtils.hasText(draft.warningKey())
                                ? required(warnings, draft.warningKey(), "source warning")
                                : null;
                sourceRepository.save(
                        DecisionSource.create(
                                situation,
                                option,
                                warning,
                                draft.sourceType(),
                                draft.title(),
                                draft.url(),
                                draft.publisher(),
                                draft.applicableVersion(),
                                draft.accessedAt(),
                                text(draft.note()),
                                draft.displayOrder()));
            }
        }
        reconcileSituations(situations.keySet());
        syncRelations(topology, situations);
        syncStudyLinks(topology, situations);
        clearCaches();
        return new ImportResult(loaded.size(), optionCount, warningCount);
    }

    private List<LoadedDocument> loadDocuments() {
        ObjectMapper mapper = new ObjectMapper(new YAMLFactory()).findAndRegisterModules();
        try {
            Resource[] resources =
                    new PathMatchingResourcePatternResolver().getResources(RESOURCE_PATTERN);
            List<LoadedDocument> result = new ArrayList<>();
            for (Resource resource : resources) {
                byte[] bytes = resource.getInputStream().readAllBytes();
                var documents = mapper.readerFor(ExperienceTreeDocument.class).readValues(bytes);
                while (documents.hasNext()) {
                    ExperienceTreeDocument document = (ExperienceTreeDocument) documents.next();
                    result.add(
                            new LoadedDocument(
                                    document,
                                    sha256(
                                            (document.stableKey()
                                                            + "\n"
                                                            + new String(
                                                                    bytes, StandardCharsets.UTF_8))
                                                    .getBytes(StandardCharsets.UTF_8)),
                                    resource.getDescription()));
                }
            }
            return result;
        } catch (IOException exception) {
            throw new IllegalStateException("Experience Tree YAML을 읽을 수 없습니다.", exception);
        }
    }

    private ExperienceTreeTopologyDocument loadTopology() {
        ObjectMapper mapper = new ObjectMapper(new YAMLFactory()).findAndRegisterModules();
        try {
            return mapper.readValue(
                    new ClassPathResource(TOPOLOGY_RESOURCE).getInputStream(),
                    ExperienceTreeTopologyDocument.class);
        } catch (IOException exception) {
            throw new IllegalStateException("Experience Tree topology YAML을 읽을 수 없습니다.", exception);
        }
    }

    private void validate(List<LoadedDocument> loaded, ExperienceTreeTopologyDocument topology) {
        if (loaded.isEmpty()) throw new IllegalStateException("Experience Tree YAML이 없습니다.");
        Set<String> situationKeys = new HashSet<>();
        Set<String> childKeys = new HashSet<>();
        Map<String, String> parentByKey = new HashMap<>();
        for (LoadedDocument item : loaded) {
            ExperienceTreeDocument value = item.document();
            requiredText(value.stableKey(), item.source() + " stableKey");
            requiredText(value.title(), value.stableKey() + " title");
            if (!situationKeys.add(value.stableKey())) duplicate(value.stableKey());
            if (value.domain() == null || value.verificationStatus() == null)
                throw new IllegalStateException(value.stableKey() + ": domain/status가 필요합니다.");
            if (safe(value.options()).size() < 2)
                throw new IllegalStateException(value.stableKey() + ": 선택지는 최소 2개입니다.");
            if (value.verificationStatus().name().equals("VERIFIED")
                    && safe(value.sources()).isEmpty())
                throw new IllegalStateException(value.stableKey() + ": VERIFIED 항목에는 출처가 필요합니다.");
            parentByKey.put(
                    value.stableKey(),
                    topology.parents().getOrDefault(value.stableKey(), value.parentKey()));
            for (ExperienceTreeDocument.OptionDocument option : safe(value.options())) {
                requiredText(option.stableKey(), value.stableKey() + " option stableKey");
                if (!childKeys.add(option.stableKey())) duplicate(option.stableKey());
                if (safe(option.tradeoffs()).isEmpty())
                    throw new IllegalStateException(option.stableKey() + ": tradeoff가 필요합니다.");
            }
            for (ExperienceTreeDocument.WarningDocument warning : safe(value.warnings())) {
                requiredText(warning.failureCondition(), warning.stableKey() + " failureCondition");
                requiredText(warning.correction(), warning.stableKey() + " correction");
                if (!childKeys.add(warning.stableKey())) duplicate(warning.stableKey());
            }
        }
        for (Map.Entry<String, String> entry : parentByKey.entrySet()) {
            if (StringUtils.hasText(entry.getValue()) && !situationKeys.contains(entry.getValue()))
                throw new IllegalStateException(entry.getKey() + ": 부모가 없습니다: " + entry.getValue());
            Set<String> path = new HashSet<>();
            String current = entry.getKey();
            while (StringUtils.hasText(current)) {
                if (!path.add(current)) throw new IllegalStateException("부모 순환: " + entry.getKey());
                current = parentByKey.get(current);
            }
        }
        Set<String> relationKeys = new HashSet<>();
        for (ExperienceTreeTopologyDocument.RelationDocument relation :
                safe(topology.relations())) {
            if (!situationKeys.contains(relation.sourceKey())
                    || !situationKeys.contains(relation.targetKey())) {
                throw new IllegalStateException("relation이 존재하지 않는 상황을 참조합니다: " + relation);
            }
            if (relation.sourceKey().equals(relation.targetKey())
                    || relation.relationType() == null) {
                throw new IllegalStateException("유효하지 않은 relation: " + relation);
            }
            String key =
                    relation.sourceKey()
                            + ':'
                            + relation.targetKey()
                            + ':'
                            + relation.relationType();
            if (!relationKeys.add(key)) duplicate(key);
        }
        Set<String> seedKeys = new HashSet<>();
        for (ExperienceTreeTopologyDocument.StudyLinkDocument link : safe(topology.studyLinks())) {
            requiredText(link.seedKey(), "study link seedKey");
            if (!seedKeys.add(link.seedKey())) duplicate(link.seedKey());
            if (!situationKeys.contains(link.situationKey())) {
                throw new IllegalStateException("study link 상황이 없습니다: " + link.situationKey());
            }
            requiredText(link.studySlug(), link.seedKey() + " studySlug");
            if (link.relationType() == null) {
                throw new IllegalStateException(link.seedKey() + ": relationType이 필요합니다.");
            }
        }
    }

    private void applySituation(
            DecisionSituation target,
            DecisionSituation parent,
            ExperienceTreeDocument draft,
            String hash) {
        target.update(
                parent,
                draft.domain(),
                draft.topic(),
                draft.title(),
                draft.summary(),
                text(draft.problem()),
                text(draft.contextMarkdown()),
                text(draft.constraintsMarkdown()),
                draft.verificationStatus(),
                draft.contentVersion(),
                hash,
                draft.verifiedAt(),
                draft.nextReviewAt(),
                draft.displayOrder());
    }

    private void reconcileTradeoffs(
            DecisionOption option, ExperienceTreeDocument.OptionDocument draft) {
        Set<TradeoffCriterion> desired =
                safe(draft.tradeoffs()).stream()
                        .map(ExperienceTreeDocument.TradeoffDocument::criterion)
                        .collect(Collectors.toSet());
        tradeoffRepository.findAllByOptionId(option.getId()).stream()
                .filter(value -> !desired.contains(value.getCriterion()))
                .forEach(tradeoffRepository::delete);
    }

    private void reconcileOptions(DecisionSituation situation, Set<String> desiredKeys) {
        optionRepository.findAllBySituationIdOrderByDisplayOrderAsc(situation.getId()).stream()
                .filter(value -> !desiredKeys.contains(value.getStableKey()))
                .forEach(
                        stale -> {
                            studyLinkRepository
                                    .findAllByOptionId(stale.getId())
                                    .forEach(
                                            link ->
                                                    link.update(
                                                            null,
                                                            link.getRelationType(),
                                                            link.getNote(),
                                                            link.getDisplayOrder()));
                            optionRepository.delete(stale);
                        });
    }

    private void reconcileWarnings(DecisionSituation situation, Set<String> desiredKeys) {
        warningRepository.findAllBySituationIdOrderByDisplayOrderAsc(situation.getId()).stream()
                .filter(value -> !desiredKeys.contains(value.getStableKey()))
                .forEach(warningRepository::delete);
    }

    private void reconcileSituations(Set<String> desiredKeys) {
        situationRepository.findAll().stream()
                .filter(value -> !desiredKeys.contains(value.getStableKey()))
                .forEach(DecisionSituation::deprecate);
    }

    private void syncRelations(
            ExperienceTreeTopologyDocument topology, Map<String, DecisionSituation> situations) {
        relationRepository.deleteAllInBatch();
        for (ExperienceTreeTopologyDocument.RelationDocument draft : safe(topology.relations())) {
            relationRepository.save(
                    DecisionSituationRelation.create(
                            required(situations, draft.sourceKey(), "relation source"),
                            required(situations, draft.targetKey(), "relation target"),
                            draft.relationType(),
                            draft.displayOrder()));
        }
    }

    private void syncStudyLinks(
            ExperienceTreeTopologyDocument topology, Map<String, DecisionSituation> situations) {
        Optional<Long> publicWorkspaceId =
                publicWorkspaceResolver.findDefaultPublicWorkspace().map(value -> value.getId());
        if (publicWorkspaceId.isEmpty()) {
            log.info("공개 bootstrap Workspace가 없어 Experience Tree 기본 Study 연결을 건너뜁니다.");
            return;
        }
        Long workspaceId = publicWorkspaceId.get();
        Set<String> desiredSeedKeys = new HashSet<>();
        for (ExperienceTreeTopologyDocument.StudyLinkDocument draft : safe(topology.studyLinks())) {
            DecisionSituation situation =
                    required(situations, draft.situationKey(), "study link situation");
            DecisionOption option = null;
            if (StringUtils.hasText(draft.optionKey())) {
                option =
                        optionRepository
                                .findByStableKey(draft.optionKey())
                                .orElseThrow(
                                        () ->
                                                new IllegalStateException(
                                                        "study link option을 찾을 수 없습니다: "
                                                                + draft.optionKey()));
                if (!option.getSituation().getId().equals(situation.getId())) {
                    throw new IllegalStateException(
                            "study link option이 상황에 속하지 않습니다: " + draft.seedKey());
                }
            }
            Optional<Study> studyCandidate =
                    studyRepository.findByWorkspaceIdAndSlug(workspaceId, draft.studySlug());
            if (studyCandidate.isEmpty()) {
                log.warn(
                        "Experience Tree 초기 연결 Study를 찾지 못해 건너뜁니다: seedKey={}, slug={}",
                        draft.seedKey(),
                        draft.studySlug());
                continue;
            }
            desiredSeedKeys.add(draft.seedKey());
            Study study = studyCandidate.get();
            DecisionOption resolvedOption = option;
            DecisionStudyLink link =
                    studyLinkRepository
                            .findByWorkspaceIdAndSeedKey(workspaceId, draft.seedKey())
                            .orElseGet(
                                    () ->
                                            studyLinkRepository
                                                    .findByWorkspaceIdAndSituationIdAndOptionScopeKeyAndStudyIdAndRelationType(
                                                            workspaceId,
                                                            situation.getId(),
                                                            resolvedOption == null
                                                                    ? "__SITUATION__"
                                                                    : resolvedOption.getStableKey(),
                                                            study.getId(),
                                                            draft.relationType())
                                                    .orElseGet(
                                                            () ->
                                                                    DecisionStudyLink.createCatalog(
                                                                            workspaceId,
                                                                            draft.seedKey(),
                                                                            situation,
                                                                            resolvedOption,
                                                                            study,
                                                                            draft.relationType(),
                                                                            text(draft.note()),
                                                                            draft.displayOrder())));
            link.updateCatalog(
                    workspaceId,
                    draft.seedKey(),
                    situation,
                    option,
                    study,
                    draft.relationType(),
                    text(draft.note()),
                    draft.displayOrder());
            studyLinkRepository.save(link);
        }
        studyLinkRepository.findAllByWorkspaceIdAndManagedByCatalogTrue(workspaceId).stream()
                .filter(link -> !desiredSeedKeys.contains(link.getSeedKey()))
                .forEach(studyLinkRepository::delete);
    }

    private void clearCaches() {
        for (String name :
                List.of(
                        "experience-tree:index",
                        "experience-tree:detail",
                        "experience-tree:studies")) {
            if (cacheManager.getCache(name) != null) cacheManager.getCache(name).clear();
        }
    }

    private static <T> List<T> safe(List<T> values) {
        return values == null ? List.of() : values;
    }

    private static String text(String value) {
        return value == null ? "" : value;
    }

    private static void requiredText(String value, String label) {
        if (!StringUtils.hasText(value)) throw new IllegalStateException(label + "가 필요합니다.");
    }

    private static void duplicate(String key) {
        throw new IllegalStateException("중복 stableKey: " + key);
    }

    private static <T> T required(Map<String, T> values, String key, String label) {
        T value = values.get(key);
        if (value == null) throw new IllegalStateException(label + "을 찾을 수 없습니다: " + key);
        return value;
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private record LoadedDocument(ExperienceTreeDocument document, String hash, String source) {}

    public record ImportResult(int situations, int options, int warnings) {}
}
