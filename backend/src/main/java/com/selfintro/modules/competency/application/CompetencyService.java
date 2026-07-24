package com.selfintro.modules.competency.application;

import com.selfintro.modules.competency.domain.Competency;
import com.selfintro.modules.competency.domain.CompetencyRepository;
import com.selfintro.modules.competency.presentation.dto.CompetencyRequest;
import com.selfintro.modules.competency.presentation.dto.CompetencyResponse;
import com.selfintro.modules.experience.domain.Experience;
import com.selfintro.modules.experience.domain.ExperienceRepository;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.study.entity.Study;
import com.selfintro.study.repository.StudyRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompetencyService {
    private final CompetencyRepository competencyRepository;
    private final SkillRepository skillRepository;
    private final ExperienceRepository experienceRepository;
    private final StudyRepository studyRepository;

    public List<CompetencyResponse> getAll() {
        return competencyRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(competency -> CompetencyResponse.from(competency, false))
                .toList();
    }

    public List<CompetencyResponse> getVisible() {
        return competencyRepository.findAllByVisibleTrueOrderByDisplayOrderAsc().stream()
                .map(competency -> CompetencyResponse.from(competency, true))
                .toList();
    }

    @Transactional
    public CompetencyResponse create(CompetencyRequest request) {
        validate(request);
        Competency competency =
                Competency.create(
                        request.title(),
                        request.summary(),
                        request.displayOrder(),
                        request.visible());
        replaceLinks(competency, request);
        return CompetencyResponse.from(competencyRepository.save(competency), false);
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
        return CompetencyResponse.from(competency, false);
    }

    @Transactional
    public void delete(Long id) {
        if (!competencyRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 핵심 역량입니다.");
        }
        competencyRepository.deleteById(id);
    }

    @Transactional
    public List<CompetencyResponse> batchChangeVisibility(List<Long> ids, boolean visible) {
        List<Competency> competencies = competencyRepository.findAllById(ids);
        for (Competency competency : competencies) {
            competency.changeVisibility(visible);
        }
        competencyRepository.flush();
        return competencies.stream()
                .map(competency -> CompetencyResponse.from(competency, false))
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
        return CompetencyResponse.from(competency, false);
    }

    @Transactional
    public List<CompetencyResponse> reorder(List<Long> orderedIds) {
        for (int i = 0; i < orderedIds.size(); i++) {
            Long id = orderedIds.get(i);
            Competency competency =
                    competencyRepository
                            .findById(id)
                            .orElseThrow(
                                    () -> new IllegalArgumentException("존재하지 않는 핵심 역량입니다: " + id));
            competency.changeDisplayOrder(i + 1);
        }
        competencyRepository.flush();
        return getAll();
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
    }

    private void replaceLinks(Competency competency, CompetencyRequest request) {
        List<Skill> skills =
                request.skillIds().stream()
                        .map(
                                id ->
                                        skillRepository
                                                .findById(id)
                                                .orElseThrow(
                                                        () ->
                                                                new IllegalArgumentException(
                                                                        "존재하지 않는 기술 스택입니다: " + id)))
                        .toList();
        List<Competency.EvidenceDraft> evidences =
                request.evidences().stream()
                        .map(
                                item -> {
                                    Experience experience =
                                            experienceRepository
                                                    .findById(item.experienceId())
                                                    .orElseThrow(
                                                            () ->
                                                                    new IllegalArgumentException(
                                                                            "존재하지 않는 경력/프로젝트입니다: "
                                                                                    + item
                                                                                            .experienceId()));
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
                request.studyIds().stream()
                        .map(
                                id ->
                                        studyRepository
                                                .findById(id)
                                                .orElseThrow(
                                                        () ->
                                                                new IllegalArgumentException(
                                                                        "존재하지 않는 Study입니다: " + id)))
                        .toList();

        competency.replaceSkills(skills);
        competency.replaceEvidences(evidences);
        competency.replaceStudies(studies);
    }
}
