package com.selfintro.identity;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.application.WorkspacePurgeService;
import com.selfintro.modules.identity.application.WorkspaceRestoreReconciliationService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class WorkspaceRestoreReconciliationRunnerTest {

    @Mock private WorkspaceRestoreReconciliationService reconciliationService;
    @Mock private WorkspacePurgeService purgeService;

    private WorkspaceRestoreReconciliationRunner runner;
    private ApplicationArguments arguments;

    @BeforeEach
    void setUp() {
        runner = new WorkspaceRestoreReconciliationRunner(reconciliationService, purgeService);
        arguments = mock(ApplicationArguments.class);
        ReflectionTestUtils.setField(runner, "maintenanceMode", true);
        ReflectionTestUtils.setField(runner, "purgeExecutionEnabled", false);
    }

    @Test
    void requiresExplicitMaintenanceMode() {
        ReflectionTestUtils.setField(runner, "maintenanceMode", false);

        assertThatThrownBy(() -> runner.run(arguments))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("maintenance");
    }

    @Test
    void refusesToReconcileWhilePurgeExecutionIsEnabled() {
        ReflectionTestUtils.setField(runner, "purgeExecutionEnabled", true);

        assertThatThrownBy(() -> runner.run(arguments))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("disabled");
    }

    @Test
    void acceptsOnlyExpectedDisabledProviderBlockers() {
        when(reconciliationService.reconcileControlPlane(
                        org.mockito.ArgumentMatchers.any(LocalDateTime.class)))
                .thenReturn(report(List.of(9L), Set.of()));
        when(purgeService.dryRun(9L))
                .thenReturn(
                        view(
                                new WorkspacePurgeService.CheckpointView(
                                        "MYSQL_PRIMARY",
                                        "BLOCKED",
                                        3,
                                        "MYSQL_DELETE_NOT_ENABLED",
                                        "disabled",
                                        LocalDateTime.now())));

        assertThatCode(() -> runner.run(arguments)).doesNotThrowAnyException();
    }

    @Test
    void blocksOnInventoryFailure() {
        when(reconciliationService.reconcileControlPlane(
                        org.mockito.ArgumentMatchers.any(LocalDateTime.class)))
                .thenReturn(report(List.of(9L), Set.of()));
        when(purgeService.dryRun(9L))
                .thenReturn(
                        view(
                                new WorkspacePurgeService.CheckpointView(
                                        "OBJECT_STORAGE",
                                        "BLOCKED",
                                        0,
                                        "OBJECT_STORAGE_INVENTORY_FAILED",
                                        "sanitized",
                                        LocalDateTime.now())));

        assertThatThrownBy(() -> runner.run(arguments))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("OBJECT_STORAGE_INVENTORY_FAILED");
    }

    @Test
    void isCreatedOnlyForWorkerRuntime() {
        ApplicationContextRunner contextRunner =
                new ApplicationContextRunner()
                        .withBean(
                                WorkspaceRestoreReconciliationService.class,
                                () -> reconciliationService)
                        .withBean(WorkspacePurgeService.class, () -> purgeService)
                        .withUserConfiguration(WorkspaceRestoreReconciliationRunner.class)
                        .withPropertyValues(
                                "app.workspace-purge.restore-reconciliation-enabled=true");

        contextRunner
                .withPropertyValues("app.runtime-role=api")
                .run(
                        context ->
                                org.assertj.core.api.Assertions.assertThat(context)
                                        .doesNotHaveBean(
                                                WorkspaceRestoreReconciliationRunner.class));
        contextRunner
                .withPropertyValues("app.runtime-role=worker")
                .run(
                        context ->
                                org.assertj.core.api.Assertions.assertThat(context)
                                        .hasSingleBean(WorkspaceRestoreReconciliationRunner.class));
    }

    private WorkspaceRestoreReconciliationService.ReconciliationReport report(
            List<Long> ids, Set<String> blockers) {
        return new WorkspaceRestoreReconciliationService.ReconciliationReport(
                0, 0, 0, 0, ids, blockers);
    }

    private WorkspacePurgeService.PurgeJobView view(
            WorkspacePurgeService.CheckpointView checkpoint) {
        return new WorkspacePurgeService.PurgeJobView(
                9L,
                42L,
                UUID.randomUUID(),
                "BLOCKED",
                LocalDateTime.now(),
                LocalDateTime.now(),
                1,
                "workspace-purge-v1",
                List.of(checkpoint));
    }
}
