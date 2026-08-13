package com.selfintro.modules.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryGrpcServiceGrpc;
import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryRequest;
import com.selfintro.grpc.workspacevector.WorkspaceVectorInventoryResponse;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

@EnabledIfSystemProperty(named = "workspaceVectorGrpcIntegration", matches = "true")
class WorkspaceVectorInventoryGrpcIntegrationTest {

    @Test
    void readsWorkspaceInventoryFromRunningComposeWorker() throws InterruptedException {
        String host = System.getProperty("workspaceVectorGrpcHost", "localhost");
        int port = Integer.getInteger("workspaceVectorGrpcPort", 9091);
        long workspaceId = Long.getLong("workspaceVectorGrpcWorkspaceId", 1L);
        ManagedChannel channel =
                ManagedChannelBuilder.forAddress(host, port).usePlaintext().build();
        try {
            WorkspaceVectorInventoryResponse response =
                    WorkspaceVectorInventoryGrpcServiceGrpc.newBlockingStub(channel)
                            .withDeadlineAfter(5, TimeUnit.SECONDS)
                            .inspectWorkspaceVectors(
                                    WorkspaceVectorInventoryRequest.newBuilder()
                                            .setWorkspaceId(workspaceId)
                                            .build());

            assertThat(response.getExperienceVectorCount()).isNotNegative();
            assertThat(response.getStudyVectorCount()).isNotNegative();
        } finally {
            channel.shutdownNow();
            channel.awaitTermination(5, TimeUnit.SECONDS);
        }
    }
}
