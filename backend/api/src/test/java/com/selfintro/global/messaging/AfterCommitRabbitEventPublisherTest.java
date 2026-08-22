package com.selfintro.global.messaging;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class AfterCommitRabbitEventPublisherTest {

    @Mock private JdbcTemplate jdbcTemplate;

    @AfterEach
    void cleanUpTransactionState() {
        TransactionSynchronizationManager.setActualTransactionActive(false);
    }

    @Test
    void recordsEventInsideActiveTransaction() {
        AfterCommitRabbitEventPublisher publisher =
                new AfterCommitRabbitEventPublisher(jdbcTemplate, new ObjectMapper());
        TransactionSynchronizationManager.setActualTransactionActive(true);

        publisher.publish("exchange", "route", new TestEvent(1));

        verify(jdbcTemplate)
                .update(
                        any(String.class),
                        any(),
                        eq("exchange"),
                        eq("route"),
                        eq(TestEvent.class.getName()),
                        eq("{\"id\":1}"));
    }

    @Test
    void rejectsPublishWithoutActiveTransaction() {
        AfterCommitRabbitEventPublisher publisher =
                new AfterCommitRabbitEventPublisher(jdbcTemplate, new ObjectMapper());

        assertThatThrownBy(() -> publisher.publish("exchange", "route", new TestEvent(1)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("transaction");
    }

    private record TestEvent(int id) {}
}
