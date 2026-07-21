package com.selfintro.study.service;

import com.selfintro.modules.experience.domain.Experience;
import com.selfintro.modules.experience.domain.ExperienceDetail;
import com.selfintro.modules.experience.domain.ExperienceDetailRepository;
import com.selfintro.modules.experience.domain.ExperienceRepository;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.modules.storage.application.StorageService;
import com.selfintro.study.dto.StudyImageRequest;
import com.selfintro.study.dto.StudyPageResponse;
import com.selfintro.study.dto.StudyRelationRequest;
import com.selfintro.study.dto.StudyRequest;
import com.selfintro.study.dto.StudyResponse;
import com.selfintro.study.entity.Study;
import com.selfintro.study.entity.StudyCategory;
import com.selfintro.study.entity.StudyImage;
import com.selfintro.study.entity.StudyRelation;
import com.selfintro.study.entity.StudyStatus;
import com.selfintro.study.entity.Tag;
import com.selfintro.study.repository.StudyCategoryRepository;
import com.selfintro.study.repository.StudyRepository;
import com.selfintro.study.repository.StudySearchCondition;
import com.selfintro.study.repository.TagRepository;
import jakarta.persistence.EntityNotFoundException;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.IntStream;
import lombok.RequiredArgsConstructor;
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
    private final StudyCategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final SkillRepository skillRepository;
    private final ExperienceRepository experienceRepository;
    private final ExperienceDetailRepository experienceDetailRepository;
    private final StorageService storageService;

    public StudyPageResponse searchPublished(
            String keyword,
            String category,
            List<String> tags,
            List<Long> skillIds,
            List<Long> experienceIds,
            List<Long> experienceDetailIds,
            int page,
            int size) {
        return search(
                keyword,
                category,
                tags,
                skillIds,
                experienceIds,
                experienceDetailIds,
                StudyStatus.PUBLISHED,
                page,
                size);
    }

    public StudyPageResponse searchAdmin(
            String keyword,
            String category,
            List<String> tags,
            List<Long> skillIds,
            List<Long> experienceIds,
            List<Long> experienceDetailIds,
            StudyStatus status,
            int page,
            int size) {
        return search(
                keyword,
                category,
                tags,
                skillIds,
                experienceIds,
                experienceDetailIds,
                status,
                page,
                size);
    }

    private StudyPageResponse search(
            String keyword,
            String category,
            List<String> tags,
            List<Long> skillIds,
            List<Long> experienceIds,
            List<Long> experienceDetailIds,
            StudyStatus status,
            int page,
            int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<StudyResponse> result =
                studyRepository
                        .search(
                                new StudySearchCondition(
                                        keyword,
                                        category,
                                        tags,
                                        skillIds,
                                        experienceIds,
                                        experienceDetailIds,
                                        status),
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

    public List<StudyResponse.CategoryResponse> findCategories() {
        return categoryRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(StudyResponse.CategoryResponse::from)
                .toList();
    }

    public List<StudyResponse.TagResponse> findTags() {
        return tagRepository.findAllByOrderByNameAsc().stream()
                .map(StudyResponse.TagResponse::from)
                .toList();
    }

    @Transactional
    public StudyResponse create(StudyRequest request) {
        StudyCategory category = findCategory(request.categoryId());
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
                        category,
                        request.learnedAt(),
                        publishedAt);

        List<String> removedImageKeys = applyAssociations(study, request);
        Study saved = studyRepository.save(study);
        applyRelations(saved, request.relatedStudies());
        storageService.deleteAll(removedImageKeys);
        return toResponse(saved);
    }

    @Transactional
    public StudyResponse update(Long id, StudyRequest request) {
        Study study =
                studyRepository
                        .findById(id)
                        .orElseThrow(() -> new EntityNotFoundException("Study not found: " + id));
        StudyCategory category = findCategory(request.categoryId());
        String slug = uniqueSlug(request.slug(), request.title(), id);
        LocalDateTime publishedAt =
                resolvePublishedAt(request.status(), request.publishedAt(), study.getPublishedAt());

        study.update(
                slug,
                request.title().trim(),
                request.summary().trim(),
                request.contentMarkdown(),
                request.status(),
                category,
                request.learnedAt(),
                publishedAt);
        List<String> removedImageKeys = applyAssociations(study, request);
        applyRelations(study, request.relatedStudies());
        storageService.deleteAll(removedImageKeys);
        return toResponse(study);
    }

    @Transactional
    public void delete(Long id) {
        Study study =
                studyRepository
                        .findById(id)
                        .orElseThrow(() -> new EntityNotFoundException("Study not found: " + id));
        List<String> objectKeys = study.getImages().stream().map(StudyImage::getObjectKey).toList();
        studyRepository.delete(study);
        storageService.deleteAll(objectKeys);
    }

    private StudyCategory findCategory(Long id) {
        return categoryRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Study category not found: " + id));
    }

    private List<String> applyAssociations(Study study, StudyRequest request) {
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
