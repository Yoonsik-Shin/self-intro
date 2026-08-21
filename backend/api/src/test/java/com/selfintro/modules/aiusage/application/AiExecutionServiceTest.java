package com.selfintro.modules.aiusage.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.Set;
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

    @Test
    void disabledGenerationRejectsBeforeConsentLedgerAndProviderCall() {
        AiExecutionService service = new AiExecutionService(consentService, usageLedgerService);
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
}
