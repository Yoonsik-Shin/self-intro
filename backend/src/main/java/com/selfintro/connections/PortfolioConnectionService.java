package com.selfintro.connections;

import com.selfintro.connections.dto.ConnectionDtos.DetailStudies;
import com.selfintro.connections.dto.ConnectionDtos.ExperienceConnections;
import com.selfintro.connections.dto.ConnectionDtos.RelatedExperienceRequest;
import com.selfintro.connections.dto.ConnectionDtos.RelatedExperienceResponse;
import com.selfintro.connections.dto.ConnectionDtos.SkillConnections;
import com.selfintro.modules.experience.domain.Experience;
import com.selfintro.modules.experience.domain.ExperienceDetail;
import com.selfintro.modules.experience.domain.ExperienceDetailRepository;
import com.selfintro.modules.experience.domain.ExperienceRelation;
import com.selfintro.modules.experience.domain.ExperienceRelationRepository;
import com.selfintro.modules.experience.domain.ExperienceRepository;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.study.entity.Study;
import com.selfintro.study.repository.StudyRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioConnectionService {

    private final StudyRepository studyRepository;
    private final SkillRepository skillRepository;
    private final ExperienceRepository experienceRepository;
    private final ExperienceDetailRepository experienceDetailRepository;
    private final ExperienceRelationRepository experienceRelationRepository;

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

    public ExperienceConnections getExperienceConnections(Long experienceId) {
        Experience experience = requireExperience(experienceId);
        List<Study> studies = studyRepository.findAll();
        List<Long> studyIds =
                studies.stream()
                        .filter(study -> containsId(study.getExperiences(), experienceId))
                        .map(Study::getId)
                        .toList();
        List<DetailStudies> detailStudies =
                experience.getDetails().stream()
                        .map(
                                detail ->
                                        new DetailStudies(
                                                detail.getId(),
                                                studies.stream()
                                                        .filter(
                                                                study ->
                                                                        containsId(
                                                                                study
                                                                                        .getExperienceDetails(),
                                                                                detail.getId()))
                                                        .map(Study::getId)
                                                        .toList()))
                        .toList();
        List<RelatedExperienceRequest> related =
                experienceRelationRepository
                        .findBySourceIdOrTargetIdOrderByDisplayOrderAsc(experienceId, experienceId)
                        .stream()
                        .map(
                                relation -> {
                                    Experience other =
                                            relation.getSource().getId().equals(experienceId)
                                                    ? relation.getTarget()
                                                    : relation.getSource();
                                    return new RelatedExperienceRequest(
                                            other.getId(), relation.getType());
                                })
                        .toList();
        return new ExperienceConnections(studyIds, detailStudies, related);
    }

    @Transactional
    public ExperienceConnections updateExperienceConnections(
            Long experienceId, ExperienceConnections request) {
        Experience experience = requireExperience(experienceId);
        Set<Long> studyIds = ids(request.studyIds());
        validateIds("Study", studyIds, studyRepository.findAllById(studyIds).size());

        Map<Long, Set<Long>> detailStudyIds = new LinkedHashMap<>();
        for (DetailStudies detailConnection : safe(request.detailStudies())) {
            ExperienceDetail detail =
                    experienceDetailRepository
                            .findById(detailConnection.detailId())
                            .orElseThrow(
                                    () ->
                                            new IllegalArgumentException(
                                                    "존재하지 않는 이력 상세 항목입니다: "
                                                            + detailConnection.detailId()));
            if (detail.getExperience() == null
                    || !experienceId.equals(detail.getExperience().getId())) {
                throw new IllegalArgumentException("다른 이력의 상세 항목은 연결할 수 없습니다.");
            }
            Set<Long> connectedStudyIds = ids(detailConnection.studyIds());
            validateIds(
                    "Study",
                    connectedStudyIds,
                    studyRepository.findAllById(connectedStudyIds).size());
            detailStudyIds.put(detail.getId(), connectedStudyIds);
        }

        List<Study> studies = studyRepository.findAll();
        studies.forEach(
                study -> study.setExperienceLinked(experience, studyIds.contains(study.getId())));
        for (ExperienceDetail detail : experience.getDetails()) {
            Set<Long> connectedStudyIds = detailStudyIds.getOrDefault(detail.getId(), Set.of());
            studies.forEach(
                    study ->
                            study.setExperienceDetailLinked(
                                    detail, connectedStudyIds.contains(study.getId())));
        }

        List<RelatedExperienceRequest> relatedRequests = safe(request.relatedExperiences());
        Set<Long> targetIds =
                relatedRequests.stream()
                        .map(RelatedExperienceRequest::experienceId)
                        .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (targetIds.contains(experienceId)) {
            throw new IllegalArgumentException("이력은 자기 자신과 연결할 수 없습니다.");
        }
        validateIds(
                "Related experience",
                targetIds,
                experienceRepository.findAllById(targetIds).size());

        // 관계는 어느 쪽 experience를 편집하든 동일하게 보여야 하므로, source/target 방향에 상관없이
        // 이 experience가 걸린 관계를 모두 대상으로 정리한다: 더 이상 선택되지 않은 것만 삭제하고,
        // 반대 방향으로 이미 존재하는 관계는 그대로 두어 상대방 화면의 데이터를 건드리지 않는다.
        List<ExperienceRelation> existingRelations =
                experienceRelationRepository.findBySourceIdOrTargetIdOrderByDisplayOrderAsc(
                        experienceId, experienceId);
        Map<Long, ExperienceRelation> existingByOtherId = new LinkedHashMap<>();
        for (ExperienceRelation relation : existingRelations) {
            Long otherId =
                    relation.getSource().getId().equals(experienceId)
                            ? relation.getTarget().getId()
                            : relation.getSource().getId();
            existingByOtherId.put(otherId, relation);
        }

        List<ExperienceRelation> toDelete =
                existingRelations.stream()
                        .filter(
                                relation -> {
                                    Long otherId =
                                            relation.getSource().getId().equals(experienceId)
                                                    ? relation.getTarget().getId()
                                                    : relation.getSource().getId();
                                    return !targetIds.contains(otherId);
                                })
                        .toList();
        experienceRelationRepository.deleteAll(toDelete);
        experienceRelationRepository.flush();

        List<ExperienceRelation> toCreate = new ArrayList<>();
        int order = 0;
        for (RelatedExperienceRequest related : relatedRequests) {
            if (!existingByOtherId.containsKey(related.experienceId())) {
                Experience target = requireExperience(related.experienceId());
                toCreate.add(ExperienceRelation.create(experience, target, related.type(), order));
            }
            order++;
        }
        experienceRelationRepository.saveAll(toCreate);

        return getExperienceConnections(experienceId);
    }

    public List<RelatedExperienceResponse> getRelatedExperiences(Long experienceId) {
        requireExperience(experienceId);
        Map<Long, RelatedExperienceResponse> unique = new LinkedHashMap<>();
        experienceRelationRepository
                .findBySourceIdOrTargetIdOrderByDisplayOrderAsc(experienceId, experienceId)
                .forEach(
                        relation -> {
                            Experience other =
                                    relation.getSource().getId().equals(experienceId)
                                            ? relation.getTarget()
                                            : relation.getSource();
                            unique.putIfAbsent(
                                    other.getId(),
                                    RelatedExperienceResponse.from(other, relation.getType()));
                        });
        return List.copyOf(unique.values());
    }

    private Skill requireSkill(Long id) {
        return skillRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 기술 스택입니다: " + id));
    }

    private Experience requireExperience(Long id) {
        return experienceRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이력 항목입니다: " + id));
    }

    private Set<Long> ids(List<Long> values) {
        return values == null ? Set.of() : new LinkedHashSet<>(values);
    }

    private <T> List<T> safe(List<T> values) {
        return values == null ? List.of() : values;
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
