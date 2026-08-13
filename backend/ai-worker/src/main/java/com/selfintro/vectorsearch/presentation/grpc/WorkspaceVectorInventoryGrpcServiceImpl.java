package com.selfintro.vectorsearch.presentation.grpc;

import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryGrpcServiceGrpc;
import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryRequest;
import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryResponse;
import com.selfintro.modules.identity.application.WorkspaceVectorStoragePort.WorkspaceVectorInventory;
import com.selfintro.vectorsearch.application.WorkspaceVectorPurgeService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService
@RequiredArgsConstructor
public class WorkspaceVectorInventoryGrpcServiceImpl
        extends WorkspaceVectorInventoryGrpcServiceGrpc
                .WorkspaceVectorInventoryGrpcServiceImplBase {

    private final WorkspaceVectorPurgeService purgeService;

    @Override
    public void inspectWorkspaceVectors(
            WorkspaceVectorInventoryRequest request,
            StreamObserver<WorkspaceVectorInventoryResponse> responseObserver) {
        try {
            WorkspaceVectorInventory inventory = purgeService.inspect(request.getWorkspaceId());
            responseObserver.onNext(
                    WorkspaceVectorInventoryResponse.newBuilder()
                            .setExperienceVectorCount(inventory.experienceVectorCount())
                            .setStudyVectorCount(inventory.studyVectorCount())
                            .build());
            responseObserver.onCompleted();
        } catch (IllegalArgumentException exception) {
            responseObserver.onError(
                    Status.INVALID_ARGUMENT
                            .withDescription("workspace id is invalid")
                            .asRuntimeException());
        } catch (RuntimeException exception) {
            // Oracle/JDBC 원문이나 Workspace 콘텐츠를 API 응답에 노출하지 않는다.
            responseObserver.onError(
                    Status.INTERNAL
                            .withDescription("workspace vector inventory failed")
                            .asRuntimeException());
        }
    }
}
