package com.selfintro.global.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 업무 데이터 변경과 같은 DB transaction에 발행 대상을 기록한다. 실제 RabbitMQ 발행은 {@link TransactionalOutboxRelay}가
 * 담당한다.
 */
@Component
@RequiredArgsConstructor
public class AfterCommitRabbitEventPublisher {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    @Value("${messaging.outbox.enabled:true}")
    private boolean enabled = true;

    public void publish(String exchange, String routingKey, Object event) {
        if (!enabled) {
            return;
        }
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Transactional outbox 기록에는 활성 DB transaction이 필요합니다.");
        }
        try {
            jdbcTemplate.update(
                    """
                    INSERT INTO message_outbox
                        (id, exchange_name, routing_key, event_type, payload, status,
                         attempts, next_attempt_at, created_at)
                    VALUES (?, ?, ?, ?, ?, 'PENDING', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """,
                    UUID.randomUUID().toString(),
                    exchange,
                    routingKey,
                    event.getClass().getName(),
                    objectMapper.writeValueAsString(event));
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Outbox event 직렬화에 실패했습니다.", exception);
        }
    }
}
