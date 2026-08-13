package com.selfintro.modules.experience.application;

import com.selfintro.global.ai.CareerProfileDigestBuilder;
import com.selfintro.global.config.RabbitMqConfig;
import com.selfintro.global.messaging.AfterCommitRabbitEventPublisher;
import com.selfintro.modules.experience.domain.entity.*;
import com.selfintro.modules.experience.domain.enums.*;
import com.selfintro.modules.experience.domain.repository.*;
import com.selfintro.modules.experience.event.ExperienceUpdatedEvent;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceImageRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceResponse;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.WorkspaceSkillRepository;
import com.selfintro.modules.storage.application.StorageService;
import com.selfintro.modules.study.domain.entity.Tag;
import com.selfintro.modules.study.domain.repository.TagRepository;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Hibernate;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExperienceService {

    private final ExperienceRepository experienceRepository;
    private final ProjectRepository projectRepository;
    private final WorkspaceSkillRepository workspaceSkillRepository;
    private final TagRepository tagRepository;
    private final StorageService storageService;
    private final CareerProfileDigestBuilder careerProfileDigestBuilder;
    private final AfterCommitRabbitEventPublisher eventPublisher;

    public List<Experience> getAllExperiences() {
        return experienceRepository.findAllByOrderByDisplayOrderAsc();
    }

    public List<Experience> getAllExperiences(Long workspaceId) {
        return experienceRepository.findAllByWorkspaceIdOrderByDisplayOrderAsc(workspaceId);
    }

    public List<ExperienceResponse> listAll() {
        return experienceRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ExperienceResponse> listAll(Long workspaceId) {
        return getAllExperiences(workspaceId).stream().map(this::toResponse).toList();
    }

    public List<ExperienceResponse> listPublic() {
        return listAll().stream().map(ExperienceResponse::forPublicWeb).toList();
    }

    public ExperienceResponse toResponse(Experience experience) {
        Experience concrete = (Experience) Hibernate.unproxy(experience);
        return ExperienceResponse.from(concrete, storageService::toPublicUrl);
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public ExperienceResponse toggleTimeline(Long workspaceId, Long id) {
        Experience experience =
                experienceRepository
                        .findByIdAndWorkspaceId(id, workspaceId)
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이력 항목입니다: " + id));
        experience.changeShowOnTimeline(!experience.isShowOnTimeline());
        experienceRepository.flush();
        return toResponse(experience);
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public List<ExperienceResponse> batchChangeTimeline(
            Long workspaceId, List<Long> ids, boolean showOnTimeline) {
        List<Experience> list = experienceRepository.findAllByWorkspaceIdAndIdIn(workspaceId, ids);
        if (list.size() != ids.stream().distinct().count()) {
            throw new IllegalArgumentException("다른 Workspace의 이력 항목이 포함되어 있습니다.");
        }
        for (Experience experience : list) {
            experience.changeShowOnTimeline(showOnTimeline);
        }
        experienceRepository.flush();
        return getAllExperiences(workspaceId).stream().map(this::toResponse).toList();
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public List<ExperienceResponse> reorder(Long workspaceId, List<Long> orderedIds) {
        List<Experience> list =
                experienceRepository.findAllByWorkspaceIdAndIdIn(workspaceId, orderedIds);
        Map<Long, Experience> map =
                list.stream().collect(Collectors.toMap(Experience::getId, Function.identity()));
        for (int i = 0; i < orderedIds.size(); i++) {
            Long id = orderedIds.get(i);
            Experience experience = map.get(id);
            if (experience == null) {
                throw new IllegalArgumentException("존재하지 않는 이력 항목입니다: " + id);
            }
            experience.changeDisplayOrder(i + 1);
        }
        experienceRepository.flush();
        return getAllExperiences(workspaceId).stream().map(this::toResponse).toList();
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public ExperienceResponse create(Long workspaceId, ExperienceRequest request) {
        List<Skill> skills = resolveWorkspaceSkills(workspaceId, request.skillIds());

        List<ExperienceDetail.Draft> details =
                toDetailDrafts(workspaceId, request.details(), Map.of());

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
                                    false,
                                    null,
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
                                    false,
                                    null,
                                    request.slug(),
                                    request.role(),
                                    request.contributionRate(),
                                    normalizeOptionalText(request.repositoryUrl()),
                                    resolveCareer(
                                            workspaceId,
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
                                    false,
                                    null,
                                    request.institutionName(),
                                    request.educationType(),
                                    request.degree(),
                                    request.major(),
                                    request.gpa(),
                                    request.graduationStatus());
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
                                    false,
                                    null,
                                    request.issuer());
            default -> throw new IllegalArgumentException("지원하지 않는 이력서 서브타입입니다: " + request.type());
        }

        exp.assignWorkspace(workspaceId);
        validateOwnedImageKeys(workspaceId, request.images());
        exp.reconcileImages(toImageDrafts(request.images()));
        Experience saved = experienceRepository.save(exp);
        saved.replaceTags(resolveTags(workspaceId, request.tagNames()));
        publishVectorSyncEvent(saved);
        return toResponse(saved);
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public ExperienceResponse update(Long workspaceId, Long id, ExperienceRequest request) {
        Experience exp =
                experienceRepository
                        .findByIdAndWorkspaceId(id, workspaceId)
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이력서 항목입니다."));

        List<Skill> skills = resolveWorkspaceSkills(workspaceId, request.skillIds());

        Map<Long, ExperienceDetail> existingDetails =
                exp.getDetails().stream()
                        .collect(Collectors.toMap(ExperienceDetail::getId, Function.identity()));
        List<ExperienceDetail.Draft> details =
                toDetailDrafts(workspaceId, request.details(), existingDetails);

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
                    exp.isShowOnTimeline(),
                    exp.getTimelineLabel(),
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
                    exp.isShowOnTimeline(),
                    exp.getTimelineLabel(),
                    request.slug(),
                    request.role(),
                    request.contributionRate(),
                    normalizeOptionalText(request.repositoryUrl()),
                    resolveCareer(
                            workspaceId,
                            request.careerId(),
                            request.periodStart(),
                            request.periodEnd()));
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
                    exp.isShowOnTimeline(),
                    exp.getTimelineLabel(),
                    request.institutionName(),
                    request.educationType(),
                    request.degree(),
                    request.major(),
                    request.gpa(),
                    request.graduationStatus());
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
                    exp.isShowOnTimeline(),
                    exp.getTimelineLabel(),
                    request.issuer());
        } else {
            // 서브타입이 달라지는 경우 기존 항목을 삭제하고 새로 생성 (이미지도 함께 정리)
            List<String> orphanedImageKeys =
                    exp.getImages().stream().map(ExperienceImage::getObjectKey).toList();
            experienceRepository.delete(exp);
            storageService.deleteAll(orphanedImageKeys);
            publishVectorDeleteEvent(workspaceId, id);
            return create(workspaceId, request);
        }

        exp.replaceTags(resolveTags(workspaceId, request.tagNames()));

        validateOwnedImageKeys(workspaceId, request.images());
        List<ExperienceImage.Draft> imageDrafts = toImageDrafts(request.images());
        List<String> removedImageKeys = exp.imageObjectKeysNotIn(imageDrafts);
        exp.reconcileImages(imageDrafts);
        Experience saved = experienceRepository.save(exp);
        storageService.deleteAll(removedImageKeys);
        publishVectorSyncEvent(saved);
        return toResponse(saved);
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public void delete(Long workspaceId, Long id) {
        Experience exp =
                experienceRepository
                        .findByIdAndWorkspaceId(id, workspaceId)
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이력서 항목입니다."));
        if (exp instanceof Career && projectRepository.existsByCareerId(id)) {
            throw new IllegalArgumentException("연결된 직장 프로젝트를 먼저 다른 경력으로 옮기거나 삭제해주세요.");
        }
        List<String> objectKeys =
                exp.getImages().stream().map(ExperienceImage::getObjectKey).toList();
        experienceRepository.delete(exp);
        storageService.deleteAll(objectKeys);
        publishVectorDeleteEvent(workspaceId, id);
    }

    private void publishVectorSyncEvent(Experience saved) {
        String content = careerProfileDigestBuilder.buildForExperience(saved);
        eventPublisher.publish(
                RabbitMqConfig.EXCHANGE_NAME,
                RabbitMqConfig.ROUTING_KEY_EXPERIENCE_UPDATED,
                new ExperienceUpdatedEvent(
                        saved.getWorkspaceId(), saved.getId(), saved.getTitle(), content));
    }

    private void publishVectorDeleteEvent(Long workspaceId, Long experienceId) {
        eventPublisher.publish(
                RabbitMqConfig.EXCHANGE_NAME,
                RabbitMqConfig.ROUTING_KEY_EXPERIENCE_UPDATED,
                ExperienceUpdatedEvent.deleted(workspaceId, experienceId));
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
            Long workspaceId,
            Long careerId,
            java.time.LocalDate projectStart,
            java.time.LocalDate projectEnd) {
        if (careerId == null) {
            return null;
        }
        Experience experience =
                experienceRepository
                        .findByIdAndWorkspaceId(careerId, workspaceId)
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

    private void validateOwnedImageKeys(
            Long workspaceId, List<ExperienceImageRequest> imageRequests) {
        if (imageRequests == null) {
            return;
        }
        imageRequests.stream()
                .filter(image -> image.id() == null)
                .forEach(
                        image ->
                                storageService.requireOwnedObjectKey(
                                        workspaceId, image.objectKey()));
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

    private List<ExperienceDetail.Draft> toDetailDrafts(
            Long workspaceId,
            List<ExperienceDetailRequest> detailRequests,
            Map<Long, ExperienceDetail> existingDetails) {
        if (detailRequests == null) {
            return List.of();
        }
        return IntStream.range(0, detailRequests.size())
                .mapToObj(
                        i -> {
                            ExperienceDetailRequest dr = detailRequests.get(i);
                            List<Skill> detailSkills =
                                    dr.skillIds() != null
                                            ? resolveWorkspaceSkills(workspaceId, dr.skillIds())
                                            : List.of();
                            ExperienceDetail existing =
                                    dr.id() == null ? null : existingDetails.get(dr.id());
                            boolean publicVisible = existing != null && existing.isPublicVisible();
                            boolean resumeAvailable =
                                    existing != null && existing.isResumeAvailable();
                            return new ExperienceDetail.Draft(
                                    dr.id(),
                                    dr.content(),
                                    dr.situation(),
                                    dr.task(),
                                    dr.actionDetail(),
                                    dr.outcome(),
                                    dr.narrative(),
                                    publicVisible,
                                    resumeAvailable,
                                    i,
                                    detailSkills);
                        })
                .toList();
    }

    private List<Skill> resolveWorkspaceSkills(Long workspaceId, List<Long> requestedIds) {
        Set<Long> ids = requestedIds == null ? Set.of() : new LinkedHashSet<>(requestedIds);
        List<Skill> skills =
                workspaceSkillRepository
                        .findAllByWorkspaceIdAndSkill_IdIn(workspaceId, ids)
                        .stream()
                        .map(workspaceSkill -> workspaceSkill.getSkill())
                        .toList();
        if (skills.size() != ids.size()) {
            throw new IllegalArgumentException("다른 Workspace의 기술 스택이 포함되어 있습니다.");
        }
        return skills;
    }
}
