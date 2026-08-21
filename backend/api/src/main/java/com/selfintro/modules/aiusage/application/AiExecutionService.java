package com.selfintro.modules.aiusage.application;

import com.selfintro.global.ai.EvidencePacketContext;
import com.selfintro.global.worker.AiWorkerUsageContext;
import com.selfintro.modules.aiusage.application.AiProcessingConsentService.AiProcessingRoute;
import java.util.Objects;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AiExecutionService {

    private final AiProcessingConsentService consentService;
    private final AiUsageLedgerService usageLedgerService;

    @Value("${app.ai.generation-enabled:false}")
    private boolean generationEnabled;

    public <T> T execute(AiExecutionCommand command, Supplier<T> providerCall) {
        Objects.requireNonNull(command, "command");
        Objects.requireNonNull(providerCall, "providerCall");

        if (!generationEnabled) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "비공개 베타에서는 외부 AI 기능을 제공하지 않습니다.");
        }

        AiProcessingRoute route = consentService.requireOrRecord(command);
        AiUsageReservation reservation =
                usageLedgerService.reserve(
                        command.workspaceId(),
                        command.actorUserId(),
                        command.feature(),
                        command.operationCode(),
                        command.sessionKey(),
                        command.refinement(),
                        command.estimatedPoints());
        try {
            usageLedgerService.markProviderCalled(reservation);
            T result = providerCall.get();
            var workerUsage = AiWorkerUsageContext.consume();
            String evidenceHash =
                    workerUsage
                            .map(AiWorkerUsageContext.Usage::evidenceSnapshotHash)
                            .orElseGet(() -> EvidencePacketContext.consume().orElse(null));
            usageLedgerService.commit(
                    reservation,
                    new AiUsageResult(
                            workerUsage
                                    .map(AiWorkerUsageContext.Usage::provider)
                                    .orElse(route.provider()),
                            workerUsage.map(AiWorkerUsageContext.Usage::model).orElse(null),
                            route.region(),
                            workerUsage.map(AiWorkerUsageContext.Usage::inputTokens).orElse(0L),
                            workerUsage
                                    .map(AiWorkerUsageContext.Usage::cachedInputTokens)
                                    .orElse(0L),
                            workerUsage.map(AiWorkerUsageContext.Usage::outputTokens).orElse(0L),
                            0,
                            command.estimatedPoints(),
                            null,
                            null,
                            null,
                            evidenceHash));
            return result;
        } catch (RuntimeException exception) {
            AiWorkerUsageContext.clear();
            EvidencePacketContext.clear();
            usageLedgerService.release(reservation, "PROVIDER_OR_WORKER_FAILURE", false);
            throw exception;
        }
    }

    public void executeVoid(AiExecutionCommand command, Runnable providerCall) {
        execute(
                command,
                () -> {
                    providerCall.run();
                    return Boolean.TRUE;
                });
    }
}
