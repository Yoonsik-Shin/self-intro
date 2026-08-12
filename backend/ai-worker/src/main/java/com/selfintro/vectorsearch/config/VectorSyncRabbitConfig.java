package com.selfintro.vectorsearch.config;

import org.aopalliance.aop.Advice;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.config.RetryInterceptorBuilder;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.retry.RepublishMessageRecoverer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.amqp.SimpleRabbitListenerContainerFactoryConfigurer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class VectorSyncRabbitConfig {

    public static final String DEAD_LETTER_EXCHANGE = "selfintro.vector-sync.dlx";
    public static final String DEAD_LETTER_QUEUE = "selfintro.queue.vector-sync.dlq";
    public static final String DEAD_LETTER_ROUTING_KEY = "vector-sync.failed";

    @Bean
    public DirectExchange vectorSyncDeadLetterExchange() {
        return new DirectExchange(DEAD_LETTER_EXCHANGE, true, false);
    }

    @Bean
    public Queue vectorSyncDeadLetterQueue(
            @Value("${app.vector-sync.dlq-message-ttl-ms:604800000}") long messageTtlMs) {
        return QueueBuilder.durable(DEAD_LETTER_QUEUE)
                .withArgument("x-message-ttl", messageTtlMs)
                .build();
    }

    @Bean
    public Binding vectorSyncDeadLetterBinding(
            Queue vectorSyncDeadLetterQueue, DirectExchange vectorSyncDeadLetterExchange) {
        return BindingBuilder.bind(vectorSyncDeadLetterQueue)
                .to(vectorSyncDeadLetterExchange)
                .with(DEAD_LETTER_ROUTING_KEY);
    }

    @Bean(name = "vectorSyncRabbitListenerContainerFactory")
    public SimpleRabbitListenerContainerFactory vectorSyncRabbitListenerContainerFactory(
            SimpleRabbitListenerContainerFactoryConfigurer configurer,
            ConnectionFactory connectionFactory,
            RabbitTemplate rabbitTemplate) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        configurer.configure(factory, connectionFactory);

        RepublishMessageRecoverer recoverer =
                new RepublishMessageRecoverer(
                        rabbitTemplate, DEAD_LETTER_EXCHANGE, DEAD_LETTER_ROUTING_KEY);
        Advice retryAdvice =
                RetryInterceptorBuilder.stateless()
                        .maxAttempts(3)
                        .backOffOptions(1_000L, 2.0, 10_000L)
                        .recoverer(recoverer)
                        .build();
        factory.setAdviceChain(retryAdvice);
        factory.setDefaultRequeueRejected(false);
        return factory;
    }
}
