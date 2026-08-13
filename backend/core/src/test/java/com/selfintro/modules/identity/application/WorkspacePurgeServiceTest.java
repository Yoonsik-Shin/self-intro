package com.selfintro.modules.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpoint;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpointRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeJob;
import com.selfintro.modules.identity.domain.WorkspacePurgeJobRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeStore;
import com.selfintro.modules.storage.application.ObjectStoragePort;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class WorkspacePurgeServiceTest {

    @Mock private WorkspacePurgeJobRepository jobRepository;
    @Mock private WorkspacePurgeCheckpointRepository checkpointRepository;
    @Mock private ObjectStoragePort objectStoragePort;
    @Mock private WorkspaceVectorStoragePort vectorStoragePort;
    @Mock private WorkspaceCacheStoragePort cacheStoragePort;
    @Mock private WorkspaceNoSqlStoragePort noSqlStoragePort;
    @Mock private WorkspaceRelationalStoragePort relationalStoragePort;

    private WorkspacePurgeService service;
    private WorkspacePurgeJob job;
    private List<WorkspacePurgeCheckpoint> checkpoints;

    @BeforeEach
    void setUp() {
        service =
                new WorkspacePurgeService(
                        jobRepository,
                        checkpointRepository,
                        objectStoragePort,
                        vectorStoragePort,
                        cacheStoragePort,
                        noSqlStoragePort,
                        relationalStoragePort);
        Workspace workspace = Workspace.createPrivatePersonal("테스트 Workspace");
        ReflectionTestUtils.setField(workspace, "id", 42L);
        LocalDateTime now = LocalDateTime.now();
        workspace.close(7L, now, now.plusDays(30));
        job = WorkspacePurgeJob.schedule(workspace, 7L, now);
        ReflectionTestUtils.setField(job, "id", 9L);

        Map<WorkspacePurgeStore, WorkspacePurgeCheckpoint> byStore =
                new EnumMap<>(WorkspacePurgeStore.class);
        for (WorkspacePurgeStore store : WorkspacePurgeStore.values()) {
            WorkspacePurgeCheckpoint checkpoint = WorkspacePurgeCheckpoint.pending(9L, store, now);
            ReflectionTestUtils.setField(checkpoint, "id", (long) store.ordinal() + 1);
            byStore.put(store, checkpoint);
        }
        checkpoints = new ArrayList<>(byStore.values());
        when(jobRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(job));
        when(checkpointRepository.findAllByPurgeJobIdOrderByStoreTypeAsc(9L))
                .thenReturn(checkpoints);
        byStore.forEach(
                (store, checkpoint) ->
                        when(checkpointRepository.findByPurgeJobIdAndStoreType(9L, store))
                                .thenReturn(Optional.of(checkpoint)));
        when(vectorStoragePort.inspect(42L))
                .thenReturn(new WorkspaceVectorStoragePort.WorkspaceVectorInventory(0, 0));
        when(cacheStoragePort.inspect(42L))
                .thenReturn(new WorkspaceCacheStoragePort.WorkspaceCacheInventory(0, 0));
        when(noSqlStoragePort.inspectCatalogBoundary())
                .thenReturn(
                        new WorkspaceNoSqlStoragePort.NoSqlCatalogInventory(
                                "JobPostingCatalogReadModel", 0, true, 0));
        org.mockito.Mockito.lenient()
                .when(
                        relationalStoragePort.inspect(
                                org.mockito.ArgumentMatchers.eq(42L),
                                org.mockito.ArgumentMatchers.any()))
                .thenReturn(mysqlInventory(0, 0, 0, 1));
    }

    @Test
    void dryRunClassifiesMysqlButBlocksAllStoresUntilDeleteAdaptersAreVerified() {
        when(relationalStoragePort.inspect(
                        org.mockito.ArgumentMatchers.eq(42L), org.mockito.ArgumentMatchers.any()))
                .thenReturn(mysqlInventory(18, 1, 1, 1));
        when(objectStoragePort.inspectPrefix("workspaces/42/"))
                .thenReturn(new ObjectStoragePort.PrefixInventory(2, 1, 4096, 4, 8192, 2, 1));
        when(vectorStoragePort.inspect(42L))
                .thenReturn(new WorkspaceVectorStoragePort.WorkspaceVectorInventory(3, 5));
        when(cacheStoragePort.inspect(42L))
                .thenReturn(new WorkspaceCacheStoragePort.WorkspaceCacheInventory(4, 2));

        WorkspacePurgeService.PurgeJobView result = service.dryRun(9L);

        assertThat(result.status()).isEqualTo("BLOCKED");
        assertThat(result.blockerCount()).isEqualTo(4);
        assertThat(result.checkpoints()).hasSize(5);
        assertThat(result.checkpoints())
                .filteredOn(view -> view.store().equals(WorkspacePurgeStore.ORACLE_NOSQL.name()))
                .singleElement()
                .satisfies(
                        view -> {
                            assertThat(view.status()).isEqualTo("READY");
                            assertThat(view.candidateCount()).isZero();
                            assertThat(view.blockerCode()).isNull();
                            assertThat(view.summary()).contains("공통 채용공고 catalog", "삭제 대상 제외");
                        });
        assertThat(result.checkpoints())
                .filteredOn(view -> view.store().equals(WorkspacePurgeStore.REDIS_CACHE.name()))
                .singleElement()
                .satisfies(
                        view -> {
                            assertThat(view.candidateCount()).isEqualTo(6);
                            assertThat(view.blockerCode()).isEqualTo("CACHE_DELETE_NOT_ENABLED");
                            assertThat(view.summary())
                                    .contains("Workspace key 4개", "레거시 공유 namespace key 2개");
                        });
        assertThat(result.checkpoints())
                .filteredOn(view -> view.store().equals(WorkspacePurgeStore.ORACLE_VECTOR.name()))
                .singleElement()
                .satisfies(
                        view -> {
                            assertThat(view.candidateCount()).isEqualTo(8);
                            assertThat(view.blockerCode()).isEqualTo("VECTOR_DELETE_NOT_ENABLED");
                            assertThat(view.summary()).contains("경험 vector 3개", "학습 vector 5개");
                        });
        assertThat(result.checkpoints())
                .filteredOn(view -> view.store().equals(WorkspacePurgeStore.MYSQL_PRIMARY.name()))
                .singleElement()
                .satisfies(
                        view -> {
                            assertThat(view.candidateCount()).isEqualTo(20);
                            assertThat(view.blockerCode()).isEqualTo("MYSQL_DELETE_NOT_ENABLED");
                            assertThat(view.summary())
                                    .contains("CASCADE 대상 18행", "선삭제 초대 1행", "가명화 감사 1행");
                        });
        assertThat(result.checkpoints())
                .filteredOn(view -> view.store().equals(WorkspacePurgeStore.OBJECT_STORAGE.name()))
                .singleElement()
                .satisfies(
                        view -> {
                            assertThat(view.candidateCount()).isEqualTo(10);
                            assertThat(view.blockerCode())
                                    .isEqualTo("OBJECT_STORAGE_DELETE_NOT_ENABLED");
                            assertThat(view.summary()).doesNotContain("workspaces/42");
                            assertThat(view.summary())
                                    .contains(
                                            "이전 version 4개/8192 bytes",
                                            "delete marker 2개",
                                            "미완료 multipart 1개");
                        });
    }

    @Test
    void dryRunFailsClosedWhenUnknownWorkspaceTableAppears() {
        when(relationalStoragePort.inspect(
                        org.mockito.ArgumentMatchers.eq(42L), org.mockito.ArgumentMatchers.any()))
                .thenReturn(
                        new WorkspaceRelationalStoragePort.WorkspaceRelationalInventory(
                                0,
                                0,
                                0,
                                1,
                                true,
                                true,
                                false,
                                java.util.Set.of("unclassified_workspace_secret"),
                                java.util.Set.of(),
                                java.util.Set.of()));
        when(objectStoragePort.inspectPrefix("workspaces/42/"))
                .thenReturn(new ObjectStoragePort.PrefixInventory(0, 0, 0, 0, 0, 0, 0));

        WorkspacePurgeService.PurgeJobView result = service.dryRun(9L);

        assertThat(result.checkpoints())
                .filteredOn(view -> view.store().equals(WorkspacePurgeStore.MYSQL_PRIMARY.name()))
                .singleElement()
                .satisfies(
                        view ->
                                assertThat(view.blockerCode())
                                        .isEqualTo("MYSQL_SCHEMA_INVENTORY_DRIFT"));
    }

    @Test
    void objectStorageFailureIsSanitizedAndFailsClosed() {
        when(objectStoragePort.inspectPrefix("workspaces/42/"))
                .thenThrow(new IllegalStateException("secret-bucket/workspaces/42/private.pdf"));

        WorkspacePurgeService.PurgeJobView result = service.dryRun(9L);

        assertThat(result.checkpoints())
                .filteredOn(view -> view.store().equals(WorkspacePurgeStore.OBJECT_STORAGE.name()))
                .singleElement()
                .satisfies(
                        view -> {
                            assertThat(view.blockerCode())
                                    .isEqualTo("OBJECT_STORAGE_INVENTORY_FAILED");
                            assertThat(view.summary())
                                    .doesNotContain(
                                            "secret-bucket", "private.pdf", "workspaces/42");
                        });
    }

    @Test
    void vectorInventoryFailureIsSanitizedAndFailsClosed() {
        when(objectStoragePort.inspectPrefix("workspaces/42/"))
                .thenReturn(new ObjectStoragePort.PrefixInventory(0, 0, 0, 0, 0, 0, 0));
        when(vectorStoragePort.inspect(42L))
                .thenThrow(new IllegalStateException("jdbc:oracle:thin:@private-host/secret"));

        WorkspacePurgeService.PurgeJobView result = service.dryRun(9L);

        assertThat(result.checkpoints())
                .filteredOn(view -> view.store().equals(WorkspacePurgeStore.ORACLE_VECTOR.name()))
                .singleElement()
                .satisfies(
                        view -> {
                            assertThat(view.blockerCode()).isEqualTo("VECTOR_INVENTORY_FAILED");
                            assertThat(view.summary())
                                    .doesNotContain("private-host", "secret", "jdbc:oracle");
                        });
    }

    @Test
    void cacheInventoryFailureIsSanitizedAndFailsClosed() {
        when(objectStoragePort.inspectPrefix("workspaces/42/"))
                .thenReturn(new ObjectStoragePort.PrefixInventory(0, 0, 0, 0, 0, 0, 0));
        when(cacheStoragePort.inspect(42L))
                .thenThrow(new IllegalStateException("redis://private-host/workspace:secret"));

        WorkspacePurgeService.PurgeJobView result = service.dryRun(9L);

        assertThat(result.checkpoints())
                .filteredOn(view -> view.store().equals(WorkspacePurgeStore.REDIS_CACHE.name()))
                .singleElement()
                .satisfies(
                        view -> {
                            assertThat(view.blockerCode()).isEqualTo("CACHE_INVENTORY_FAILED");
                            assertThat(view.summary())
                                    .doesNotContain("private-host", "secret", "redis://");
                        });
    }

    @Test
    void noSqlLegacyPersonalizationKeepsPurgeBlocked() {
        when(objectStoragePort.inspectPrefix("workspaces/42/"))
                .thenReturn(new ObjectStoragePort.PrefixInventory(0, 0, 0, 0, 0, 0, 0));
        when(noSqlStoragePort.inspectCatalogBoundary())
                .thenReturn(
                        new WorkspaceNoSqlStoragePort.NoSqlCatalogInventory(
                                "JobPostingCatalogReadModel", 3, true, 2));

        WorkspacePurgeService.PurgeJobView result = service.dryRun(9L);

        assertThat(result.checkpoints())
                .filteredOn(view -> view.store().equals(WorkspacePurgeStore.ORACLE_NOSQL.name()))
                .singleElement()
                .satisfies(
                        view -> {
                            assertThat(view.status()).isEqualTo("BLOCKED");
                            assertThat(view.candidateCount()).isEqualTo(2);
                            assertThat(view.blockerCode())
                                    .isEqualTo("NOSQL_LEGACY_PERSONALIZATION_PRESENT");
                        });
    }

    @Test
    void noSqlInventoryFailureIsSanitizedAndFailsClosed() {
        when(objectStoragePort.inspectPrefix("workspaces/42/"))
                .thenReturn(new ObjectStoragePort.PrefixInventory(0, 0, 0, 0, 0, 0, 0));
        when(noSqlStoragePort.inspectCatalogBoundary())
                .thenThrow(new IllegalStateException("https://private-nosql.example/secret"));

        WorkspacePurgeService.PurgeJobView result = service.dryRun(9L);

        assertThat(result.checkpoints())
                .filteredOn(view -> view.store().equals(WorkspacePurgeStore.ORACLE_NOSQL.name()))
                .singleElement()
                .satisfies(
                        view -> {
                            assertThat(view.blockerCode())
                                    .isEqualTo("NOSQL_CATALOG_INVENTORY_FAILED");
                            assertThat(view.summary())
                                    .doesNotContain("private-nosql", "secret", "https://");
                        });
    }

    @Test
    void enabledAdaptersMakeElapsedJobReadyAndCompletedCheckpointIsNotReinspected() {
        ReflectionTestUtils.setField(job, "eligibleAt", LocalDateTime.now().minusDays(1));
        ReflectionTestUtils.setField(service, "objectStorageDeleteEnabled", true);
        ReflectionTestUtils.setField(service, "vectorDeleteEnabled", true);
        ReflectionTestUtils.setField(service, "cacheDeleteEnabled", true);
        ReflectionTestUtils.setField(service, "mysqlDeleteEnabled", true);
        WorkspacePurgeCheckpoint objectCheckpoint =
                checkpoints.stream()
                        .filter(
                                checkpoint ->
                                        checkpoint.getStoreType()
                                                == WorkspacePurgeStore.OBJECT_STORAGE)
                        .findFirst()
                        .orElseThrow();
        objectCheckpoint.completed("already purged", LocalDateTime.now().minusHours(1));

        WorkspacePurgeService.PurgeJobView result = service.dryRun(9L);

        assertThat(result.status()).isEqualTo("READY");
        assertThat(result.blockerCount()).isZero();
        assertThat(result.checkpoints())
                .filteredOn(view -> view.store().equals(WorkspacePurgeStore.OBJECT_STORAGE.name()))
                .singleElement()
                .satisfies(
                        view -> {
                            assertThat(view.status()).isEqualTo("COMPLETED");
                            assertThat(view.summary()).isEqualTo("already purged");
                        });
        org.mockito.Mockito.verifyNoInteractions(objectStoragePort);
    }

    private static WorkspaceRelationalStoragePort.WorkspaceRelationalInventory mysqlInventory(
            long cascade, long invitations, long audits, long controls) {
        return new WorkspaceRelationalStoragePort.WorkspaceRelationalInventory(
                cascade,
                invitations,
                audits,
                controls,
                true,
                true,
                false,
                java.util.Set.of(),
                java.util.Set.of(),
                java.util.Set.of());
    }
}
