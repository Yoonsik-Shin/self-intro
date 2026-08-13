package com.selfintro.modules.identity.infrastructure;

import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryGrpcServiceGrpc;
import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryRequest;
import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryResponse;
import com.selfintro.modules.identity.application.WorkspaceVectorStoragePort;
import java.util.concurrent.TimeUnit;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Component;

@Component
public class GrpcWorkspaceVectorStorageAdapter implements WorkspaceVectorStoragePort {

    private static final long INVENTORY_DEADLINE_SECONDS = 5;

    @GrpcClient("workspaceVectorService")
    private WorkspaceVectorInventoryGrpcServiceGrpc.WorkspaceVectorInventoryGrpcServiceBlockingStub
            inventoryStub;

    @Override
    public WorkspaceVectorInventory inspect(Long workspaceId) {
        if (workspaceId == null || workspaceId <= 0) {
            throw new IllegalArgumentException("workspaceId가 올바르지 않습니다.");
        }
        WorkspaceVectorInventoryResponse response =
                inventoryStub
                        .withDeadlineAfter(INVENTORY_DEADLINE_SECONDS, TimeUnit.SECONDS)
                        .inspectWorkspaceVectors(
                                WorkspaceVectorInventoryRequest.newBuilder()
                                        .setWorkspaceId(workspaceId)
                                        .build());
        return new WorkspaceVectorInventory(
                response.getExperienceVectorCount(), response.getStudyVectorCount());
    }

    @Override
    public WorkspaceVectorPurgeResult purge(Long workspaceId) {
        throw new IllegalStateException("API process does not own Workspace vector deletion.");
    }
}
