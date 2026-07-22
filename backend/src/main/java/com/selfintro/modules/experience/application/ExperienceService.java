package com.selfintro.modules.experience.application;

import com.selfintro.modules.experience.domain.*;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceImageRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceResponse;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.modules.storage.application.StorageService;
import com.selfintro.study.entity.Tag;
import com.selfintro.study.repository.TagRepository;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.IntStream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExperienceService {

    private final ExperienceRepository experienceRepository;
    private final ProjectRepository projectRepository;
    private final SkillRepository skillRepository;
    private final TagRepository tagRepository;
    private final StorageService storageService;

    public List<Experience> getAllExperiences() {
        return experienceRepository.findAllByOrderByDisplayOrderAsc();
    }

    public ExperienceResponse toResponse(Experience experience) {
        return ExperienceResponse.from(experience, storageService::toPublicUrl);
    }

    @Transactional
    public ExperienceResponse create(ExperienceRequest request) {
        List<Skill> skills =
                request.skillIds() != null
                        ? skillRepository.findAllById(request.skillIds())
                        : List.of();

        List<ExperienceDetail.Draft> details = toDetailDrafts(request.details());

        Experience exp;
        switch (request.type().toUpperCase()) {
            case "CAREER" ->
                    exp =
                            Career.create(
                                    request.title(),
                                    request.periodStart(),
                                    request.periodEnd(),
                                    request.summary(),
                                    request.takeaway(),
                                    request.displayOrder(),
                                    details,
                                    skills,
                                    request.showOnTimeline(),
                                    request.timelineLabel(),
                                    request.companyName(),
                                    request.employmentType(),
                                    request.department(),
                                    request.role());
            case "PROJECT" ->
                    exp =
                            Project.create(
                                    request.title(),
                                    request.periodStart(),
                                    request.periodEnd(),
                                    request.summary(),
                                    request.takeaway(),
                                    request.displayOrder(),
                                    details,
                                    skills,
                                    request.showOnTimeline(),
                                    request.timelineLabel(),
                                    request.slug(),
                                    request.role(),
                                    request.contributionRate(),
                                    normalizeOptionalText(request.repositoryUrl()),
                                    resolveCareer(
                                            request.careerId(),
                                            request.periodStart(),
                                            request.periodEnd()));
            case "EDUCATION" ->
                    exp =
                            Education.create(
                                    request.title(),
                                    request.periodStart(),
                                    request.periodEnd(),
                                    request.summary(),
                                    request.takeaway(),
                                    request.displayOrder(),
                                    details,
                                    skills,
                                    request.showOnTimeline(),
                                    request.timelineLabel(),
                                    request.institutionName());
            case "CERTIFICATE" ->
                    exp =
                            Certificate.create(
                                    request.title(),
                                    request.periodStart(),
                                    request.periodEnd(),
                                    request.summary(),
                                    request.takeaway(),
                                    request.displayOrder(),
                                    details,
                                    skills,
                                    request.showOnTimeline(),
                                    request.timelineLabel(),
                                    request.issuer());
            default -> throw new IllegalArgumentException("지원하지 않는 이력서 서브타입입니다: " + request.type());
        }

        exp.reconcileImages(toImageDrafts(request.images()));
        Experience saved = experienceRepository.save(exp);
        saved.replaceTags(resolveTags(request.tagNames()));
        return toResponse(saved);
    }

    @Transactional
    public ExperienceResponse update(Long id, ExperienceRequest request) {
        Experience exp =
                experienceRepository
                        .findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이력서 항목입니다."));

        List<Skill> skills =
                request.skillIds() != null
                        ? skillRepository.findAllById(request.skillIds())
                        : List.of();

        List<ExperienceDetail.Draft> details = toDetailDrafts(request.details());

        if (exp instanceof Career career && "CAREER".equalsIgnoreCase(request.type())) {
            career.update(
                    request.title(),
                    request.periodStart(),
                    request.periodEnd(),
                    request.summary(),
                    request.takeaway(),
                    request.displayOrder(),
                    details,
                    skills,
                    request.showOnTimeline(),
                    request.timelineLabel(),
                    request.companyName(),
                    request.employmentType(),
                    request.department(),
                    request.role());
        } else if (exp instanceof Project project && "PROJECT".equalsIgnoreCase(request.type())) {
            project.update(
                    request.title(),
                    request.periodStart(),
                    request.periodEnd(),
                    request.summary(),
                    request.takeaway(),
                    request.displayOrder(),
                    details,
                    skills,
                    request.showOnTimeline(),
                    request.timelineLabel(),
                    request.slug(),
                    request.role(),
                    request.contributionRate(),
                    normalizeOptionalText(request.repositoryUrl()),
                    resolveCareer(request.careerId(), request.periodStart(), request.periodEnd()));
        } else if (exp instanceof Education edu && "EDUCATION".equalsIgnoreCase(request.type())) {
            edu.update(
                    request.title(),
                    request.periodStart(),
                    request.periodEnd(),
                    request.summary(),
                    request.takeaway(),
                    request.displayOrder(),
                    details,
                    skills,
                    request.showOnTimeline(),
                    request.timelineLabel(),
                    request.institutionName());
        } else if (exp instanceof Certificate cert
                && "CERTIFICATE".equalsIgnoreCase(request.type())) {
            cert.update(
                    request.title(),
                    request.periodStart(),
                    request.periodEnd(),
                    request.summary(),
                    request.takeaway(),
                    request.displayOrder(),
                    details,
                    skills,
                    request.showOnTimeline(),
                    request.timelineLabel(),
                    request.issuer());
        } else {
            // 서브타입이 달라지는 경우 기존 항목을 삭제하고 새로 생성 (이미지도 함께 정리)
            List<String> orphanedImageKeys =
                    exp.getImages().stream().map(ExperienceImage::getObjectKey).toList();
            experienceRepository.delete(exp);
            storageService.deleteAll(orphanedImageKeys);
            return create(request);
        }

        exp.replaceTags(resolveTags(request.tagNames()));

        List<ExperienceImage.Draft> imageDrafts = toImageDrafts(request.images());
        List<String> removedImageKeys = exp.imageObjectKeysNotIn(imageDrafts);
        exp.reconcileImages(imageDrafts);
        Experience saved = experienceRepository.save(exp);
        storageService.deleteAll(removedImageKeys);
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Experience exp =
                experienceRepository
                        .findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이력서 항목입니다."));
        if (exp instanceof Career && projectRepository.existsByCareerId(id)) {
            throw new IllegalArgumentException("연결된 직장 프로젝트를 먼저 다른 경력으로 옮기거나 삭제해주세요.");
        }
        List<String> objectKeys =
                exp.getImages().stream().map(ExperienceImage::getObjectKey).toList();
        experienceRepository.delete(exp);
        storageService.deleteAll(objectKeys);
    }

    private List<ExperienceImage.Draft> toImageDrafts(List<ExperienceImageRequest> imageRequests) {
        if (imageRequests == null) {
            return List.of();
        }
        return IntStream.range(0, imageRequests.size())
                .mapToObj(
                        i ->
                                new ExperienceImage.Draft(
                                        imageRequests.get(i).id(),
                                        imageRequests.get(i).objectKey(),
                                        i))
                .toList();
    }

    private String normalizeOptionalText(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private Career resolveCareer(
            Long careerId, java.time.LocalDate projectStart, java.time.LocalDate projectEnd) {
        if (careerId == null) {
            return null;
        }
        Experience experience =
                experienceRepository
                        .findById(careerId)
                        .orElseThrow(() -> new IllegalArgumentException("연결할 직장 경력을 찾을 수 없습니다."));
        if (!(experience instanceof Career career)) {
            throw new IllegalArgumentException("프로젝트는 직장 경력(CAREER)에만 연결할 수 있습니다.");
        }
        if (projectStart.isBefore(career.getPeriodStart())) {
            throw new IllegalArgumentException("직장 프로젝트 시작일은 연결된 경력 시작일보다 빠를 수 없습니다.");
        }
        if (career.getPeriodEnd() != null
                && (projectEnd == null || projectEnd.isAfter(career.getPeriodEnd()))) {
            throw new IllegalArgumentException("직장 프로젝트 종료일은 연결된 경력 기간 안에 있어야 합니다.");
        }
        if (projectEnd != null && projectEnd.isBefore(projectStart)) {
            throw new IllegalArgumentException("프로젝트 종료일은 시작일보다 빠를 수 없습니다.");
        }
        return career;
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

    private List<ExperienceDetail.Draft> toDetailDrafts(
            List<ExperienceDetailRequest> detailRequests) {
        if (detailRequests == null) {
            return List.of();
        }
        return IntStream.range(0, detailRequests.size())
                .mapToObj(
                        i -> {
                            ExperienceDetailRequest dr = detailRequests.get(i);
                            List<Skill> detailSkills =
                                    dr.skillIds() != null
                                            ? skillRepository.findAllById(dr.skillIds())
                                            : List.of();
                            return new ExperienceDetail.Draft(
                                    dr.id(),
                                    dr.content(),
                                    dr.situation(),
                                    dr.task(),
                                    dr.actionDetail(),
                                    dr.outcome(),
                                    dr.narrative(),
                                    i,
                                    detailSkills);
                        })
                .toList();
    }
}
