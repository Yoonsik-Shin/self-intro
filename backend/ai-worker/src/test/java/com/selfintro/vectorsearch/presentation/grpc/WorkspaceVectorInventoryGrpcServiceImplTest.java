package com.selfintro.vectorsearch.presentation.grpc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryRequest;
import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryResponse;
import com.selfintro.modules.identity.application.WorkspaceVectorStoragePort.WorkspaceVectorInventory;
import com.selfintro.vectorsearch.application.WorkspaceVectorPurgeService;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.StreamObserver;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class WorkspaceVectorInventoryGrpcServiceImplTest {

    private final WorkspaceVectorPurgeService purgeService =
            mock(WorkspaceVectorPurgeService.class);
    private final WorkspaceVectorInventoryGrpcServiceImpl service =
            new WorkspaceVectorInventoryGrpcServiceImpl(purgeService);

    @Test
    void returnsOnlyWorkspaceVectorCounts() {
        when(purgeService.inspect(42L)).thenReturn(new WorkspaceVectorInventory(3, 5));
        StreamObserver<WorkspaceVectorInventoryResponse> observer = responseObserver();

        service.inspectWorkspaceVectors(request(42L), observer);

        ArgumentCaptor<WorkspaceVectorInventoryResponse> response =
                ArgumentCaptor.forClass(WorkspaceVectorInventoryResponse.class);
        verify(observer).onNext(response.capture());
        verify(observer).onCompleted();
        assertThat(response.getValue().getExperienceVectorCount()).isEqualTo(3);
        assertThat(response.getValue().getStudyVectorCount()).isEqualTo(5);
    }

    @Test
    void mapsInvalidWorkspaceIdWithoutLeakingDetails() {
        when(purgeService.inspect(0L))
                .thenThrow(new IllegalArgumentException("internal id detail"));
        StreamObserver<WorkspaceVectorInventoryResponse> observer = responseObserver();

        service.inspectWorkspaceVectors(request(0L), observer);

        ArgumentCaptor<Throwable> error = ArgumentCaptor.forClass(Throwable.class);
        verify(observer).onError(error.capture());
        StatusRuntimeException exception = (StatusRuntimeException) error.getValue();
        assertThat(exception.getStatus().getCode()).isEqualTo(Status.Code.INVALID_ARGUMENT);
        assertThat(exception.getStatus().getDescription()).isEqualTo("workspace id is invalid");
    }

    @Test
    void sanitizesProviderFailure() {
        when(purgeService.inspect(42L))
                .thenThrow(new IllegalStateException("jdbc:oracle:thin:@secret-host/content"));
        StreamObserver<WorkspaceVectorInventoryResponse> observer = responseObserver();

        service.inspectWorkspaceVectors(request(42L), observer);

        ArgumentCaptor<Throwable> error = ArgumentCaptor.forClass(Throwable.class);
        verify(observer).onError(error.capture());
        StatusRuntimeException exception = (StatusRuntimeException) error.getValue();
        assertThat(exception.getStatus().getCode()).isEqualTo(Status.Code.INTERNAL);
        assertThat(exception.getStatus().getDescription())
                .isEqualTo("workspace vector inventory failed");
        assertThat(exception.getMessage()).doesNotContain("secret-host", "content");
    }

    private WorkspaceVectorInventoryRequest request(long workspaceId) {
        return WorkspaceVectorInventoryRequest.newBuilder().setWorkspaceId(workspaceId).build();
    }

    @SuppressWarnings("unchecked")
    private StreamObserver<WorkspaceVectorInventoryResponse> responseObserver() {
        return mock(StreamObserver.class);
    }
}
