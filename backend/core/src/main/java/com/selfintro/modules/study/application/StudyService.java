package com.selfintro.modules.study.application;

import com.selfintro.global.config.RabbitMqConfig;
import com.selfintro.global.messaging.AfterCommitRabbitEventPublisher;
import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.entity.ExperienceDetail;
import com.selfintro.modules.experience.domain.repository.ExperienceDetailRepository;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.WorkspaceSkillRepository;
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
    private final WorkspaceSkillRepository workspaceSkillRepository;
    private final ExperienceRepository experienceRepository;
    private final ExperienceDetailRepository experienceDetailRepository;
    private final StorageService storageService;
    private final AfterCommitRabbitEventPublisher eventPublisher;
    private final PublicWorkspaceResolver publicWorkspaceResolver;

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
        Long workspaceId = publicWorkspaceResolver.requireDefaultPublicWorkspace().getId();
        return searchPublished(
                workspaceId,
                keyword,
                taxonomyNodeId,
                tags,
                skillIds,
                experienceIds,
                experienceDetailIds,
                section,
                page,
                size);
    }

    public StudyPageResponse searchPublished(
            Long workspaceId,
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
                workspaceId,
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
        return searchAdmin(
                publicWorkspaceResolver.requireDefaultPublicWorkspace().getId(),
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

    public StudyPageResponse searchAdmin(
            Long workspaceId,
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
                workspaceId,
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
            Long workspaceId,
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
                                        workspaceId,
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
        return findPublishedBySlug(
                publicWorkspaceResolver.requireDefaultPublicWorkspace().getId(), slug);
    }

    public StudyResponse findPublishedBySlug(Long workspaceId, String slug) {
        Study study =
                studyRepository
                        .findByWorkspaceIdAndSlug(workspaceId, slug)
                        .filter(value -> value.getStatus() == StudyStatus.PUBLISHED)
                        .orElseThrow(() -> new EntityNotFoundException("Study not found: " + slug));
        return toResponse(study);
    }

    public List<StudyResponse> getPublishedForPublication(Long workspaceId) {
        return studyRepository.findAllByWorkspaceIdOrderByTitleAsc(workspaceId).stream()
                .filter(study -> study.getStatus() == StudyStatus.PUBLISHED)
                .sorted(
                        java.util.Comparator.comparing(
                                        Study::getLearnedAt,
                                        java.util.Comparator.nullsLast(
                                                java.util.Comparator.reverseOrder()))
                                .thenComparing(Study::getId, java.util.Comparator.reverseOrder()))
                .map(this::toResponse)
                .toList();
    }

    public List<StudyResponse> getForPublication(
            Long workspaceId, List<Long> orderedIds, java.util.Set<Long> taxonomyIds) {
        List<Long> distinctIds = orderedIds.stream().distinct().toList();
        Map<Long, Study> selected =
                studyRepository.findAllByWorkspaceIdAndIdIn(workspaceId, distinctIds).stream()
                        .collect(java.util.stream.Collectors.toMap(Study::getId, study -> study));
        if (selected.size() != distinctIds.size()) {
            throw new IllegalArgumentException("다른 Workspace의 Study가 포함되어 있습니다.");
        }
        java.util.Set<Long> selectedIds = java.util.Set.copyOf(distinctIds);
        return distinctIds.stream()
                .map(selected::get)
                .map(this::toResponse)
                .map(response -> response.forPublication(selectedIds, taxonomyIds))
                .toList();
    }

    private StudyResponse toResponse(Study study) {
        return StudyResponse.from(study, storageService::toPublicUrl);
    }

    public List<StudyResponse.TagResponse> findTags() {
        return findTags(publicWorkspaceResolver.requireDefaultPublicWorkspace().getId());
    }

    public List<StudyResponse.TagResponse> findTags(Long workspaceId) {
        return tagRepository.findAllByWorkspaceIdOrderByNameAsc(workspaceId).stream()
                .map(StudyResponse.TagResponse::from)
                .toList();
    }

    public List<StudyTaxonomyResponse> findPublicTaxonomy() {
        return findPublicTaxonomy(publicWorkspaceResolver.requireDefaultPublicWorkspace().getId());
    }

    public List<StudyTaxonomyResponse> findPublicTaxonomy(Long workspaceId) {
        Map<Long, Long> totals = rolledUpPublishedCounts(workspaceId);
        return curationRepository.findAllByWorkspaceIdOrderByDisplayOrderAsc(workspaceId).stream()
                .map(
                        curation ->
                                StudyTaxonomyResponse.from(
                                        curation.getTaxonomyNode(),
                                        totals.getOrDefault(
                                                curation.getTaxonomyNode().getId(), 0L)))
                .toList();
    }

    @Transactional
    public List<TaxonomyNodeResponse> findCuration(Long workspaceId) {
        return curationRepository.findAllByWorkspaceIdOrderByDisplayOrderAsc(workspaceId).stream()
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
    public List<TaxonomyNodeResponse> replaceCuration(
            Long workspaceId, List<Long> taxonomyNodeIds) {
        curationRepository.deleteAllByWorkspaceId(workspaceId);
        if (taxonomyNodeIds == null || taxonomyNodeIds.isEmpty()) {
            return List.of();
        }
        List<StudyTaxonomyCuration> curations = new ArrayList<>();
        for (int i = 0; i < taxonomyNodeIds.size(); i++) {
            TaxonomyNode node = findTaxonomyNode(taxonomyNodeIds.get(i));
            curations.add(StudyTaxonomyCuration.create(workspaceId, node, i));
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
        return create(publicWorkspaceResolver.requireDefaultPublicWorkspace().getId(), request);
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
    public StudyResponse create(Long workspaceId, StudyRequest request) {
        String slug = uniqueSlug(workspaceId, request.slug(), request.title(), null);
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
        study.assignWorkspace(workspaceId);
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
        return update(publicWorkspaceResolver.requireDefaultPublicWorkspace().getId(), id, request);
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
    public StudyResponse update(Long workspaceId, Long id, StudyRequest request) {
        Study study =
                studyRepository
                        .findByIdAndWorkspaceId(id, workspaceId)
                        .orElseThrow(() -> new EntityNotFoundException("Study not found: " + id));
        String slug = uniqueSlug(workspaceId, request.slug(), request.title(), id);
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
        delete(publicWorkspaceResolver.requireDefaultPublicWorkspace().getId(), id);
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
    public void delete(Long workspaceId, Long id) {
        Study study =
                studyRepository
                        .findByIdAndWorkspaceId(id, workspaceId)
                        .orElseThrow(() -> new EntityNotFoundException("Study not found: " + id));
        List<String> objectKeys = study.getImages().stream().map(StudyImage::getObjectKey).toList();
        studyRepository.delete(study);
        storageService.deleteAll(objectKeys);
        publishVectorDeleteEvent(workspaceId, id);
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
        return batchPublish(publicWorkspaceResolver.requireDefaultPublicWorkspace().getId(), ids);
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
    public List<StudyResponse> batchPublish(Long workspaceId, List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<Study> studies = requireWorkspaceStudies(workspaceId, ids);
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
        return batchUnpublish(publicWorkspaceResolver.requireDefaultPublicWorkspace().getId(), ids);
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
    public List<StudyResponse> batchUnpublish(Long workspaceId, List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<Study> studies = requireWorkspaceStudies(workspaceId, ids);
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
        return toggleStatus(publicWorkspaceResolver.requireDefaultPublicWorkspace().getId(), id);
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
    public StudyResponse toggleStatus(Long workspaceId, Long id) {
        Study study =
                studyRepository
                        .findByIdAndWorkspaceId(id, workspaceId)
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

    private List<Study> requireWorkspaceStudies(Long workspaceId, List<Long> ids) {
        Set<Long> distinctIds = new LinkedHashSet<>(ids);
        List<Study> studies = studyRepository.findAllByWorkspaceIdAndIdIn(workspaceId, distinctIds);
        if (studies.size() != distinctIds.size()) {
            throw new EntityNotFoundException("Study not found in workspace");
        }
        return studies;
    }

    private void publishVectorSyncEvent(Study saved) {
        eventPublisher.publish(
                RabbitMqConfig.EXCHANGE_NAME,
                RabbitMqConfig.ROUTING_KEY_STUDY_UPDATED,
                new StudyUpdatedEvent(
                        saved.getWorkspaceId(),
                        saved.getId(),
                        saved.getTitle(),
                        saved.getContentMarkdown()));
    }

    private void publishVectorDeleteEvent(Long workspaceId, Long studyId) {
        eventPublisher.publish(
                RabbitMqConfig.EXCHANGE_NAME,
                RabbitMqConfig.ROUTING_KEY_STUDY_UPDATED,
                StudyUpdatedEvent.deleted(workspaceId, studyId));
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
    private Map<Long, Long> rolledUpPublishedCounts(Long workspaceId) {
        List<TaxonomyNode> all = taxonomyNodeRepository.findAll();
        Map<Long, Long> direct =
                studyRepository
                        .countByTaxonomyNodeAndStatus(workspaceId, StudyStatus.PUBLISHED)
                        .stream()
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
        Long workspaceId = study.getWorkspaceId();
        Set<Long> taxonomyIds = ids(request.taxonomyNodeIds());
        List<TaxonomyNode> taxonomyNodes = taxonomyNodeRepository.findAllById(taxonomyIds);
        requireExactSelection("Taxonomy node", taxonomyIds, taxonomyNodes.size());
        study.replaceTaxonomyNodes(taxonomyNodes);
        study.replaceTags(resolveTags(workspaceId, request.tagNames()));

        Set<Long> skillIds = ids(request.skillIds());
        List<Skill> skills =
                workspaceSkillRepository
                        .findAllByWorkspaceIdAndSkill_IdIn(workspaceId, skillIds)
                        .stream()
                        .map(workspaceSkill -> workspaceSkill.getSkill())
                        .toList();
        requireExactSelection("Workspace skill", skillIds, skills.size());

        Set<Long> experienceIds = ids(request.experienceIds());
        List<Experience> experiences =
                experienceRepository.findAllByWorkspaceIdAndIdIn(workspaceId, experienceIds);
        requireExactSelection("Experience", experienceIds, experiences.size());

        Set<Long> detailIds = ids(request.experienceDetailIds());
        List<ExperienceDetail> experienceDetails =
                experienceDetailRepository.findAllByExperience_WorkspaceIdAndIdIn(
                        workspaceId, detailIds);
        requireExactSelection("Experience detail", detailIds, experienceDetails.size());
        study.replaceSkills(skills);
        study.replaceExperiences(experiences);
        study.replaceExperienceDetails(experienceDetails);

        List<StudyImage.Draft> imageDrafts = toImageDrafts(request.images());
        imageDrafts.stream()
                .filter(draft -> draft.id() == null)
                .forEach(
                        draft ->
                                storageService.requireOwnedObjectKey(
                                        workspaceId, draft.objectKey()));
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

    private List<Tag> resolveTags(Long workspaceId, List<String> tagNames) {
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
                            .findByWorkspaceIdAndNameIgnoreCase(workspaceId, name)
                            .orElseGet(
                                    () ->
                                            tagRepository.save(
                                                    Tag.create(
                                                            workspaceId,
                                                            name,
                                                            uniqueTagSlug(workspaceId, name)))));
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
                            .findByIdAndWorkspaceId(request.studyId(), source.getWorkspaceId())
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

    private String uniqueSlug(Long workspaceId, String requested, String title, Long currentId) {
        String base = slugify(StringUtils.hasText(requested) ? requested : title);
        if (!StringUtils.hasText(base)) {
            base = "study";
        }
        String candidate = base;
        int suffix = 2;
        while (currentId == null
                ? studyRepository.existsByWorkspaceIdAndSlug(workspaceId, candidate)
                : studyRepository.existsByWorkspaceIdAndSlugAndIdNot(
                        workspaceId, candidate, currentId)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private String uniqueTagSlug(Long workspaceId, String name) {
        String base = slugify(name);
        if (!StringUtils.hasText(base)) {
            base = "tag";
        }
        String candidate = base;
        int suffix = 2;
        while (tagRepository.existsByWorkspaceIdAndSlug(workspaceId, candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private Set<Long> ids(List<Long> values) {
        return values == null ? Set.of() : new LinkedHashSet<>(values);
    }

    private void requireExactSelection(String label, Set<Long> ids, int foundCount) {
        if (ids.size() != foundCount) {
            throw new EntityNotFoundException(label + " not found in workspace");
        }
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
