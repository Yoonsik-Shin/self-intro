package com.selfintro.modules.experiencetree.application;

import com.selfintro.modules.experiencetree.domain.entity.*;
import com.selfintro.modules.experiencetree.domain.enums.*;
import com.selfintro.modules.experiencetree.domain.repository.*;
import com.selfintro.modules.experiencetree.presentation.dto.DecisionStudyLinkRequest;
import com.selfintro.modules.experiencetree.presentation.dto.ExperienceTreeResponse;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.enums.StudyStatus;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import jakarta.persistence.EntityNotFoundException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExperienceTreeService {
    private final DecisionSituationRepository situationRepository;
    private final DecisionOptionRepository optionRepository;
    private final DecisionTradeoffRepository tradeoffRepository;
    private final DecisionWarningRepository warningRepository;
    private final DecisionSourceRepository sourceRepository;
    private final DecisionStudyLinkRepository studyLinkRepository;
    private final DecisionSituationRelationRepository relationRepository;
    private final StudyRepository studyRepository;

    @Cacheable(
            value = "experience-tree:index",
            key =
                    "(#domain == null ? 'ALL' : #domain.name()) + ':' + (#query == null ? '' : #query)")
    public ExperienceTreeResponse.Index index(DecisionDomain domain, String query) {
        List<DecisionSituation> situations =
                domain == null
                        ? situationRepository
                                .findAllByVerificationStatusOrderByDomainAscDisplayOrderAsc(
                                        VerificationStatus.VERIFIED)
                        : situationRepository
                                .findAllByDomainAndVerificationStatusOrderByDisplayOrderAsc(
                                        domain, VerificationStatus.VERIFIED);
        return buildIndex(situations, query);
    }

    public ExperienceTreeResponse.Index adminIndex(DecisionDomain domain, String query) {
        List<DecisionSituation> situations =
                domain == null
                        ? situationRepository.findAllByOrderByDomainAscDisplayOrderAsc()
                        : situationRepository.findAllByDomainOrderByDisplayOrderAsc(domain);
        return buildIndex(situations, query);
    }

    private ExperienceTreeResponse.Index buildIndex(
            List<DecisionSituation> situations, String query) {
        String normalized =
                StringUtils.hasText(query) ? query.trim().toLowerCase(Locale.ROOT) : null;
        List<ExperienceTreeResponse.SituationSummary> summaries =
                situations.stream()
                        .filter(
                                value ->
                                        normalized == null
                                                || value.getTitle()
                                                        .toLowerCase(Locale.ROOT)
                                                        .contains(normalized)
                                                || value.getSummary()
                                                        .toLowerCase(Locale.ROOT)
                                                        .contains(normalized)
                                                || value.getTopic()
                                                        .toLowerCase(Locale.ROOT)
                                                        .contains(normalized))
                        .map(this::toSummary)
                        .toList();
        Set<String> visibleKeys =
                summaries.stream()
                        .map(ExperienceTreeResponse.SituationSummary::stableKey)
                        .collect(java.util.stream.Collectors.toSet());
        List<ExperienceTreeResponse.SituationRelation> relations =
                relationRepository.findAllByOrderByDisplayOrderAsc().stream()
                        .filter(
                                value ->
                                        visibleKeys.contains(value.getSource().getStableKey())
                                                && visibleKeys.contains(
                                                        value.getTarget().getStableKey()))
                        .map(ExperienceTreeResponse.SituationRelation::from)
                        .toList();
        String version = sha256(indexVersionInput(summaries, situations, relations));
        return new ExperienceTreeResponse.Index(version, summaries, relations);
    }

    @Cacheable(value = "experience-tree:detail", key = "#stableKey")
    public ExperienceTreeResponse.Detail detail(String stableKey) {
        DecisionSituation situation =
                situationRepository
                        .findByStableKey(stableKey)
                        .filter(
                                value ->
                                        value.getVerificationStatus()
                                                == VerificationStatus.VERIFIED)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "Situation not found: " + stableKey));
        return toDetail(situation, false);
    }

    public ExperienceTreeResponse.Detail adminDetail(String stableKey) {
        return toDetail(requiredSituation(stableKey), true);
    }

    @Cacheable(value = "experience-tree:studies", key = "#stableKey + ':' + #admin")
    public List<ExperienceTreeResponse.StudyLink> studies(String stableKey, boolean admin) {
        DecisionSituation situation = requiredSituation(stableKey);
        if (!admin && situation.getVerificationStatus() != VerificationStatus.VERIFIED) {
            throw new EntityNotFoundException("Situation not found: " + stableKey);
        }
        return studyLinkRepository
                .findAllBySituationIdOrderByDisplayOrderAsc(situation.getId())
                .stream()
                .filter(link -> admin || link.getStudy().getStatus() == StudyStatus.PUBLISHED)
                .map(ExperienceTreeResponse.StudyLink::from)
                .toList();
    }

    @Transactional
    @CacheEvict(
            value = {"experience-tree:index", "experience-tree:detail", "experience-tree:studies"},
            allEntries = true)
    public ExperienceTreeResponse.StudyLink createLink(DecisionStudyLinkRequest request) {
        DecisionSituation situation = requiredSituation(request.situationKey());
        DecisionOption option = resolveOption(situation, request.optionKey());
        Study study =
                studyRepository
                        .findById(request.studyId())
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "Study not found: " + request.studyId()));
        validateRetrospectRelation(study, request.relationType());
        DecisionStudyLink link =
                DecisionStudyLink.create(
                        situation,
                        option,
                        study,
                        request.relationType(),
                        request.note(),
                        request.displayOrder());
        return ExperienceTreeResponse.StudyLink.from(studyLinkRepository.save(link));
    }

    @Transactional
    @CacheEvict(
            value = {"experience-tree:index", "experience-tree:detail", "experience-tree:studies"},
            allEntries = true)
    public ExperienceTreeResponse.StudyLink updateLink(Long id, DecisionStudyLinkRequest request) {
        DecisionStudyLink link =
                studyLinkRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "Decision Study link not found: " + id));
        rejectCatalogManagedMutation(link);
        if (!link.getSituation().getStableKey().equals(request.situationKey())
                || !link.getStudy().getId().equals(request.studyId())) {
            throw new IllegalArgumentException("상황과 Study는 변경할 수 없습니다. 링크를 다시 생성하세요.");
        }
        DecisionOption option = resolveOption(link.getSituation(), request.optionKey());
        validateRetrospectRelation(link.getStudy(), request.relationType());
        link.update(option, request.relationType(), request.note(), request.displayOrder());
        return ExperienceTreeResponse.StudyLink.from(link);
    }

    @Transactional
    @CacheEvict(
            value = {"experience-tree:index", "experience-tree:detail", "experience-tree:studies"},
            allEntries = true)
    public void deleteLink(Long id) {
        DecisionStudyLink link =
                studyLinkRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "Decision Study link not found: " + id));
        rejectCatalogManagedMutation(link);
        studyLinkRepository.delete(link);
    }

    private ExperienceTreeResponse.SituationSummary toSummary(DecisionSituation value) {
        List<DecisionOption> options =
                optionRepository.findAllBySituationIdOrderByDisplayOrderAsc(value.getId());
        int warningCount =
                warningRepository.findAllBySituationIdOrderByDisplayOrderAsc(value.getId()).size();
        int studyCount =
                (int)
                        studyLinkRepository
                                .findAllBySituationIdOrderByDisplayOrderAsc(value.getId())
                                .stream()
                                .filter(
                                        link ->
                                                link.getStudy().getStatus()
                                                        == StudyStatus.PUBLISHED)
                                .count();
        return new ExperienceTreeResponse.SituationSummary(
                value.getStableKey(),
                value.getParent() == null ? null : value.getParent().getStableKey(),
                value.getDomain(),
                value.getTopic(),
                value.getTitle(),
                value.getSummary(),
                value.getVerificationStatus(),
                options.size(),
                warningCount,
                studyCount,
                value.getVerifiedAt(),
                value.getNextReviewAt(),
                value.getDisplayOrder());
    }

    private ExperienceTreeResponse.Detail toDetail(DecisionSituation situation, boolean admin) {
        List<DecisionOption> options =
                optionRepository.findAllBySituationIdOrderByDisplayOrderAsc(situation.getId());
        List<DecisionTradeoff> tradeoffs =
                options.isEmpty()
                        ? List.of()
                        : tradeoffRepository.findAllByOptionIdInOrderByDisplayOrderAsc(
                                options.stream().map(DecisionOption::getId).toList());
        Map<Long, List<DecisionTradeoff>> byOption = new HashMap<>();
        tradeoffs.forEach(
                value ->
                        byOption.computeIfAbsent(
                                        value.getOption().getId(), ignored -> new ArrayList<>())
                                .add(value));
        return new ExperienceTreeResponse.Detail(
                situation.getStableKey(),
                situation.getParent() == null ? null : situation.getParent().getStableKey(),
                situation.getDomain(),
                situation.getTopic(),
                situation.getTitle(),
                situation.getSummary(),
                situation.getProblem(),
                situation.getContextMarkdown(),
                situation.getConstraintsMarkdown(),
                situation.getVerificationStatus(),
                situation.getContentVersion(),
                situation.getContentHash(),
                situation.getVerifiedAt(),
                situation.getNextReviewAt(),
                options.stream()
                        .map(
                                value ->
                                        ExperienceTreeResponse.Option.from(
                                                value,
                                                byOption.getOrDefault(value.getId(), List.of())))
                        .toList(),
                warningRepository
                        .findAllBySituationIdOrderByDisplayOrderAsc(situation.getId())
                        .stream()
                        .map(ExperienceTreeResponse.Warning::from)
                        .toList(),
                sourceRepository
                        .findAllBySituationIdOrderByDisplayOrderAsc(situation.getId())
                        .stream()
                        .map(ExperienceTreeResponse.Source::from)
                        .toList(),
                relationRepository.findAllByOrderByDisplayOrderAsc().stream()
                        .filter(
                                value ->
                                        value.getSource().getId().equals(situation.getId())
                                                || value.getTarget()
                                                        .getId()
                                                        .equals(situation.getId()))
                        .map(ExperienceTreeResponse.SituationRelation::from)
                        .toList(),
                studies(situation.getStableKey(), admin));
    }

    private DecisionSituation requiredSituation(String stableKey) {
        return situationRepository
                .findByStableKey(stableKey)
                .orElseThrow(
                        () -> new EntityNotFoundException("Situation not found: " + stableKey));
    }

    private DecisionOption resolveOption(DecisionSituation situation, String optionKey) {
        if (!StringUtils.hasText(optionKey)) return null;
        DecisionOption option =
                optionRepository
                        .findByStableKey(optionKey)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "Option not found: " + optionKey));
        if (!option.getSituation().getId().equals(situation.getId()))
            throw new IllegalArgumentException("선택지가 해당 상황에 속하지 않습니다.");
        return option;
    }

    private void validateRetrospectRelation(Study study, DecisionStudyRelationType relationType) {
        if (EnumSet.of(
                                DecisionStudyRelationType.FAILED,
                                DecisionStudyRelationType.REPLACED,
                                DecisionStudyRelationType.RETROSPECT)
                        .contains(relationType)
                && study.getSection()
                        != com.selfintro.modules.study.domain.enums.StudySection.RETROSPECT) {
            throw new IllegalArgumentException("회고 관계는 RETROSPECT Study에만 연결할 수 있습니다.");
        }
    }

    private static void rejectCatalogManagedMutation(DecisionStudyLink link) {
        if (link.isManagedByCatalog()) {
            throw new IllegalArgumentException("정적 카탈로그 연결은 topology.yaml에서만 변경할 수 있습니다.");
        }
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static String indexVersionInput(
            List<ExperienceTreeResponse.SituationSummary> summaries,
            List<DecisionSituation> situations,
            List<ExperienceTreeResponse.SituationRelation> relations) {
        Map<String, String> hashes =
                situations.stream()
                        .collect(
                                java.util.stream.Collectors.toMap(
                                        DecisionSituation::getStableKey,
                                        DecisionSituation::getContentHash));
        String situationPart =
                summaries.stream()
                        .map(
                                value ->
                                        value.stableKey()
                                                + ':'
                                                + value.parentKey()
                                                + ':'
                                                + hashes.get(value.stableKey())
                                                + ':'
                                                + value.studyCount())
                        .collect(java.util.stream.Collectors.joining("|"));
        String relationPart =
                relations.stream()
                        .map(
                                value ->
                                        value.sourceKey()
                                                + ':'
                                                + value.targetKey()
                                                + ':'
                                                + value.relationType())
                        .collect(java.util.stream.Collectors.joining("|"));
        return situationPart + "#" + relationPart;
    }
}
