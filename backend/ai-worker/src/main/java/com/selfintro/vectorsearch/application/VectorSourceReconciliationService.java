package com.selfintro.vectorsearch.application;

import com.selfintro.global.ai.CareerProfileDigestBuilder;
import com.selfintro.jobposting.application.VectorBatchSyncService;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import com.selfintro.vectorsearch.domain.repository.ExperienceVectorRepository;
import com.selfintro.vectorsearch.domain.repository.StudyVectorRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Oracle Workspace vector의 source reference를 MySQL 원본과 대조해 고아 namespace만 제거한다. */
@Slf4j
@Service
@RequiredArgsConstructor
public class VectorSourceReconciliationService {

    private final ExperienceVectorRepository experienceVectorRepository;
    private final StudyVectorRepository studyVectorRepository;
    private final ExperienceRepository experienceRepository;
    private final StudyRepository studyRepository;
    private final VectorBatchSyncService vectorBatchSyncService;
    private final CareerProfileDigestBuilder careerProfileDigestBuilder;

    @Transactional(readOnly = true)
    public ReconciliationInspection inspectOrphans() {
        ReconciliationPlan plan = buildPlan();
        return plan.toInspection();
    }

    @Transactional
    public ReconciliationResult removeOrphans() {
        ReconciliationPlan plan = buildPlan();
        int deletedExperienceChunks = 0;
        for (ExperienceVectorRepository.ExperienceVectorReference reference :
                plan.orphanExperiences()) {
            deletedExperienceChunks +=
                    vectorBatchSyncService.deleteExperienceVector(
                            reference.getWorkspaceId(), reference.getExperienceId());
        }

        int deletedStudyChunks = 0;
        for (StudyVectorRepository.StudyVectorReference reference : plan.orphanStudies()) {
            deletedStudyChunks +=
                    vectorBatchSyncService.deleteStudyVector(
                            reference.getWorkspaceId(), reference.getStudyId());
        }

        ReconciliationResult result =
                new ReconciliationResult(
                        plan.scannedExperienceNamespaces(),
                        plan.orphanExperiences().size(),
                        deletedExperienceChunks,
                        plan.scannedStudyNamespaces(),
                        plan.orphanStudies().size(),
                        deletedStudyChunks);
        log.info(
                "[VectorReconciliation] 완료 - Experience namespace {}/{}개, chunk {}건 삭제; Study namespace {}/{}개, chunk {}건 삭제",
                result.deletedExperienceNamespaces(),
                result.scannedExperienceNamespaces(),
                result.deletedExperienceChunks(),
                result.deletedStudyNamespaces(),
                result.scannedStudyNamespaces(),
                result.deletedStudyChunks());
        return result;
    }

    /** 명시적으로 승인된 외부 provider를 사용해 MySQL 원본이 있지만 Vector가 없는 namespace만 생성한다. */
    @Transactional(readOnly = true)
    public MissingRepairResult repairMissingWithExternalProvider() {
        ReconciliationPlan plan = buildPlan();
        int experienceChunks = 0;
        for (SourceKey source : plan.missingExperiences()) {
            var experience =
                    experienceRepository
                            .findByIdAndWorkspaceId(source.sourceId(), source.workspaceId())
                            .orElseThrow(
                                    () -> new IllegalStateException("대조 후 Experience 원본이 사라졌습니다."));
            experienceChunks +=
                    vectorBatchSyncService.syncExperienceVectorStrictExternal(
                            source.workspaceId(),
                            source.sourceId(),
                            experience.getTitle(),
                            careerProfileDigestBuilder.buildForExperience(experience));
        }

        int studyChunks = 0;
        for (SourceKey source : plan.missingStudies()) {
            var study =
                    studyRepository
                            .findByIdAndWorkspaceId(source.sourceId(), source.workspaceId())
                            .orElseThrow(() -> new IllegalStateException("대조 후 Study 원본이 사라졌습니다."));
            studyChunks +=
                    vectorBatchSyncService.syncStudyVectorStrictExternal(
                            source.workspaceId(),
                            source.sourceId(),
                            study.getTitle(),
                            study.getContentMarkdown());
        }

        MissingRepairResult result =
                new MissingRepairResult(
                        plan.missingExperiences().size(),
                        experienceChunks,
                        plan.missingStudies().size(),
                        studyChunks);
        log.info(
                "[VectorMissingRepair] 완료 - Experience namespace {}개/chunk {}건, Study namespace {}개/chunk {}건",
                result.repairedExperienceNamespaces(),
                result.createdExperienceChunks(),
                result.repairedStudyNamespaces(),
                result.createdStudyChunks());
        return result;
    }

    private ReconciliationPlan buildPlan() {
        List<ExperienceVectorRepository.ExperienceVectorReference> experienceReferences =
                experienceVectorRepository.findDistinctSourceReferences();
        Set<SourceKey> experienceVectors = new HashSet<>();
        for (ExperienceVectorRepository.ExperienceVectorReference reference :
                experienceReferences) {
            experienceVectors.add(
                    new SourceKey(reference.getWorkspaceId(), reference.getExperienceId()));
        }
        Set<SourceKey> experienceSources = new HashSet<>();
        for (ExperienceRepository.ExperienceSourceReference source :
                experienceRepository.findAllSourceReferences()) {
            experienceSources.add(new SourceKey(source.getWorkspaceId(), source.getExperienceId()));
        }
        List<ExperienceVectorRepository.ExperienceVectorReference> orphanExperiences =
                new ArrayList<>();
        for (ExperienceVectorRepository.ExperienceVectorReference reference :
                experienceReferences) {
            if (!experienceSources.contains(
                    new SourceKey(reference.getWorkspaceId(), reference.getExperienceId()))) {
                orphanExperiences.add(reference);
            }
        }
        List<SourceKey> missingExperiences = new ArrayList<>();
        for (SourceKey source : experienceSources) {
            if (!experienceVectors.contains(source)) {
                missingExperiences.add(source);
            }
        }

        List<StudyVectorRepository.StudyVectorReference> studyReferences =
                studyVectorRepository.findDistinctSourceReferences();
        Set<SourceKey> studyVectors = new HashSet<>();
        for (StudyVectorRepository.StudyVectorReference reference : studyReferences) {
            studyVectors.add(new SourceKey(reference.getWorkspaceId(), reference.getStudyId()));
        }
        Set<SourceKey> studySources = new HashSet<>();
        for (StudyRepository.StudySourceReference source :
                studyRepository.findAllSourceReferences()) {
            studySources.add(new SourceKey(source.getWorkspaceId(), source.getStudyId()));
        }
        List<StudyVectorRepository.StudyVectorReference> orphanStudies = new ArrayList<>();
        for (StudyVectorRepository.StudyVectorReference reference : studyReferences) {
            if (!studySources.contains(
                    new SourceKey(reference.getWorkspaceId(), reference.getStudyId()))) {
                orphanStudies.add(reference);
            }
        }
        List<SourceKey> missingStudies = new ArrayList<>();
        for (SourceKey source : studySources) {
            if (!studyVectors.contains(source)) {
                missingStudies.add(source);
            }
        }

        return new ReconciliationPlan(
                experienceReferences.size(),
                experienceSources.size(),
                List.copyOf(orphanExperiences),
                List.copyOf(missingExperiences),
                studyReferences.size(),
                studySources.size(),
                List.copyOf(orphanStudies),
                List.copyOf(missingStudies));
    }

    public record ReconciliationInspection(
            int scannedExperienceNamespaces,
            int sourceExperienceNamespaces,
            int orphanExperienceNamespaces,
            int missingExperienceNamespaces,
            int scannedStudyNamespaces,
            int sourceStudyNamespaces,
            int orphanStudyNamespaces,
            int missingStudyNamespaces) {}

    public record ReconciliationResult(
            int scannedExperienceNamespaces,
            int deletedExperienceNamespaces,
            int deletedExperienceChunks,
            int scannedStudyNamespaces,
            int deletedStudyNamespaces,
            int deletedStudyChunks) {}

    public record MissingRepairResult(
            int repairedExperienceNamespaces,
            int createdExperienceChunks,
            int repairedStudyNamespaces,
            int createdStudyChunks) {}

    private record ReconciliationPlan(
            int scannedExperienceNamespaces,
            int sourceExperienceNamespaces,
            List<ExperienceVectorRepository.ExperienceVectorReference> orphanExperiences,
            List<SourceKey> missingExperiences,
            int scannedStudyNamespaces,
            int sourceStudyNamespaces,
            List<StudyVectorRepository.StudyVectorReference> orphanStudies,
            List<SourceKey> missingStudies) {

        private ReconciliationInspection toInspection() {
            return new ReconciliationInspection(
                    scannedExperienceNamespaces,
                    sourceExperienceNamespaces,
                    orphanExperiences.size(),
                    missingExperiences.size(),
                    scannedStudyNamespaces,
                    sourceStudyNamespaces,
                    orphanStudies.size(),
                    missingStudies.size());
        }
    }

    private record SourceKey(Long workspaceId, Long sourceId) {}
}
