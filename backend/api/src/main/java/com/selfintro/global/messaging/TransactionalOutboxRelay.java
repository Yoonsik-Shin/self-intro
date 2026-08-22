package com.selfintro.global.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.experience.event.ExperienceUpdatedEvent;
import com.selfintro.modules.study.event.StudyUpdatedEvent;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnProperty(
        name = "messaging.outbox.enabled",
        havingValue = "true",
        matchIfMissing = true)
@RequiredArgsConstructor
public class TransactionalOutboxRelay {
    private static final Map<String, Class<?>> ALLOWED_TYPES =
            Map.of(
                    ExperienceUpdatedEvent.class.getName(), ExperienceUpdatedEvent.class,
                    StudyUpdatedEvent.class.getName(), StudyUpdatedEvent.class);
    private final TransactionalOutboxStore store;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Value("${messaging.outbox.max-attempts:20}")
    private int maxAttempts;

    @Value("${messaging.outbox.publisher-confirm-timeout-seconds:5}")
    private long publisherConfirmTimeoutSeconds;

    @Scheduled(fixedDelayString = "${messaging.outbox.relay-delay-ms:1000}")
    public void relay() {
        for (var message : store.claim(50, LocalDateTime.now().minusMinutes(5))) {
            try {
                Class<?> type = ALLOWED_TYPES.get(message.eventType());
                if (type == null)
                    throw new IllegalArgumentException(
                            "허용되지 않은 Outbox event type: " + message.eventType());
                Object event = objectMapper.readValue(message.payload(), type);
                CorrelationData correlationData = new CorrelationData(message.id());
                rabbitTemplate.convertAndSend(
                        message.exchange(), message.routingKey(), event, correlationData);
                CorrelationData.Confirm confirm =
                        correlationData
                                .getFuture()
                                .get(publisherConfirmTimeoutSeconds, TimeUnit.SECONDS);
                if (!confirm.isAck()) {
                    throw new IllegalStateException(
                            "RabbitMQ publisher nack: " + confirm.getReason());
                }
                if (correlationData.getReturned() != null) {
                    throw new IllegalStateException(
                            "RabbitMQ unroutable message: "
                                    + correlationData.getReturned().getReplyText());
                }
                store.markPublished(message.id());
            } catch (Exception exception) {
                int attempts = message.attempts() + 1;
                if (attempts >= maxAttempts) {
                    store.markDead(message.id(), attempts, exception.getMessage());
                    log.error(
                            "[Outbox] 최대 재시도 초과로 DEAD 전환 - id={}, attempts={}",
                            message.id(),
                            attempts,
                            exception);
                } else {
                    long backoffSeconds = Math.min(300, 1L << Math.min(attempts, 8));
                    store.markFailed(
                            message.id(),
                            attempts,
                            LocalDateTime.now().plusSeconds(backoffSeconds),
                            exception.getMessage());
                    log.error(
                            "[Outbox] RabbitMQ 발행 실패 - id={}, attempts={}",
                            message.id(),
                            attempts,
                            exception);
                }
            }
        }
    }

    @Scheduled(cron = "${messaging.outbox.cleanup-cron:0 15 3 * * *}")
    public void cleanupPublishedMessages() {
        LocalDateTime now = LocalDateTime.now();
        int published = store.deletePublishedBefore(now.minusDays(7));
        int dead = store.deleteDeadBefore(now.minusDays(30));
        if (published > 0 || dead > 0) {
            log.info("[Outbox] 메시지 정리 - published={}, dead={}", published, dead);
        }
    }
}
