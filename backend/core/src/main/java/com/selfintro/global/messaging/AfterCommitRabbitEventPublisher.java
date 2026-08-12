package com.selfintro.global.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 업무 transaction이 commit된 뒤 RabbitMQ event를 발행한다. rollback된 원본 변경이 vector index에 반영되는 것을 막기 위한 최소
 * 경계이며, commit과 broker publish 사이의 유실 창까지 제거하는 transactional outbox를 대체하지는 않는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AfterCommitRabbitEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publish(String exchange, String routingKey, Object event) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()) {
            send(exchange, routingKey, event);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        send(exchange, routingKey, event);
                    }
                });
    }

    private void send(String exchange, String routingKey, Object event) {
        try {
            rabbitTemplate.convertAndSend(exchange, routingKey, event);
        } catch (RuntimeException exception) {
            log.error(
                    "[AfterCommitEvent] RabbitMQ 발행 실패 - exchange={}, routingKey={}, eventType={}",
                    exchange,
                    routingKey,
                    event.getClass().getSimpleName(),
                    exception);
        }
    }
}
