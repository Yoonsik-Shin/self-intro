package com.selfintro.modules.aiusage.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.application.PlatformOwnerPreviewPolicy;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AiExecutionServiceTest {

    @Mock private AiProcessingConsentService consentService;
    @Mock private AiUsageLedgerService usageLedgerService;
    @Mock private PlatformOwnerPreviewPolicy previewPolicy;

    @Test
    void disabledGenerationRejectsBeforeConsentLedgerAndProviderCall() {
        AiExecutionService service =
                new AiExecutionService(consentService, usageLedgerService, previewPolicy);
        ReflectionTestUtils.setField(service, "generationEnabled", false);
        AtomicBoolean providerCalled = new AtomicBoolean(false);
        AiExecutionCommand command =
                new AiExecutionCommand(
                        1L,
                        2L,
                        AiFeature.EXPERIENCE,
                        "DRAFT",
                        100,
                        "2026-08-21",
                        Set.of("CAREER_EVIDENCE"));

        assertThatThrownBy(
                        () ->
                                service.execute(
                                        command,
                                        () -> {
                                            providerCalled.set(true);
                                            return "result";
                                        }))
                .isInstanceOfSatisfying(
                        ResponseStatusException.class,
                        exception -> {
                            assertThat(exception.getStatusCode())
                                    .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                            assertThat(exception.getReason())
                                    .isEqualTo("비공개 베타에서는 외부 AI 기능을 제공하지 않습니다.");
                        });
        assertThat(providerCalled).isFalse();
        verifyNoInteractions(consentService, usageLedgerService);
    }

    @Test
    void platformOwnerPreviewRunsWithConsentAndUsageEnforcement() {
        AiExecutionService service =
                new AiExecutionService(consentService, usageLedgerService, previewPolicy);
        ReflectionTestUtils.setField(service, "generationEnabled", false);
        AiExecutionCommand command =
                new AiExecutionCommand(
                        1L,
                        2L,
                        AiFeature.EXPERIENCE,
                        "DRAFT",
                        100,
                        "2026-08-21",
                        Set.of("CAREER_EVIDENCE"));
        AiUsageReservation reservation =
                new AiUsageReservation(
                        3L,
                        UUID.randomUUID(),
                        1L,
                        2L,
                        AiFeature.EXPERIENCE,
                        "DRAFT",
                        "2026-08-21",
                        100,
                        100,
                        true,
                        "2026-08-21",
                        "2026-08-21");
        when(previewPolicy.isAllowed(2L, 1L)).thenReturn(true);
        when(consentService.requireOrRecord(command, true))
                .thenReturn(
                        new AiProcessingConsentService.AiProcessingRoute(
                                "NVIDIA", "PLATFORM_DEFAULT", "PLATFORM_MANAGED"));
        when(usageLedgerService.reserve(
                        1L, 2L, AiFeature.EXPERIENCE, "DRAFT", "DRAFT", false, 100, true))
                .thenReturn(reservation);

        String result = service.execute(command, () -> "result");

        assertThat(result).isEqualTo("result");
        verify(usageLedgerService).markProviderCalled(reservation);
        verify(usageLedgerService).commit(eq(reservation), any(AiUsageResult.class));
    }
}
