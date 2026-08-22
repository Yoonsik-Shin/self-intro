package com.selfintro.global.messaging;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.messaging.TransactionalOutboxStore.OutboxMessage;
import com.selfintro.modules.experience.event.ExperienceUpdatedEvent;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class TransactionalOutboxRelayTest {

    @Mock private TransactionalOutboxStore store;
    @Mock private RabbitTemplate rabbitTemplate;
    @Mock private ObjectMapper objectMapper;
    private TransactionalOutboxRelay relay;

    @BeforeEach
    void setUp() {
        relay = new TransactionalOutboxRelay(store, rabbitTemplate, objectMapper);
        ReflectionTestUtils.setField(relay, "maxAttempts", 3);
        ReflectionTestUtils.setField(relay, "publisherConfirmTimeoutSeconds", 1L);
    }

    @Test
    void publishesAllowedEventAndMarksMessagePublished() throws Exception {
        OutboxMessage message = message(ExperienceUpdatedEvent.class.getName(), 0);
        ExperienceUpdatedEvent event = new ExperienceUpdatedEvent(1L, 2L, "title", "content");
        when(store.claim(eq(50), any(LocalDateTime.class))).thenReturn(List.of(message));
        when(objectMapper.readValue("{}", ExperienceUpdatedEvent.class)).thenReturn(event);
        doAnswer(
                        invocation -> {
                            CorrelationData correlationData = invocation.getArgument(3);
                            correlationData
                                    .getFuture()
                                    .complete(new CorrelationData.Confirm(true, null));
                            return null;
                        })
                .when(rabbitTemplate)
                .convertAndSend(eq("exchange"), eq("route"), eq(event), any(CorrelationData.class));

        relay.relay();

        verify(rabbitTemplate)
                .convertAndSend(eq("exchange"), eq("route"), eq(event), any(CorrelationData.class));
        verify(store).markPublished("id-1");
    }

    @Test
    void retriesWhenBrokerNacksMessage() throws Exception {
        OutboxMessage message = message(ExperienceUpdatedEvent.class.getName(), 0);
        ExperienceUpdatedEvent event = new ExperienceUpdatedEvent(1L, 2L, "title", "content");
        when(store.claim(eq(50), any(LocalDateTime.class))).thenReturn(List.of(message));
        when(objectMapper.readValue("{}", ExperienceUpdatedEvent.class)).thenReturn(event);
        doAnswer(
                        invocation -> {
                            CorrelationData correlationData = invocation.getArgument(3);
                            correlationData
                                    .getFuture()
                                    .complete(new CorrelationData.Confirm(false, "broker nack"));
                            return null;
                        })
                .when(rabbitTemplate)
                .convertAndSend(eq("exchange"), eq("route"), eq(event), any(CorrelationData.class));

        relay.relay();

        verify(store)
                .markFailed(eq("id-1"), eq(1), any(LocalDateTime.class), nullable(String.class));
        verify(store, never()).markPublished(any());
    }

    @Test
    void retriesTransientFailureBeforeAttemptLimit() throws Exception {
        when(store.claim(eq(50), any(LocalDateTime.class)))
                .thenReturn(List.of(message(ExperienceUpdatedEvent.class.getName(), 0)));
        when(objectMapper.readValue("{}", ExperienceUpdatedEvent.class))
                .thenThrow(new IllegalStateException("temporary failure"));

        relay.relay();

        verify(store)
                .markFailed(eq("id-1"), eq(1), any(LocalDateTime.class), nullable(String.class));
        verify(store, never()).markDead(any(), anyInt(), any());
    }

    @Test
    void marksMessageDeadAtAttemptLimit() {
        when(store.claim(eq(50), any(LocalDateTime.class)))
                .thenReturn(List.of(message("unsupported.Event", 2)));

        relay.relay();

        verify(store).markDead(eq("id-1"), eq(3), nullable(String.class));
        verify(store, never()).markFailed(any(), anyInt(), any(LocalDateTime.class), any());
    }

    private static OutboxMessage message(String eventType, int attempts) {
        return new OutboxMessage("id-1", "exchange", "route", eventType, "{}", attempts);
    }
}
