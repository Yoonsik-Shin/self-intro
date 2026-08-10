package com.selfintro.modules.study.application;

import com.selfintro.global.config.RabbitMqConfig;
import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.entity.ExperienceDetail;
import com.selfintro.modules.experience.domain.repository.ExperienceDetailRepository;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import com.selfintro.modules.storage.application.StorageService;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.entity.StudyImage;
import com.selfintro.modules.study.domain.entity.StudyRelation;
import com.selfintro.modules.study.domain.entity.StudyTaxonomyCuration;
import com.selfintro.modules.study.domain.entity.Tag;
import com.selfintro.modules.study.domain.enums.StudySection;
import com.selfintro.modules.study.domain.enums.StudyStatus;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import com.selfintro.modules.study.domain.repository.StudySearchCondition;
import com.selfintro.modules.study.domain.repository.StudyTaxonomyCurationRepository;
import com.selfintro.modules.study.domain.repository.TagRepository;
import com.selfintro.modules.study.event.StudyUpdatedEvent;
import com.selfintro.modules.study.presentation.dto.StudyImageRequest;
import com.selfintro.modules.study.presentation.dto.StudyPageResponse;
import com.selfintro.modules.study.presentation.dto.StudyRelationRequest;
import com.selfintro.modules.study.presentation.dto.StudyRequest;
import com.selfintro.modules.study.presentation.dto.StudyResponse;
import com.selfintro.modules.study.presentation.dto.StudyTaxonomyResponse;
import com.selfintro.modules.taxonomy.domain.entity.TaxonomyNode;
import com.selfintro.modules.taxonomy.domain.repository.TaxonomyNodeRepository;
import com.selfintro.modules.taxonomy.presentation.dto.TaxonomyNodeResponse;
import jakarta.persistence.EntityNotFoundException;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyService {

    private final StudyRepository studyRepository;
    private final TaxonomyNodeRepository taxonomyNodeRepository;
    private final StudyTaxonomyCurationRepository curationRepository;
    private final TagRepository tagRepository;
    private final SkillRepository skillRepository;
    private final ExperienceRepository experienceRepository;
    private final ExperienceDetailRepository experienceDetailRepository;
    private final StorageService storageService;
    private final RabbitTemplate rabbitTemplate;

    public StudyPageResponse searchPublished(
            String keyword,
            Long taxonomyNodeId,
            List<String> tags,
            List<Long> skillIds,
            List<Long> experienceIds,
            List<Long> experienceDetailIds,
            StudySection section,
            int page,
            int size) {
        return search(
                keyword,
                taxonomyNodeId,
                tags,
                skillIds,
                experienceIds,
                experienceDetailIds,
                StudyStatus.PUBLISHED,
                section,
                page,
                size);
    }

    public StudyPageResponse searchAdmin(
            String keyword,
            Long taxonomyNodeId,
            List<String> tags,
            List<Long> skillIds,
            List<Long> experienceIds,
            List<Long> experienceDetailIds,
            StudyStatus status,
            StudySection section,
            int page,
            int size) {
        return search(
                keyword,
                taxonomyNodeId,
                tags,
                skillIds,
                experienceIds,
                experienceDetailIds,
                status,
                section,
                page,
                size);
    }

    private StudyPageResponse search(
            String keyword,
            Long taxonomyNodeId,
            List<String> tags,
            List<Long> skillIds,
            List<Long> experienceIds,
            List<Long> experienceDetailIds,
            StudyStatus status,
            StudySection section,
            int page,
            int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        List<Long> taxonomyNodeIds =
                taxonomyNodeId == null
                        ? null
                        : new ArrayList<>(resolveWithDescendants(taxonomyNodeId));
        Page<StudyResponse> result =
                studyRepository
                        .search(
                                new StudySearchCondition(
                                        keyword,
                                        taxonomyNodeIds,
                                        tags,
                                        skillIds,
                                        experienceIds,
                                        experienceDetailIds,
                                        status,
                                        section),
                                PageRequest.of(Math.max(page, 0), safeSize))
                        .map(this::toResponse);
        return StudyPageResponse.from(result);
    }

    public StudyResponse findPublishedBySlug(String slug) {
        Study study =
                studyRepository
                        .findBySlug(slug)
                        .filter(value -> value.getStatus() == StudyStatus.PUBLISHED)
                        .orElseThrow(() -> new EntityNotFoundException("Study not found: " + slug));
        return toResponse(study);
    }

    private StudyResponse toResponse(Study study) {
        return StudyResponse.from(study, storageService::toPublicUrl);
    }

    public List<StudyResponse.TagResponse> findTags() {
        return tagRepository.findAllByOrderByNameAsc().stream()
                .map(StudyResponse.TagResponse::from)
                .toList();
    }

    public List<StudyTaxonomyResponse> findPublicTaxonomy() {
        Map<Long, Long> totals = rolledUpPublishedCounts();
        return curationRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(
                        curation ->
                                StudyTaxonomyResponse.from(
                                        curation.getTaxonomyNode(),
                                        totals.getOrDefault(
                                                curation.getTaxonomyNode().getId(), 0L)))
                .toList();
    }

    @Transactional
    public List<TaxonomyNodeResponse> findCuration() {
        return curationRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(curation -> TaxonomyNodeResponse.from(curation.getTaxonomyNode()))
                .toList();
    }

    @Transactional
    @CacheEvict(
            value = {
                "bff:learning",
                "bff:introduction",
                "experience-tree:index",
                "experience-tree:detail",
                "experience-tree:studies"
            },
            allEntries = true)
    public List<TaxonomyNodeResponse> replaceCuration(List<Long> taxonomyNodeIds) {
        curationRepository.deleteAll();
        if (taxonomyNodeIds == null || taxonomyNodeIds.isEmpty()) {
            return List.of();
        }
        List<StudyTaxonomyCuration> curations = new ArrayList<>();
        for (int i = 0; i < taxonomyNodeIds.size(); i++) {
            TaxonomyNode node = findTaxonomyNode(taxonomyNodeIds.get(i));
            curations.add(StudyTaxonomyCuration.create(node, i));
        }
        return curationRepository.saveAll(curations).stream()
                .map(curation -> TaxonomyNodeResponse.from(curation.getTaxonomyNode()))
                .toList();
    }

    @Transactional
    @CacheEvict(
            value = {
                "bff:learning",
                "bff:introduction",
                "experience-tree:index",
                "experience-tree:detail",
                "experience-tree:studies"
            },
            allEntries = true)
    public StudyResponse create(StudyRequest request) {
        String slug = uniqueSlug(request.slug(), request.title(), null);
        LocalDateTime publishedAt =
                resolvePublishedAt(request.status(), request.publishedAt(), null);
        Study study =
                Study.create(
                        slug,
                        request.title().trim(),
                        request.summary().trim(),
                        request.contentMarkdown(),
                        request.status(),
                        request.learnedAt(),
                        publishedAt);
        study.changeSection(request.section());

        List<String> removedImageKeys = applyAssociations(study, request);
        Study saved = studyRepository.save(study);
        applyRelations(saved, request.relatedStudies());
        storageService.deleteAll(removedImageKeys);
        publishVectorSyncEvent(saved);
        return toResponse(saved);
    }

    @Transactional
    @CacheEvict(
            value = {
                "bff:learning",
                "bff:introduction",
                "experience-tree:index",
                "experience-tree:detail",
                "experience-tree:studies"
            },
            allEntries = true)
    public StudyResponse update(Long id, StudyRequest request) {
        Study study =
                studyRepository
                        .findById(id)
                        .orElseThrow(() -> new EntityNotFoundException("Study not found: " + id));
        String slug = uniqueSlug(request.slug(), request.title(), id);
        LocalDateTime publishedAt =
                resolvePublishedAt(request.status(), request.publishedAt(), study.getPublishedAt());

        study.update(
                slug,
                request.title().trim(),
                request.summary().trim(),
                request.contentMarkdown(),
                request.status(),
                request.learnedAt(),
                publishedAt);
        study.changeSection(request.section());
        List<String> removedImageKeys = applyAssociations(study, request);
        applyRelations(study, request.relatedStudies());
        storageService.deleteAll(removedImageKeys);
        publishVectorSyncEvent(study);
        return toResponse(study);
    }

    @Transactional
    @CacheEvict(
            value = {
                "bff:learning",
                "bff:introduction",
                "experience-tree:index",
                "experience-tree:detail",
                "experience-tree:studies"
            },
            allEntries = true)
    public void delete(Long id) {
        Study study =
                studyRepository
                        .findById(id)
                        .orElseThrow(() -> new EntityNotFoundException("Study not found: " + id));
        List<String> objectKeys = study.getImages().stream().map(StudyImage::getObjectKey).toList();
        studyRepository.delete(study);
        storageService.deleteAll(objectKeys);
    }

    @Transactional
    @CacheEvict(
            value = {
                "bff:learning",
                "bff:introduction",
                "experience-tree:index",
                "experience-tree:detail",
                "experience-tree:studies"
            },
            allEntries = true)
    public List<StudyResponse> batchPublish(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<Study> studies = studyRepository.findAllById(ids);
        LocalDateTime now = LocalDateTime.now();
        for (Study study : studies) {
            if (study.getStatus() != StudyStatus.PUBLISHED) {
                LocalDateTime publishedAt =
                        study.getPublishedAt() != null ? study.getPublishedAt() : now;
                study.update(
                        study.getSlug(),
                        study.getTitle(),
                        study.getSummary(),
                        study.getContentMarkdown(),
                        StudyStatus.PUBLISHED,
                        study.getLearnedAt(),
                        publishedAt);
            }
        }
        return studies.stream().map(this::toResponse).toList();
    }

    @Transactional
    @CacheEvict(
            value = {
                "bff:learning",
                "bff:introduction",
                "experience-tree:index",
                "experience-tree:detail",
                "experience-tree:studies"
            },
            allEntries = true)
    public List<StudyResponse> batchUnpublish(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<Study> studies = studyRepository.findAllById(ids);
        for (Study study : studies) {
            if (study.getStatus() != StudyStatus.DRAFT) {
                study.update(
                        study.getSlug(),
                        study.getTitle(),
                        study.getSummary(),
                        study.getContentMarkdown(),
                        StudyStatus.DRAFT,
                        study.getLearnedAt(),
                        study.getPublishedAt());
            }
        }
        return studies.stream().map(this::toResponse).toList();
    }

    @Transactional
    @CacheEvict(
            value = {
                "bff:learning",
                "bff:introduction",
                "experience-tree:index",
                "experience-tree:detail",
                "experience-tree:studies"
            },
            allEntries = true)
    public StudyResponse toggleStatus(Long id) {
        Study study =
                studyRepository
                        .findById(id)
                        .orElseThrow(() -> new EntityNotFoundException("Study not found: " + id));
        StudyStatus newStatus =
                study.getStatus() == StudyStatus.PUBLISHED
                        ? StudyStatus.DRAFT
                        : StudyStatus.PUBLISHED;
        LocalDateTime publishedAt =
                newStatus == StudyStatus.PUBLISHED
                        ? (study.getPublishedAt() != null
                                ? study.getPublishedAt()
                                : LocalDateTime.now())
                        : study.getPublishedAt();

        study.update(
                study.getSlug(),
                study.getTitle(),
                study.getSummary(),
                study.getContentMarkdown(),
                newStatus,
                study.getLearnedAt(),
                publishedAt);
        return toResponse(study);
    }

    private void publishVectorSyncEvent(Study saved) {
        rabbitTemplate.convertAndSend(
                RabbitMqConfig.EXCHANGE_NAME,
                RabbitMqConfig.ROUTING_KEY_STUDY_UPDATED,
                new StudyUpdatedEvent(saved.getId(), saved.getTitle(), saved.getContentMarkdown()));
    }

    private TaxonomyNode findTaxonomyNode(Long id) {
        return taxonomyNodeRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Taxonomy node not found: " + id));
    }

    /** 선택한 노드 + 그 하위 전부의 id 집합. 트리 규모가 작아 in-memory로 계산한다. */
    private Set<Long> resolveWithDescendants(Long nodeId) {
        List<TaxonomyNode> all = taxonomyNodeRepository.findAll();
        Map<Long, List<Long>> childrenByParentId = new HashMap<>();
        for (TaxonomyNode node : all) {
            if (node.getParent() != null) {
                childrenByParentId
                        .computeIfAbsent(node.getParent().getId(), key -> new ArrayList<>())
                        .add(node.getId());
            }
        }
        Set<Long> result = new HashSet<>();
        List<Long> queue = new ArrayList<>(List.of(nodeId));
        while (!queue.isEmpty()) {
            Long current = queue.remove(queue.size() - 1);
            if (!result.add(current)) {
                continue;
            }
            queue.addAll(childrenByParentId.getOrDefault(current, List.of()));
        }
        return result;
    }

    /** 노드별 직접 attach + 하위 노드 attach 전부를 합산한 PUBLISHED count. */
    private Map<Long, Long> rolledUpPublishedCounts() {
        List<TaxonomyNode> all = taxonomyNodeRepository.findAll();
        Map<Long, Long> direct =
                studyRepository.countByTaxonomyNodeAndStatus(StudyStatus.PUBLISHED).stream()
                        .collect(
                                Collectors.toMap(
                                        StudyRepository.TaxonomyNodeCountProjection
                                                ::getTaxonomyNodeId,
                                        StudyRepository.TaxonomyNodeCountProjection::getCount));
        Map<Long, List<Long>> childrenByParentId = new HashMap<>();
        for (TaxonomyNode node : all) {
            if (node.getParent() != null) {
                childrenByParentId
                        .computeIfAbsent(node.getParent().getId(), key -> new ArrayList<>())
                        .add(node.getId());
            }
        }
        Map<Long, Long> totals = new HashMap<>();
        for (TaxonomyNode node : all) {
            totals.put(node.getId(), rollUp(node.getId(), direct, childrenByParentId, totals));
        }
        return totals;
    }

    private long rollUp(
            Long nodeId,
            Map<Long, Long> direct,
            Map<Long, List<Long>> childrenByParentId,
            Map<Long, Long> memo) {
        if (memo.containsKey(nodeId)) {
            return memo.get(nodeId);
        }
        long total = direct.getOrDefault(nodeId, 0L);
        for (Long childId : childrenByParentId.getOrDefault(nodeId, List.of())) {
            total += rollUp(childId, direct, childrenByParentId, memo);
        }
        memo.put(nodeId, total);
        return total;
    }

    private List<String> applyAssociations(Study study, StudyRequest request) {
        study.replaceTaxonomyNodes(
                request.taxonomyNodeIds() == null
                        ? List.of()
                        : taxonomyNodeRepository.findAllById(request.taxonomyNodeIds()));
        study.replaceTags(resolveTags(request.tagNames()));
        List<Skill> skills =
                request.skillIds() == null
                        ? List.of()
                        : skillRepository.findAllById(request.skillIds());
        List<Experience> experiences =
                request.experienceIds() == null
                        ? List.of()
                        : experienceRepository.findAllById(request.experienceIds());
        List<ExperienceDetail> experienceDetails =
                request.experienceDetailIds() == null
                        ? List.of()
                        : experienceDetailRepository.findAllById(request.experienceDetailIds());
        study.replaceSkills(skills);
        study.replaceExperiences(experiences);
        study.replaceExperienceDetails(experienceDetails);

        List<StudyImage.Draft> imageDrafts = toImageDrafts(request.images());
        List<String> removedImageKeys = study.imageObjectKeysNotIn(imageDrafts);
        study.reconcileImages(imageDrafts);
        return removedImageKeys;
    }

    private List<StudyImage.Draft> toImageDrafts(List<StudyImageRequest> imageRequests) {
        if (imageRequests == null) {
            return List.of();
        }
        return IntStream.range(0, imageRequests.size())
                .mapToObj(
                        i ->
                                new StudyImage.Draft(
                                        imageRequests.get(i).id(),
                                        imageRequests.get(i).objectKey(),
                                        i))
                .toList();
    }

    private List<Tag> resolveTags(List<String> tagNames) {
        if (tagNames == null) {
            return List.of();
        }
        Set<String> normalizedNames = new LinkedHashSet<>();
        tagNames.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .forEach(normalizedNames::add);

        List<Tag> result = new ArrayList<>();
        for (String name : normalizedNames) {
            result.add(
                    tagRepository
                            .findByNameIgnoreCase(name)
                            .orElseGet(
                                    () ->
                                            tagRepository.save(
                                                    Tag.create(name, uniqueTagSlug(name)))));
        }
        return result;
    }

    private void applyRelations(Study source, List<StudyRelationRequest> requests) {
        if (requests == null) {
            source.replaceRelations(List.of());
            return;
        }
        List<StudyRelation> relations = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            StudyRelationRequest request = requests.get(i);
            Study target =
                    studyRepository
                            .findById(request.studyId())
                            .orElseThrow(
                                    () ->
                                            new EntityNotFoundException(
                                                    "Related study not found: "
                                                            + request.studyId()));
            if (source.getId() != null && source.getId().equals(target.getId())) {
                throw new IllegalArgumentException("A study cannot be related to itself.");
            }
            relations.add(StudyRelation.create(source, target, request.type(), i));
        }
        source.replaceRelations(relations);
    }

    private String uniqueSlug(String requested, String title, Long currentId) {
        String base = slugify(StringUtils.hasText(requested) ? requested : title);
        if (!StringUtils.hasText(base)) {
            base = "study";
        }
        String candidate = base;
        int suffix = 2;
        while (currentId == null
                ? studyRepository.existsBySlug(candidate)
                : studyRepository.existsBySlugAndIdNot(candidate, currentId)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private String uniqueTagSlug(String name) {
        String base = slugify(name);
        if (!StringUtils.hasText(base)) {
            base = "tag";
        }
        String candidate = base;
        int suffix = 2;
        while (tagRepository.existsBySlug(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private String slugify(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT)
                .trim()
                .replaceAll("[^\\p{L}\\p{N}]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    private LocalDateTime resolvePublishedAt(
            StudyStatus status, LocalDateTime requested, LocalDateTime existing) {
        if (status != StudyStatus.PUBLISHED) {
            return requested;
        }
        if (requested != null) {
            return requested;
        }
        return existing != null ? existing : LocalDateTime.now();
    }
}
