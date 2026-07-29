package com.selfintro.modules.learningresource.application;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceCategory;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceRelation;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.learningresource.domain.repository.LearningResourceCategoryRepository;
import com.selfintro.modules.learningresource.domain.repository.LearningResourceRepository;
import com.selfintro.modules.learningresource.domain.repository.LearningResourceSearchCondition;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceGraphResponse;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourcePageResponse;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceRelationRequest;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceRequest;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceResponse;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import com.selfintro.modules.study.domain.entity.Tag;
import com.selfintro.modules.study.domain.repository.TagRepository;
import jakarta.persistence.EntityNotFoundException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
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
public class LearningResourceService {

    private final LearningResourceRepository learningResourceRepository;
    private final LearningResourceCategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final SkillRepository skillRepository;

    public LearningResourcePageResponse searchAdmin(
            String keyword,
            String category,
            List<String> tags,
            List<Long> skillIds,
            LearningResourceType resourceType,
            LearningResourceStatus status,
            LearningResourcePriorityTier priorityTier,
            int page,
            int size) {
        int safeSize = Math.min(Math.max(size, 1), 200);
        Page<LearningResourceResponse> result =
                learningResourceRepository
                        .search(
                                new LearningResourceSearchCondition(
                                        keyword,
                                        category,
                                        tags,
                                        skillIds,
                                        resourceType,
                                        status,
                                        priorityTier),
                                PageRequest.of(Math.max(page, 0), safeSize))
                        .map(LearningResourceResponse::from);
        return LearningResourcePageResponse.from(result);
    }

    public LearningResourceGraphResponse findGraph() {
        List<LearningResource> resources = learningResourceRepository.findAll();
        List<LearningResourceGraphResponse.NodeResponse> nodes =
                resources.stream().map(LearningResourceGraphResponse.NodeResponse::from).toList();
        List<LearningResourceGraphResponse.EdgeResponse> edges =
                resources.stream()
                        .flatMap(resource -> resource.getRelations().stream())
                        .map(LearningResourceGraphResponse.EdgeResponse::from)
                        .toList();
        return new LearningResourceGraphResponse(nodes, edges);
    }

    public List<LearningResourceResponse.CategoryResponse> findCategories() {
        return categoryRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(LearningResourceResponse.CategoryResponse::from)
                .toList();
    }

    @Transactional
    @CacheEvict(value = "bff:learning", allEntries = true)
    public LearningResourceResponse create(LearningResourceRequest request) {
        LearningResourceCategory category = findCategory(request.categoryId());
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
                        category,
                        blankToNull(request.summary()),
                        request.detailMarkdown());

        applyAssociations(resource, request);
        LearningResource saved = learningResourceRepository.save(resource);
        applyRelations(saved, request.relatedResources());
        return LearningResourceResponse.from(saved);
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
        LearningResourceCategory category = findCategory(request.categoryId());
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
                category,
                blankToNull(request.summary()),
                request.detailMarkdown());
        applyAssociations(resource, request);
        applyRelations(resource, request.relatedResources());
        return LearningResourceResponse.from(resource);
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
        return LearningResourceResponse.from(resource);
    }

    private LearningResourceCategory findCategory(Long id) {
        return categoryRepository
                .findById(id)
                .orElseThrow(
                        () ->
                                new EntityNotFoundException(
                                        "Learning resource category not found: " + id));
    }

    private void applyAssociations(LearningResource resource, LearningResourceRequest request) {
        resource.replaceTags(resolveTags(request.tagNames()));
        List<Skill> skills =
                request.skillIds() == null
                        ? List.of()
                        : skillRepository.findAllById(request.skillIds());
        resource.replaceSkills(skills);
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

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
