package com.selfintro.modules.skill.application;

import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.entity.ExperienceDetail;
import com.selfintro.modules.experience.domain.repository.ExperienceDetailRepository;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import com.selfintro.modules.skill.presentation.dto.SkillConnections;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SkillConnectionService {

    private final SkillRepository skillRepository;
    private final StudyRepository studyRepository;
    private final ExperienceRepository experienceRepository;
    private final ExperienceDetailRepository experienceDetailRepository;

    public SkillConnections getSkillConnections(Long skillId) {
        requireSkill(skillId);
        List<Long> studyIds =
                studyRepository.findAll().stream()
                        .filter(study -> containsId(study.getSkills(), skillId))
                        .map(Study::getId)
                        .toList();
        List<Long> experienceIds =
                experienceRepository.findAll().stream()
                        .filter(experience -> containsId(experience.getSkills(), skillId))
                        .map(Experience::getId)
                        .toList();
        List<Long> detailIds =
                experienceDetailRepository.findAll().stream()
                        .filter(detail -> containsId(detail.getSkills(), skillId))
                        .map(ExperienceDetail::getId)
                        .toList();
        return new SkillConnections(studyIds, experienceIds, detailIds);
    }

    @Transactional
    public SkillConnections updateSkillConnections(Long skillId, SkillConnections request) {
        Skill skill = requireSkill(skillId);
        Set<Long> studyIds = ids(request.studyIds());
        Set<Long> experienceIds = ids(request.experienceIds());
        Set<Long> detailIds = ids(request.experienceDetailIds());
        validateIds("Study", studyIds, studyRepository.findAllById(studyIds).size());
        validateIds(
                "Experience",
                experienceIds,
                experienceRepository.findAllById(experienceIds).size());
        validateIds(
                "Experience detail",
                detailIds,
                experienceDetailRepository.findAllById(detailIds).size());

        studyRepository
                .findAll()
                .forEach(study -> study.setSkillLinked(skill, studyIds.contains(study.getId())));
        experienceRepository
                .findAll()
                .forEach(
                        experience ->
                                experience.setSkillLinked(
                                        skill, experienceIds.contains(experience.getId())));
        experienceDetailRepository
                .findAll()
                .forEach(
                        detail -> detail.setSkillLinked(skill, detailIds.contains(detail.getId())));

        return getSkillConnections(skillId);
    }

    private Skill requireSkill(Long id) {
        return skillRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 기술 스택입니다: " + id));
    }

    private Set<Long> ids(List<Long> values) {
        return values == null ? Set.of() : new LinkedHashSet<>(values);
    }

    private void validateIds(String label, Set<Long> ids, int foundCount) {
        if (ids.size() != foundCount) {
            throw new IllegalArgumentException(label + " 연결 대상 중 존재하지 않는 ID가 있습니다.");
        }
    }

    private boolean containsId(List<? extends Object> values, Long id) {
        return values.stream()
                .anyMatch(
                        value -> {
                            if (value instanceof Skill skill) return id.equals(skill.getId());
                            if (value instanceof Experience experience)
                                return id.equals(experience.getId());
                            if (value instanceof ExperienceDetail detail)
                                return id.equals(detail.getId());
                            return false;
                        });
    }
}
