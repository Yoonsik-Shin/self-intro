package com.selfintro.modules.learningresource.application;

import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceRelation;
import com.selfintro.modules.learningresource.domain.entity.WorkspaceLearningResource;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.learningresource.domain.repository.LearningResourceRepository;
import com.selfintro.modules.learningresource.domain.repository.WorkspaceLearningResourceRepository;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceCatalogResponse;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceGraphResponse;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourcePageResponse;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceRelationRequest;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceRequest;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceResponse;
import com.selfintro.modules.learningresource.presentation.dto.WorkspaceLearningResourceRequest;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import com.selfintro.modules.study.domain.entity.Tag;
import com.selfintro.modules.study.domain.repository.TagRepository;
import com.selfintro.modules.taxonomy.domain.entity.TaxonomyNode;
import com.selfintro.modules.taxonomy.domain.repository.TaxonomyNodeRepository;
import jakarta.persistence.EntityNotFoundException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearningResourceService {

    private final LearningResourceRepository learningResourceRepository;
    private final WorkspaceLearningResourceRepository workspaceLearningResourceRepository;
    private final TaxonomyNodeRepository taxonomyNodeRepository;
    private final TagRepository tagRepository;
    private final SkillRepository skillRepository;
    private final PublicWorkspaceResolver publicWorkspaceResolver;

    public LearningResourcePageResponse searchAdmin(
            String keyword,
            Long taxonomyNodeId,
            List<String> tags,
            List<Long> skillIds,
            LearningResourceType resourceType,
            LearningResourceStatus status,
            LearningResourcePriorityTier priorityTier,
            int page,
            int size) {
        return searchWorkspace(
                publicWorkspaceResolver.requireDefaultPublicWorkspace().getId(),
                keyword,
                taxonomyNodeId,
                tags,
                skillIds,
                resourceType,
                status,
                priorityTier,
                page,
                size);
    }

    public LearningResourceResponse get(Long id) {
        return getWorkspace(publicWorkspaceResolver.requireDefaultPublicWorkspace().getId(), id);
    }

    public LearningResourceGraphResponse findGraph() {
        return findWorkspaceGraph(publicWorkspaceResolver.requireDefaultPublicWorkspace().getId());
    }

    public LearningResourcePageResponse searchWorkspace(
            Long workspaceId,
            String keyword,
            Long taxonomyNodeId,
            List<String> tags,
            List<Long> skillIds,
            LearningResourceType resourceType,
            LearningResourceStatus status,
            LearningResourcePriorityTier priorityTier,
            int page,
            int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 1000);
        Set<Long> taxonomyNodeIds =
                taxonomyNodeId == null ? Set.of() : resolveWithDescendants(taxonomyNodeId);
        List<WorkspaceLearningResource> filtered =
                workspaceLearningResourceRepository
                        .findAllByWorkspaceIdOrderByDisplayOrderAscIdDesc(workspaceId)
                        .stream()
                        .filter(
                                overlay ->
                                        matches(
                                                overlay,
                                                keyword,
                                                taxonomyNodeIds,
                                                tags,
                                                skillIds,
                                                resourceType,
                                                status,
                                                priorityTier))
                        .toList();
        int start = Math.min(safePage * safeSize, filtered.size());
        int end = Math.min(start + safeSize, filtered.size());
        Page<LearningResourceResponse> result =
                new PageImpl<>(
                        filtered.subList(start, end).stream()
                                .map(
                                        overlay ->
                                                LearningResourceResponse.from(
                                                        overlay.getLearningResource(), overlay))
                                .toList(),
                        PageRequest.of(safePage, safeSize),
                        filtered.size());
        return LearningResourcePageResponse.from(result);
    }

    public LearningResourceResponse getWorkspace(Long workspaceId, Long resourceId) {
        WorkspaceLearningResource overlay = findWorkspaceOverlay(workspaceId, resourceId);
        return LearningResourceResponse.from(overlay.getLearningResource(), overlay);
    }

    public List<LearningResourceCatalogResponse> listCatalog(Long workspaceId, String keyword) {
        Set<Long> savedIds =
                workspaceLearningResourceRepository
                        .findAllByWorkspaceIdOrderByDisplayOrderAscIdDesc(workspaceId)
                        .stream()
                        .map(overlay -> overlay.getLearningResource().getId())
                        .collect(Collectors.toSet());
        String normalizedKeyword =
                StringUtils.hasText(keyword) ? keyword.trim().toLowerCase(Locale.ROOT) : null;
        return learningResourceRepository.findAll().stream()
                .filter(
                        resource ->
                                normalizedKeyword == null
                                        || contains(resource.getTitle(), normalizedKeyword)
                                        || contains(resource.getProvider(), normalizedKeyword)
                                        || contains(
                                                resource.getInstructorOrAuthor(), normalizedKeyword)
                                        || resource.getSkills().stream()
                                                .anyMatch(
                                                        skill ->
                                                                contains(
                                                                        skill.getName(),
                                                                        normalizedKeyword)))
                .sorted(
                        Comparator.comparing(LearningResource::getTitle)
                                .thenComparing(LearningResource::getId))
                .map(
                        resource ->
                                LearningResourceCatalogResponse.from(
                                        resource, savedIds.contains(resource.getId())))
                .toList();
    }

    public LearningResourceGraphResponse findWorkspaceGraph(Long workspaceId) {
        List<WorkspaceLearningResource> overlays =
                workspaceLearningResourceRepository
                        .findAllByWorkspaceIdOrderByDisplayOrderAscIdDesc(workspaceId);
        List<LearningResourceGraphResponse.NodeResponse> nodes =
                overlays.stream().map(LearningResourceGraphResponse.NodeResponse::from).toList();
        Set<Long> visibleResourceIds =
                overlays.stream()
                        .map(overlay -> overlay.getLearningResource().getId())
                        .collect(Collectors.toSet());
        List<LearningResourceGraphResponse.EdgeResponse> edges =
                overlays.stream()
                        .flatMap(overlay -> overlay.getLearningResource().getRelations().stream())
                        .filter(
                                relation ->
                                        visibleResourceIds.contains(relation.getTarget().getId()))
                        .map(LearningResourceGraphResponse.EdgeResponse::from)
                        .toList();
        return new LearningResourceGraphResponse(nodes, edges);
    }

    @Transactional
    @CacheEvict(value = "bff:learning", allEntries = true)
    public LearningResourceResponse create(LearningResourceRequest request) {
        String slug = uniqueSlug(request.slug(), request.title(), null);
        LearningResource resource =
                LearningResource.create(
                        slug,
                        request.title().trim(),
                        request.resourceType(),
                        blankToNull(request.provider()),
                        blankToNull(request.url()),
                        blankToNull(request.instructorOrAuthor()),
                        request.durationMinutes(),
                        request.status(),
                        request.priorityTier(),
                        request.displayOrder(),
                        blankToNull(request.summary()),
                        request.detailMarkdown());

        applyAssociations(resource, request);
        LearningResource saved = learningResourceRepository.save(resource);
        applyRelations(saved, request.relatedResources());
        WorkspaceLearningResource overlay =
                createOverlay(
                        publicWorkspaceResolver.requireDefaultPublicWorkspace().getId(),
                        saved,
                        request.status(),
                        request.priorityTier(),
                        request.displayOrder(),
                        request.summary(),
                        request.detailMarkdown(),
                        request.tagNames());
        return LearningResourceResponse.from(saved, overlay);
    }

    @Transactional
    @CacheEvict(value = "bff:learning", allEntries = true)
    public LearningResourceResponse update(Long id, LearningResourceRequest request) {
        LearningResource resource =
                learningResourceRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "Learning resource not found: " + id));
        String slug = uniqueSlug(request.slug(), request.title(), id);

        resource.update(
                slug,
                request.title().trim(),
                request.resourceType(),
                blankToNull(request.provider()),
                blankToNull(request.url()),
                blankToNull(request.instructorOrAuthor()),
                request.durationMinutes(),
                request.status(),
                request.priorityTier(),
                request.displayOrder(),
                blankToNull(request.summary()),
                request.detailMarkdown());
        applyAssociations(resource, request);
        applyRelations(resource, request.relatedResources());
        WorkspaceLearningResource overlay =
                upsertOverlay(
                        publicWorkspaceResolver.requireDefaultPublicWorkspace().getId(),
                        resource,
                        request.status(),
                        request.priorityTier(),
                        request.displayOrder(),
                        request.summary(),
                        request.detailMarkdown(),
                        request.tagNames());
        return LearningResourceResponse.from(resource, overlay);
    }

    @Transactional
    @CacheEvict(value = "bff:learning", allEntries = true)
    public void delete(Long id) {
        LearningResource resource =
                learningResourceRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "Learning resource not found: " + id));
        workspaceLearningResourceRepository.deleteAllByLearningResourceId(id);
        learningResourceRepository.delete(resource);
    }

    @Transactional
    @CacheEvict(value = "bff:learning", allEntries = true)
    public LearningResourceResponse updateStatus(Long id, LearningResourceStatus status) {
        LearningResource resource =
                learningResourceRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "Learning resource not found: " + id));
        resource.updateStatus(status);
        Long workspaceId = publicWorkspaceResolver.requireDefaultPublicWorkspace().getId();
        WorkspaceLearningResource overlay = findWorkspaceOverlay(workspaceId, id);
        overlay.updateStatus(status);
        return LearningResourceResponse.from(resource, overlay);
    }

    @Transactional
    @CacheEvict(value = "bff:learning", allEntries = true)
    public LearningResourceResponse addToWorkspace(
            Long workspaceId, Long resourceId, WorkspaceLearningResourceRequest request) {
        if (workspaceLearningResourceRepository.existsByWorkspaceIdAndLearningResourceId(
                workspaceId, resourceId)) {
            throw new IllegalArgumentException("Learning resource is already saved in Workspace.");
        }
        LearningResource resource = findResource(resourceId);
        WorkspaceLearningResource overlay =
                createOverlay(
                        workspaceId,
                        resource,
                        request.status(),
                        request.priorityTier(),
                        request.displayOrder(),
                        request.summary(),
                        request.detailMarkdown(),
                        request.tagNames());
        return LearningResourceResponse.from(resource, overlay);
    }

    @Transactional
    @CacheEvict(value = "bff:learning", allEntries = true)
    public LearningResourceResponse updateWorkspace(
            Long workspaceId, Long resourceId, WorkspaceLearningResourceRequest request) {
        WorkspaceLearningResource overlay = findWorkspaceOverlay(workspaceId, resourceId);
        overlay.update(
                request.status(),
                request.priorityTier(),
                request.displayOrder(),
                blankToNull(request.summary()),
                request.detailMarkdown());
        overlay.replaceTags(resolveTags(workspaceId, request.tagNames()));
        return LearningResourceResponse.from(overlay.getLearningResource(), overlay);
    }

    @Transactional
    @CacheEvict(value = "bff:learning", allEntries = true)
    public LearningResourceResponse updateWorkspaceStatus(
            Long workspaceId, Long resourceId, LearningResourceStatus status) {
        WorkspaceLearningResource overlay = findWorkspaceOverlay(workspaceId, resourceId);
        overlay.updateStatus(status);
        return LearningResourceResponse.from(overlay.getLearningResource(), overlay);
    }

    @Transactional
    @CacheEvict(value = "bff:learning", allEntries = true)
    public void removeFromWorkspace(Long workspaceId, Long resourceId) {
        workspaceLearningResourceRepository.delete(findWorkspaceOverlay(workspaceId, resourceId));
    }

    private WorkspaceLearningResource createOverlay(
            Long workspaceId,
            LearningResource resource,
            LearningResourceStatus status,
            LearningResourcePriorityTier priorityTier,
            int displayOrder,
            String summary,
            String detailMarkdown,
            List<String> tagNames) {
        WorkspaceLearningResource overlay =
                WorkspaceLearningResource.create(
                        workspaceId,
                        resource,
                        status,
                        priorityTier,
                        displayOrder,
                        blankToNull(summary),
                        detailMarkdown);
        overlay.replaceTags(resolveTags(workspaceId, tagNames));
        return workspaceLearningResourceRepository.save(overlay);
    }

    private WorkspaceLearningResource upsertOverlay(
            Long workspaceId,
            LearningResource resource,
            LearningResourceStatus status,
            LearningResourcePriorityTier priorityTier,
            int displayOrder,
            String summary,
            String detailMarkdown,
            List<String> tagNames) {
        return workspaceLearningResourceRepository
                .findByWorkspaceIdAndLearningResourceId(workspaceId, resource.getId())
                .map(
                        overlay -> {
                            overlay.update(
                                    status,
                                    priorityTier,
                                    displayOrder,
                                    blankToNull(summary),
                                    detailMarkdown);
                            overlay.replaceTags(resolveTags(workspaceId, tagNames));
                            return overlay;
                        })
                .orElseGet(
                        () ->
                                createOverlay(
                                        workspaceId,
                                        resource,
                                        status,
                                        priorityTier,
                                        displayOrder,
                                        summary,
                                        detailMarkdown,
                                        tagNames));
    }

    private WorkspaceLearningResource findWorkspaceOverlay(Long workspaceId, Long resourceId) {
        return workspaceLearningResourceRepository
                .findByWorkspaceIdAndLearningResourceId(workspaceId, resourceId)
                .orElseThrow(
                        () ->
                                new EntityNotFoundException(
                                        "Workspace learning resource not found: " + resourceId));
    }

    private LearningResource findResource(Long resourceId) {
        return learningResourceRepository
                .findById(resourceId)
                .orElseThrow(
                        () ->
                                new EntityNotFoundException(
                                        "Learning resource not found: " + resourceId));
    }

    private boolean matches(
            WorkspaceLearningResource overlay,
            String keyword,
            Set<Long> taxonomyNodeIds,
            List<String> tags,
            List<Long> skillIds,
            LearningResourceType resourceType,
            LearningResourceStatus status,
            LearningResourcePriorityTier priorityTier) {
        LearningResource resource = overlay.getLearningResource();
        if (resourceType != null && resource.getResourceType() != resourceType) {
            return false;
        }
        if (status != null && overlay.getStatus() != status) {
            return false;
        }
        if (priorityTier != null && overlay.getPriorityTier() != priorityTier) {
            return false;
        }
        if (!taxonomyNodeIds.isEmpty()
                && resource.getTaxonomyNodes().stream()
                        .noneMatch(node -> taxonomyNodeIds.contains(node.getId()))) {
            return false;
        }
        if (tags != null
                && !tags.isEmpty()
                && overlay.getTags().stream().noneMatch(tag -> tags.contains(tag.getSlug()))) {
            return false;
        }
        if (skillIds != null
                && !skillIds.isEmpty()
                && resource.getSkills().stream()
                        .noneMatch(skill -> skillIds.contains(skill.getId()))) {
            return false;
        }
        if (!StringUtils.hasText(keyword)) {
            return true;
        }
        String value = keyword.trim().toLowerCase(Locale.ROOT);
        return contains(resource.getTitle(), value)
                || contains(resource.getProvider(), value)
                || contains(resource.getInstructorOrAuthor(), value)
                || contains(overlay.getPersonalSummary(), value)
                || contains(overlay.getPersonalNoteMarkdown(), value)
                || overlay.getTags().stream().anyMatch(tag -> contains(tag.getName(), value))
                || resource.getSkills().stream()
                        .anyMatch(skill -> contains(skill.getName(), value));
    }

    private boolean contains(String source, String lowerCaseNeedle) {
        return source != null && source.toLowerCase(Locale.ROOT).contains(lowerCaseNeedle);
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

    private void applyAssociations(LearningResource resource, LearningResourceRequest request) {
        resource.replaceTaxonomyNodes(
                request.taxonomyNodeIds() == null
                        ? List.of()
                        : taxonomyNodeRepository.findAllById(request.taxonomyNodeIds()));
        resource.replaceTags(
                resolveTags(
                        publicWorkspaceResolver.requireDefaultPublicWorkspace().getId(),
                        request.tagNames()));
        List<Skill> skills =
                request.skillIds() == null
                        ? List.of()
                        : skillRepository.findAllById(request.skillIds());
        resource.replaceSkills(skills);
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

    private void applyRelations(
            LearningResource source, List<LearningResourceRelationRequest> requests) {
        if (requests == null) {
            source.replaceRelations(List.of());
            return;
        }
        List<LearningResourceRelation> relations = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            LearningResourceRelationRequest request = requests.get(i);
            LearningResource target =
                    learningResourceRepository
                            .findById(request.resourceId())
                            .orElseThrow(
                                    () ->
                                            new EntityNotFoundException(
                                                    "Related learning resource not found: "
                                                            + request.resourceId()));
            if (source.getId() != null && source.getId().equals(target.getId())) {
                throw new IllegalArgumentException(
                        "A learning resource cannot be related to itself.");
            }
            relations.add(LearningResourceRelation.create(source, target, request.type(), i));
        }
        source.replaceRelations(relations);
    }

    private String uniqueSlug(String requested, String title, Long currentId) {
        String base = slugify(StringUtils.hasText(requested) ? requested : title);
        if (!StringUtils.hasText(base)) {
            base = "learning-resource";
        }
        String candidate = base;
        int suffix = 2;
        while (currentId == null
                ? learningResourceRepository.existsBySlug(candidate)
                : learningResourceRepository.existsBySlugAndIdNot(candidate, currentId)) {
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

    private String slugify(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT)
                .trim()
                .replaceAll("[^\\p{L}\\p{N}]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
