package com.selfintro.vectorsearch.application;

import com.selfintro.modules.identity.application.WorkspaceVectorStoragePort;
import com.selfintro.modules.identity.application.WorkspaceVectorStoragePort.WorkspaceVectorInventory;
import com.selfintro.vectorsearch.domain.repository.ExperienceVectorRepository;
import com.selfintro.vectorsearch.domain.repository.StudyVectorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Workspace-owned Oracle Vector inventory and deletion boundary inside the AI Worker.
 *
 * <p>{@code JobPostingVector} is a platform catalog asset and is intentionally excluded from this
 * Workspace lifecycle boundary.
 */
@Service
@RequiredArgsConstructor
public class WorkspaceVectorPurgeService implements WorkspaceVectorStoragePort {

    private final ExperienceVectorRepository experienceVectorRepository;
    private final StudyVectorRepository studyVectorRepository;

    @Value("${app.workspace-purge.vector-delete-enabled:false}")
    private boolean vectorDeleteEnabled;

    @Transactional(transactionManager = "vectorTransactionManager", readOnly = true)
    @Override
    public WorkspaceVectorInventory inspect(Long workspaceId) {
        validateWorkspaceId(workspaceId);
        return new WorkspaceVectorInventory(
                experienceVectorRepository.countByWorkspaceId(workspaceId),
                studyVectorRepository.countByWorkspaceId(workspaceId));
    }

    /**
     * Internal-only destructive adapter reached through the guarded Workspace purge orchestration.
     * Public controllers must not invoke this adapter directly.
     */
    @Transactional(transactionManager = "vectorTransactionManager")
    @Override
    public WorkspaceVectorPurgeResult purge(Long workspaceId) {
        validateWorkspaceId(workspaceId);
        if (!vectorDeleteEnabled) {
            throw new IllegalStateException("Workspace vector purge 삭제 기능이 비활성화되어 있습니다.");
        }

        int deletedExperiences = experienceVectorRepository.deleteAllByWorkspaceId(workspaceId);
        int deletedStudies = studyVectorRepository.deleteAllByWorkspaceId(workspaceId);
        WorkspaceVectorInventory remaining = inspectAfterDelete(workspaceId);
        if (remaining.totalCandidateCount() != 0) {
            throw new IllegalStateException("Workspace vector purge 후 잔여 데이터가 감지되었습니다.");
        }
        return new WorkspaceVectorPurgeResult(deletedExperiences, deletedStudies);
    }

    private WorkspaceVectorInventory inspectAfterDelete(Long workspaceId) {
        return new WorkspaceVectorInventory(
                experienceVectorRepository.countByWorkspaceId(workspaceId),
                studyVectorRepository.countByWorkspaceId(workspaceId));
    }

    private void validateWorkspaceId(Long workspaceId) {
        if (workspaceId == null || workspaceId <= 0) {
            throw new IllegalArgumentException("workspaceId가 올바르지 않습니다.");
        }
    }
}
