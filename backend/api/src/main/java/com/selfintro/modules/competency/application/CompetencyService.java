package com.selfintro.modules.competency.application;

import com.selfintro.modules.competency.domain.entity.Competency;
import com.selfintro.modules.competency.domain.repository.CompetencyRepository;
import com.selfintro.modules.competency.presentation.dto.CompetencyRequest;
import com.selfintro.modules.competency.presentation.dto.CompetencyResponse;
import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.entity.WorkspaceSkill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import com.selfintro.modules.skill.domain.repository.WorkspaceSkillRepository;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.entity.Tag;
import com.selfintro.modules.study.domain.repository.StudyRepository;
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
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompetencyService {

    private final CompetencyRepository competencyRepository;
    private final SkillRepository skillRepository;
    private final WorkspaceSkillRepository workspaceSkillRepository;
    private final ExperienceRepository experienceRepository;
    private final StudyRepository studyRepository;
    private final TagRepository tagRepository;

    public List<CompetencyResponse> getAll() {
        return competencyRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(competency -> CompetencyResponse.from(competency))
                .toList();
    }

    public List<CompetencyResponse> getVisible() {
        return competencyRepository.findAllByVisibleTrueOrderByDisplayOrderAsc().stream()
                .map(competency -> CompetencyResponse.from(competency))
                .toList();
    }

    public List<CompetencyResponse> getAll(Long workspaceId) {
        return competencyRepository.findAllByWorkspaceIdOrderByDisplayOrderAsc(workspaceId).stream()
                .map(competency -> CompetencyResponse.from(competency))
                .toList();
    }

    public List<CompetencyResponse> getVisible(Long workspaceId) {
        return competencyRepository
                .findAllByWorkspaceIdAndVisibleTrueOrderByDisplayOrderAsc(workspaceId)
                .stream()
                .map(competency -> CompetencyResponse.from(competency))
                .toList();
    }

    public List<CompetencyResponse> getForPublication(Long workspaceId, List<Long> orderedIds) {
        Map<Long, Competency> selected =
                competencyRepository.findAllByWorkspaceIdAndIdIn(workspaceId, orderedIds).stream()
                        .collect(Collectors.toMap(Competency::getId, Function.identity()));
        if (selected.size() != orderedIds.stream().distinct().count()) {
            throw new IllegalArgumentException("다른 Workspace의 핵심 역량이 포함되어 있습니다.");
        }
        return orderedIds.stream()
                .map(selected::get)
                .map(competency -> CompetencyResponse.from(competency))
                .toList();
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public CompetencyResponse create(CompetencyRequest request) {
        validate(request);
        Competency competency =
                Competency.create(
                        request.title(),
                        request.summary(),
                        request.displayOrder(),
                        request.visible());
        replaceLinks(competency, request);
        return CompetencyResponse.from(competencyRepository.save(competency));
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public CompetencyResponse create(Long workspaceId, CompetencyRequest request) {
        validate(request);
        Competency competency =
                Competency.create(
                        workspaceId,
                        request.title(),
                        request.summary(),
                        request.displayOrder(),
                        false);
        replaceLinks(workspaceId, competency, request);
        return CompetencyResponse.from(competencyRepository.save(competency));
    }

    @Transactional
    public CompetencyResponse update(Long id, CompetencyRequest request) {
        validate(request);
        Competency competency =
                competencyRepository
                        .findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 핵심 역량입니다."));
        competency.update(
                request.title(), request.summary(), request.displayOrder(), request.visible());
        competency.clearLinks();
        competencyRepository.flush();
        replaceLinks(competency, request);
        competencyRepository.flush();
        return CompetencyResponse.from(competency);
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public CompetencyResponse update(Long workspaceId, Long id, CompetencyRequest request) {
        validate(request);
        Competency competency = requireOwned(workspaceId, id);
        competency.update(
                request.title(), request.summary(), request.displayOrder(), competency.isVisible());
        competency.clearLinks();
        competencyRepository.flush();
        replaceLinks(workspaceId, competency, request);
        competencyRepository.flush();
        return CompetencyResponse.from(competency);
    }

    @Transactional
    public void delete(Long id) {
        if (!competencyRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 핵심 역량입니다.");
        }
        competencyRepository.deleteById(id);
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public void delete(Long workspaceId, Long id) {
        competencyRepository.delete(requireOwned(workspaceId, id));
    }

    @Transactional
    public List<CompetencyResponse> batchChangeVisibility(List<Long> ids, boolean visible) {
        List<Competency> competencies = competencyRepository.findAllById(ids);
        for (Competency competency : competencies) {
            competency.changeVisibility(visible);
        }
        competencyRepository.flush();
        return competencies.stream()
                .map(competency -> CompetencyResponse.from(competency))
                .toList();
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public List<CompetencyResponse> batchChangeVisibility(
            Long workspaceId, List<Long> ids, boolean visible) {
        List<Competency> competencies =
                competencyRepository.findAllByWorkspaceIdAndIdIn(workspaceId, ids);
        requireCompleteSelection(ids, competencies);
        competencies.forEach(competency -> competency.changeVisibility(visible));
        competencyRepository.flush();
        return competencies.stream()
                .map(competency -> CompetencyResponse.from(competency))
                .toList();
    }

    @Transactional
    public CompetencyResponse toggleVisibility(Long id) {
        Competency competency =
                competencyRepository
                        .findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 핵심 역량입니다."));
        competency.changeVisibility(!competency.isVisible());
        competencyRepository.flush();
        return CompetencyResponse.from(competency);
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public CompetencyResponse toggleVisibility(Long workspaceId, Long id) {
        Competency competency = requireOwned(workspaceId, id);
        competency.changeVisibility(!competency.isVisible());
        competencyRepository.flush();
        return CompetencyResponse.from(competency);
    }

    @Transactional
    public List<CompetencyResponse> reorder(List<Long> orderedIds) {
        List<Competency> list = competencyRepository.findAllById(orderedIds);
        Map<Long, Competency> map =
                list.stream().collect(Collectors.toMap(Competency::getId, Function.identity()));
        for (int i = 0; i < orderedIds.size(); i++) {
            Long id = orderedIds.get(i);
            Competency competency = map.get(id);
            if (competency == null) {
                throw new IllegalArgumentException("존재하지 않는 핵심 역량입니다: " + id);
            }
            competency.changeDisplayOrder(i + 1);
        }
        competencyRepository.flush();
        return getAll();
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public List<CompetencyResponse> reorder(Long workspaceId, List<Long> orderedIds) {
        List<Competency> list =
                competencyRepository.findAllByWorkspaceIdAndIdIn(workspaceId, orderedIds);
        requireCompleteSelection(orderedIds, list);
        Map<Long, Competency> byId =
                list.stream().collect(Collectors.toMap(Competency::getId, Function.identity()));
        for (int i = 0; i < orderedIds.size(); i++) {
            byId.get(orderedIds.get(i)).changeDisplayOrder(i + 1);
        }
        competencyRepository.flush();
        return getAll(workspaceId);
    }

    private void validate(CompetencyRequest request) {
        if (request.evidences().stream().filter(CompetencyRequest.EvidenceRequest::primary).count()
                > 1) {
            throw new IllegalArgumentException("대표 실무 근거는 하나만 지정할 수 있습니다.");
        }
        if (request.skillIds().stream().distinct().count() != request.skillIds().size()
                || request.studyIds().stream().distinct().count() != request.studyIds().size()
                || request.evidences().stream()
                                .map(CompetencyRequest.EvidenceRequest::experienceId)
                                .distinct()
                                .count()
                        != request.evidences().size()) {
            throw new IllegalArgumentException("핵심 역량의 연결 항목은 중복될 수 없습니다.");
        }
        if (request.tagNames() != null) {
            long distinctTags =
                    request.tagNames().stream()
                            .filter(StringUtils::hasText)
                            .map(String::trim)
                            .map(name -> name.toLowerCase(Locale.ROOT))
                            .distinct()
                            .count();
            long tagCount = request.tagNames().stream().filter(StringUtils::hasText).count();
            if (distinctTags != tagCount) {
                throw new IllegalArgumentException("핵심 역량 태그는 중복될 수 없습니다.");
            }
        }
    }

    private void replaceLinks(Competency competency, CompetencyRequest request) {
        List<Skill> skills = skillRepository.findAllById(request.skillIds());
        if (skills.size() != request.skillIds().size()) {
            throw new IllegalArgumentException("존재하지 않는 기술 스택이 포함되어 있습니다.");
        }

        List<Long> expIds =
                request.evidences().stream()
                        .map(CompetencyRequest.EvidenceRequest::experienceId)
                        .toList();
        List<Experience> experiences = experienceRepository.findAllById(expIds);
        Map<Long, Experience> expMap =
                experiences.stream()
                        .collect(Collectors.toMap(Experience::getId, Function.identity()));

        List<Competency.EvidenceDraft> evidences =
                request.evidences().stream()
                        .map(
                                item -> {
                                    Experience experience = expMap.get(item.experienceId());
                                    if (experience == null) {
                                        throw new IllegalArgumentException(
                                                "존재하지 않는 경력/프로젝트입니다: " + item.experienceId());
                                    }
                                    if (!"CAREER".equals(experience.getType())
                                            && !"PROJECT".equals(experience.getType())) {
                                        throw new IllegalArgumentException(
                                                "핵심 역량 근거에는 경력 또는 프로젝트만 연결할 수 있습니다.");
                                    }
                                    return new Competency.EvidenceDraft(
                                            experience,
                                            item.evidenceSummary(),
                                            item.primary(),
                                            item.displayOrder());
                                })
                        .toList();

        List<Study> studies = studyRepository.findAllById(request.studyIds());
        if (studies.size() != request.studyIds().size()) {
            throw new IllegalArgumentException("존재하지 않는 Study가 포함되어 있습니다.");
        }

        competency.replaceSkills(skills);
        competency.replaceEvidences(evidences);
        competency.replaceStudies(studies);
        competency.replaceTags(List.of());
    }

    private void replaceLinks(Long workspaceId, Competency competency, CompetencyRequest request) {
        List<WorkspaceSkill> workspaceSkills =
                workspaceSkillRepository.findAllByWorkspaceIdAndSkill_IdIn(
                        workspaceId, request.skillIds());
        if (workspaceSkills.size() != request.skillIds().stream().distinct().count()) {
            throw new IllegalArgumentException("현재 Workspace에 추가되지 않은 기술이 포함되어 있습니다.");
        }
        List<Skill> skills = workspaceSkills.stream().map(WorkspaceSkill::getSkill).toList();

        List<Long> experienceIds =
                request.evidences().stream()
                        .map(CompetencyRequest.EvidenceRequest::experienceId)
                        .toList();
        List<Experience> experiences =
                experienceRepository.findAllByWorkspaceIdAndIdIn(workspaceId, experienceIds);
        Map<Long, Experience> experienceById =
                experiences.stream()
                        .collect(Collectors.toMap(Experience::getId, Function.identity()));
        if (experienceById.size() != experienceIds.stream().distinct().count()) {
            throw new IllegalArgumentException("다른 Workspace의 경력/프로젝트가 포함되어 있습니다.");
        }

        List<Competency.EvidenceDraft> evidences =
                request.evidences().stream()
                        .map(
                                item -> {
                                    Experience experience = experienceById.get(item.experienceId());
                                    if (!"CAREER".equals(experience.getType())
                                            && !"PROJECT".equals(experience.getType())) {
                                        throw new IllegalArgumentException(
                                                "핵심 역량 근거에는 경력 또는 프로젝트만 연결할 수 있습니다.");
                                    }
                                    return new Competency.EvidenceDraft(
                                            experience,
                                            item.evidenceSummary(),
                                            item.primary(),
                                            item.displayOrder());
                                })
                        .toList();

        List<Study> studies =
                studyRepository.findAllByWorkspaceIdAndIdIn(workspaceId, request.studyIds());
        if (studies.size() != request.studyIds().stream().distinct().count()) {
            throw new IllegalArgumentException("다른 Workspace의 Study가 포함되어 있습니다.");
        }

        competency.replaceSkills(skills);
        competency.replaceEvidences(evidences);
        competency.replaceStudies(studies);
        competency.replaceTags(resolveTags(workspaceId, request.tagNames()));
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

    private Competency requireOwned(Long workspaceId, Long id) {
        return competencyRepository
                .findByIdAndWorkspaceId(id, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 핵심 역량입니다."));
    }

    private void requireCompleteSelection(List<Long> ids, List<Competency> competencies) {
        if (competencies.size() != ids.stream().distinct().count()) {
            throw new IllegalArgumentException("다른 Workspace의 핵심 역량이 포함되어 있습니다.");
        }
    }
}
