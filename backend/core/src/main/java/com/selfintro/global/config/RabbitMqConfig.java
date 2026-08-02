package com.selfintro.global.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    public static final String EXCHANGE_NAME = "selfintro.event.exchange";
    public static final String QUEUE_JOB_POSTING_COLLECTED = "selfintro.queue.job-posting.collected";
    public static final String QUEUE_JOB_MATCHING_COMPLETED = "selfintro.queue.job-matching.completed";
    public static final String ROUTING_KEY_COLLECTED = "job.posting.collected";
    public static final String ROUTING_KEY_MATCHING = "job.matching.completed";

    @Bean
    public TopicExchange eventExchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    @Bean
    public Queue jobPostingCollectedQueue() {
        return new Queue(QUEUE_JOB_POSTING_COLLECTED, true);
    }

    @Bean
    public Queue jobMatchingCompletedQueue() {
        return new Queue(QUEUE_JOB_MATCHING_COMPLETED, true);
    }

    @Bean
    public Binding jobPostingCollectedBinding(
            @Qualifier("jobPostingCollectedQueue") Queue jobPostingCollectedQueue,
            @Qualifier("eventExchange") TopicExchange eventExchange) {
        return BindingBuilder.bind(jobPostingCollectedQueue).to(eventExchange).with(ROUTING_KEY_COLLECTED);
    }

    @Bean
    public Binding jobMatchingCompletedBinding(
            @Qualifier("jobMatchingCompletedQueue") Queue jobMatchingCompletedQueue,
            @Qualifier("eventExchange") TopicExchange eventExchange) {
        return BindingBuilder.bind(jobMatchingCompletedQueue).to(eventExchange).with(ROUTING_KEY_MATCHING);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
