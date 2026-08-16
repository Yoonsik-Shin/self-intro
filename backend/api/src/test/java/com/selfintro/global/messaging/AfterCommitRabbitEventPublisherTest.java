package com.selfintro.global.messaging;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class AfterCommitRabbitEventPublisherTest {

    @Mock private RabbitTemplate rabbitTemplate;

    @AfterEach
    void cleanUpTransactionState() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        TransactionSynchronizationManager.setActualTransactionActive(false);
    }

    @Test
    void publishesImmediatelyWithoutTransaction() {
        Object event = new Object();
        AfterCommitRabbitEventPublisher publisher =
                new AfterCommitRabbitEventPublisher(rabbitTemplate);

        publisher.publish("exchange", "route", event);

        verify(rabbitTemplate).convertAndSend("exchange", "route", event);
    }

    @Test
    void defersPublishUntilCommitCallback() {
        Object event = new Object();
        AfterCommitRabbitEventPublisher publisher =
                new AfterCommitRabbitEventPublisher(rabbitTemplate);
        TransactionSynchronizationManager.setActualTransactionActive(true);
        TransactionSynchronizationManager.initSynchronization();

        publisher.publish("exchange", "route", event);
        verifyNoInteractions(rabbitTemplate);

        TransactionSynchronizationManager.getSynchronizations()
                .forEach(synchronization -> synchronization.afterCommit());

        verify(rabbitTemplate).convertAndSend("exchange", "route", event);
    }

    @Test
    void doesNotPublishWhenTransactionFinishesWithoutCommit() {
        Object event = new Object();
        AfterCommitRabbitEventPublisher publisher =
                new AfterCommitRabbitEventPublisher(rabbitTemplate);
        TransactionSynchronizationManager.setActualTransactionActive(true);
        TransactionSynchronizationManager.initSynchronization();

        publisher.publish("exchange", "route", event);
        TransactionSynchronizationManager.getSynchronizations()
                .forEach(
                        synchronization ->
                                synchronization.afterCompletion(
                                        TransactionSynchronization.STATUS_ROLLED_BACK));

        verifyNoInteractions(rabbitTemplate);
    }
}
