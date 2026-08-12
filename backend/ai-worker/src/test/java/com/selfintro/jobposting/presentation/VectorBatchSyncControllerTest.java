package com.selfintro.jobposting.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.selfintro.jobposting.application.VectorBatchSyncService;
import com.selfintro.modules.auth.application.RecentReauthenticationPolicy;
import com.selfintro.vectorsearch.application.VectorBackfillOrchestrator;
import com.selfintro.vectorsearch.application.VectorSourceReconciliationService;
import com.selfintro.vectorsearch.application.VectorSourceReconciliationService.MissingRepairResult;
import com.selfintro.vectorsearch.application.VectorSourceReconciliationService.ReconciliationResult;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.InsufficientAuthenticationException;

@ExtendWith(MockitoExtension.class)
class VectorBatchSyncControllerTest {

    @Mock private VectorBatchSyncService vectorBatchSyncService;
    @Mock private VectorBackfillOrchestrator vectorBackfillOrchestrator;
    @Mock private VectorSourceReconciliationService vectorSourceReconciliationService;
    @Mock private RecentReauthenticationPolicy reauthenticationPolicy;
    @Mock private HttpSession session;

    @InjectMocks private VectorBatchSyncController controller;

    @Test
    void orphanRepairRequiresRecentReauthenticationAndReturnsDeletionSummary() {
        ReconciliationResult result = new ReconciliationResult(99, 82, 180, 139, 70, 220);
        when(vectorSourceReconciliationService.removeOrphans()).thenReturn(result);

        var response = controller.reconcileOrphans(session);

        verify(reauthenticationPolicy).requireRecent(session);
        verify(vectorSourceReconciliationService).removeOrphans();
        assertThat(response.getBody()).isEqualTo(result);
    }

    @Test
    void backfillDoesNotStartWhenRecentReauthenticationIsMissing() {
        doThrow(new InsufficientAuthenticationException("reauthentication required"))
                .when(reauthenticationPolicy)
                .requireRecent(session);

        assertThatThrownBy(() -> controller.backfillAll(session))
                .isInstanceOf(InsufficientAuthenticationException.class);
        verifyNoInteractions(vectorBackfillOrchestrator);
    }

    @Test
    void missingRepairRequiresExactExternalTransferConfirmation() {
        assertThatThrownBy(
                        () ->
                                controller.reconcileMissingExternal(
                                        new VectorBatchSyncController.MissingRepairRequest("LOCAL"),
                                        session))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("외부 임베딩 전송 확인");
        verify(reauthenticationPolicy).requireRecent(session);
        verifyNoInteractions(vectorSourceReconciliationService);
    }

    @Test
    void missingRepairUsesExternalProviderOnlyAfterReauthenticationAndConfirmation() {
        MissingRepairResult result = new MissingRepairResult(0, 0, 1, 2);
        when(vectorSourceReconciliationService.repairMissingWithExternalProvider())
                .thenReturn(result);

        var response =
                controller.reconcileMissingExternal(
                        new VectorBatchSyncController.MissingRepairRequest("EXTERNAL_NVIDIA"),
                        session);

        verify(reauthenticationPolicy).requireRecent(session);
        verify(vectorSourceReconciliationService).repairMissingWithExternalProvider();
        assertThat(response.getBody()).isEqualTo(result);
    }
}
