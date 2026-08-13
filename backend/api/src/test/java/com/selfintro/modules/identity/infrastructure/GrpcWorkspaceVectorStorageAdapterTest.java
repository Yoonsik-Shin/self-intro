package com.selfintro.modules.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryGrpcServiceGrpc;
import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryRequest;
import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryResponse;
import com.selfintro.modules.identity.application.WorkspaceVectorStoragePort.WorkspaceVectorInventory;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class GrpcWorkspaceVectorStorageAdapterTest {

    private WorkspaceVectorInventoryGrpcServiceGrpc.WorkspaceVectorInventoryGrpcServiceBlockingStub
            inventoryStub;
    private GrpcWorkspaceVectorStorageAdapter adapter;

    @BeforeEach
    void setUp() {
        inventoryStub =
                mock(
                        WorkspaceVectorInventoryGrpcServiceGrpc
                                .WorkspaceVectorInventoryGrpcServiceBlockingStub.class);
        adapter = new GrpcWorkspaceVectorStorageAdapter();
        ReflectionTestUtils.setField(adapter, "inventoryStub", inventoryStub);
    }

    @Test
    void readsCountsWithBoundedDeadline() {
        when(inventoryStub.withDeadlineAfter(5, TimeUnit.SECONDS)).thenReturn(inventoryStub);
        when(inventoryStub.inspectWorkspaceVectors(any(WorkspaceVectorInventoryRequest.class)))
                .thenReturn(
                        WorkspaceVectorInventoryResponse.newBuilder()
                                .setExperienceVectorCount(3)
                                .setStudyVectorCount(5)
                                .build());

        WorkspaceVectorInventory inventory = adapter.inspect(42L);

        assertThat(inventory.experienceVectorCount()).isEqualTo(3);
        assertThat(inventory.studyVectorCount()).isEqualTo(5);
        verify(inventoryStub).withDeadlineAfter(5, TimeUnit.SECONDS);
        verify(inventoryStub)
                .inspectWorkspaceVectors(
                        WorkspaceVectorInventoryRequest.newBuilder().setWorkspaceId(42L).build());
    }

    @Test
    void rejectsInvalidWorkspaceBeforeCallingWorker() {
        assertThatThrownBy(() -> adapter.inspect(0L)).isInstanceOf(IllegalArgumentException.class);

        verify(inventoryStub, never()).withDeadlineAfter(anyLong(), any(TimeUnit.class));
    }

    @Test
    void refusesVectorDeletionInApiProcess() {
        assertThatThrownBy(() -> adapter.purge(42L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("does not own");
    }
}
