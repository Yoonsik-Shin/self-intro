package com.selfintro.modules.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.application.WorkspacePurgeExecutionStateService.ClaimedPurgeJob;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpointStatus;
import com.selfintro.modules.identity.domain.WorkspacePurgeStore;
import com.selfintro.modules.storage.application.ObjectStoragePort;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WorkspacePurgeExecutorTest {

    @Mock private WorkspacePurgeExecutionStateService stateService;
    @Mock private ObjectStoragePort objectStoragePort;
    @Mock private WorkspaceVectorStoragePort vectorStoragePort;
    @Mock private WorkspaceCacheStoragePort cacheStoragePort;
    @Mock private WorkspaceNoSqlStoragePort noSqlStoragePort;
    @Mock private WorkspaceRelationalStoragePort relationalStoragePort;

    private WorkspacePurgeExecutor executor;
    private LocalDateTime now;
    private LocalDateTime staleBefore;

    @BeforeEach
    void setUp() {
        executor =
                new WorkspacePurgeExecutor(
                        stateService,
                        objectStoragePort,
                        vectorStoragePort,
                        cacheStoragePort,
                        noSqlStoragePort,
                        relationalStoragePort);
        now = LocalDateTime.of(2026, 8, 11, 10, 0);
        staleBefore = now.minusMinutes(30);
        org.mockito.Mockito.lenient()
                .when(relationalStoragePort.inspect(42L, now))
                .thenReturn(safeRelationalInventory());
        org.mockito.Mockito.lenient()
                .when(noSqlStoragePort.inspectCatalogBoundary())
                .thenReturn(
                        new WorkspaceNoSqlStoragePort.NoSqlCatalogInventory(
                                "JobPostingCatalogReadModel", 0, true, 0));
    }

    @Test
    void executesProviderNeutralStoresInOrderAndDeletesMysqlLast() {
        when(stateService.claim(9L, now, staleBefore)).thenReturn(claimed(allReady()));
        when(objectStoragePort.purgePrefix("workspaces/42/"))
                .thenReturn(new ObjectStoragePort.PrefixPurgeResult(1, 2, 3));
        when(vectorStoragePort.purge(42L))
                .thenReturn(new WorkspaceVectorStoragePort.WorkspaceVectorPurgeResult(4, 5));
        when(cacheStoragePort.purge(42L))
                .thenReturn(new WorkspaceCacheStoragePort.WorkspaceCachePurgeResult(6));
        when(relationalStoragePort.purge(42L, now))
                .thenReturn(
                        new WorkspaceRelationalStoragePort.WorkspaceRelationalPurgeResult(
                                1, 2, 1, 1));

        assertThat(executor.execute(9L, now, staleBefore)).isTrue();

        InOrder order =
                inOrder(
                        stateService,
                        objectStoragePort,
                        vectorStoragePort,
                        cacheStoragePort,
                        noSqlStoragePort,
                        relationalStoragePort);
        order.verify(stateService).claim(9L, now, staleBefore);
        order.verify(stateService)
                .markCheckpointCompleted(
                        eq(9L), eq(1), eq(WorkspacePurgeStore.ORACLE_NOSQL), anyString(), any());
        order.verify(objectStoragePort).purgePrefix("workspaces/42/");
        order.verify(stateService)
                .markCheckpointCompleted(
                        eq(9L), eq(1), eq(WorkspacePurgeStore.OBJECT_STORAGE), anyString(), any());
        order.verify(vectorStoragePort).purge(42L);
        order.verify(stateService)
                .markCheckpointCompleted(
                        eq(9L), eq(1), eq(WorkspacePurgeStore.ORACLE_VECTOR), anyString(), any());
        order.verify(cacheStoragePort).purge(42L);
        order.verify(stateService)
                .markCheckpointCompleted(
                        eq(9L), eq(1), eq(WorkspacePurgeStore.REDIS_CACHE), anyString(), any());
        order.verify(relationalStoragePort).purge(42L, now);
        order.verify(stateService)
                .markCheckpointCompleted(
                        eq(9L), eq(1), eq(WorkspacePurgeStore.MYSQL_PRIMARY), anyString(), any());
        order.verify(stateService).markCompleted(eq(9L), eq(1), any());
    }

    @Test
    void retrySkipsCompletedCheckpointsAndResumesAtFailedStore() {
        Map<WorkspacePurgeStore, WorkspacePurgeCheckpointStatus> statuses = allReady();
        statuses.put(WorkspacePurgeStore.ORACLE_NOSQL, WorkspacePurgeCheckpointStatus.COMPLETED);
        statuses.put(WorkspacePurgeStore.OBJECT_STORAGE, WorkspacePurgeCheckpointStatus.COMPLETED);
        statuses.put(WorkspacePurgeStore.ORACLE_VECTOR, WorkspacePurgeCheckpointStatus.FAILED);
        when(stateService.claim(9L, now, staleBefore)).thenReturn(claimed(statuses));
        when(vectorStoragePort.purge(42L))
                .thenReturn(new WorkspaceVectorStoragePort.WorkspaceVectorPurgeResult(0, 0));
        when(cacheStoragePort.purge(42L))
                .thenReturn(new WorkspaceCacheStoragePort.WorkspaceCachePurgeResult(0));
        when(relationalStoragePort.purge(42L, now))
                .thenReturn(
                        new WorkspaceRelationalStoragePort.WorkspaceRelationalPurgeResult(
                                0, 0, 1, 1));

        assertThat(executor.execute(9L, now, staleBefore)).isTrue();

        verify(objectStoragePort, never()).purgePrefix(anyString());
        verify(vectorStoragePort).purge(42L);
        verify(relationalStoragePort).purge(42L, now);
    }

    @Test
    void providerFailureMarksOnlyCurrentCheckpointAndStopsBeforeMysql() {
        when(stateService.claim(9L, now, staleBefore)).thenReturn(claimed(allReady()));
        when(objectStoragePort.purgePrefix("workspaces/42/"))
                .thenReturn(new ObjectStoragePort.PrefixPurgeResult(0, 0, 0));
        when(vectorStoragePort.purge(42L)).thenThrow(new IllegalStateException("secret JDBC URL"));

        assertThat(executor.execute(9L, now, staleBefore)).isFalse();

        verify(stateService)
                .markCheckpointFailed(
                        eq(9L),
                        eq(1),
                        eq(WorkspacePurgeStore.ORACLE_VECTOR),
                        eq("PURGE_ORACLE_VECTOR_FAILED"),
                        eq("Provider deletion failed; provider error details were not persisted."),
                        any());
        verify(cacheStoragePort, never()).purge(42L);
        verify(relationalStoragePort, never()).purge(eq(42L), any());
        verify(stateService, never()).markCompleted(eq(9L), eq(1), any());
    }

    @Test
    void relationalPreflightFailureStopsBeforeAnyExternalDeletion() {
        when(stateService.claim(9L, now, staleBefore)).thenReturn(claimed(allReady()));
        when(relationalStoragePort.inspect(42L, now))
                .thenReturn(
                        new WorkspaceRelationalStoragePort.WorkspaceRelationalInventory(
                                1,
                                0,
                                0,
                                1,
                                true,
                                false,
                                true,
                                java.util.Set.of(),
                                java.util.Set.of(),
                                java.util.Set.of()));

        assertThat(executor.execute(9L, now, staleBefore)).isFalse();

        verify(stateService)
                .markCheckpointFailed(
                        eq(9L),
                        eq(1),
                        eq(WorkspacePurgeStore.MYSQL_PRIMARY),
                        eq("PURGE_MYSQL_PREFLIGHT_FAILED"),
                        anyString(),
                        any());
        verify(objectStoragePort, never()).purgePrefix(anyString());
        verify(vectorStoragePort, never()).purge(42L);
    }

    private ClaimedPurgeJob claimed(
            Map<WorkspacePurgeStore, WorkspacePurgeCheckpointStatus> statuses) {
        return new ClaimedPurgeJob(9L, 42L, 1, statuses);
    }

    private Map<WorkspacePurgeStore, WorkspacePurgeCheckpointStatus> allReady() {
        Map<WorkspacePurgeStore, WorkspacePurgeCheckpointStatus> statuses =
                new EnumMap<>(WorkspacePurgeStore.class);
        for (WorkspacePurgeStore store : WorkspacePurgeStore.values()) {
            statuses.put(store, WorkspacePurgeCheckpointStatus.READY);
        }
        return statuses;
    }

    private WorkspaceRelationalStoragePort.WorkspaceRelationalInventory safeRelationalInventory() {
        return new WorkspaceRelationalStoragePort.WorkspaceRelationalInventory(
                1,
                0,
                0,
                1,
                true,
                true,
                true,
                java.util.Set.of(),
                java.util.Set.of(),
                java.util.Set.of());
    }
}
