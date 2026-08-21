package com.selfintro.modules.aiusage.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AiUsageLedgerServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;

    @Test
    void zeroReservationNeverCreatesByokOrFreeSessionCharge() {
        AiUsageLedgerService service = new AiUsageLedgerService(jdbcTemplate);
        ReflectionTestUtils.setField(service, "enforcementEnabled", true);
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
        AiUsageReservation reservation =
                new AiUsageReservation(
                        3L,
                        UUID.randomUUID(),
                        7L,
                        11L,
                        AiFeature.EXPERIENCE,
                        "DRAFT",
                        "session-key",
                        100,
                        0,
                        true,
                        "2026-08-21",
                        "2026-08-21");

        service.commit(
                reservation,
                new AiUsageResult(
                        "OPENAI",
                        "gpt-5.4-mini",
                        "GLOBAL",
                        100,
                        0,
                        50,
                        0,
                        100,
                        null,
                        null,
                        null,
                        "hash"));

        ArgumentCaptor<Object[]> arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(contains("UPDATE ai_usage"), arguments.capture());
        assertThat(arguments.getValue()[4]).isEqualTo(0);
    }
}
