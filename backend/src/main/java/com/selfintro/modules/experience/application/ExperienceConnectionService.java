package com.selfintro.modules.experience.application;

import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.entity.ExperienceDetail;
import com.selfintro.modules.experience.domain.entity.ExperienceRelation;
import com.selfintro.modules.experience.domain.repository.ExperienceDetailRepository;
import com.selfintro.modules.experience.domain.repository.ExperienceRelationRepository;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.experience.presentation.dto.DetailStudies;
import com.selfintro.modules.experience.presentation.dto.ExperienceConnections;
import com.selfintro.modules.experience.presentation.dto.RelatedExperienceRequest;
import com.selfintro.modules.experience.presentation.dto.RelatedExperienceResponse;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.repository.StudyRepository;
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
public class ExperienceConnectionService {

    private final StudyRepository studyRepository;
    private final ExperienceRepository experienceRepository;
    private final ExperienceDetailRepository experienceDetailRepository;
    private final ExperienceRelationRepository experienceRelationRepository;

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
                            if (value instanceof Experience experience)
                                return id.equals(experience.getId());
                            if (value instanceof ExperienceDetail detail)
                                return id.equals(detail.getId());
                            return false;
                        });
    }
}
