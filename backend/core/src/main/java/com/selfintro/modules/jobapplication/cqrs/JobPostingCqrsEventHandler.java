package com.selfintro.modules.jobapplication.cqrs;

import com.selfintro.global.config.RabbitMqConfig;
import com.selfintro.modules.jobapplication.event.JobMatchingCompletedEvent;
import com.selfintro.modules.jobapplication.event.JobPostingCollectedEvent;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class JobPostingCqrsEventHandler {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String CQRS_KEY_PREFIX = "cqrs:job-posting:";

    public JobPostingCqrsEventHandler(@Autowired(required = false) RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @RabbitListener(queues = RabbitMqConfig.QUEUE_JOB_POSTING_COLLECTED)
    public void handleJobPostingCollected(JobPostingCollectedEvent event) {
        if (redisTemplate == null) {
            log.info("[CQRS Event] RedisTemplate 없음 (스킵): id={}", event.jobPostingId());
            return;
        }
        log.info("[CQRS Event] RabbitMQ 수신 - JobPostingCollected: id={}, company={}", event.jobPostingId(), event.companyName());
        String redisKey = CQRS_KEY_PREFIX + event.jobPostingId();
        
        JobPostingReadModel currentModel = (JobPostingReadModel) redisTemplate.opsForValue().get(redisKey);
        Integer matchScore = currentModel != null ? currentModel.matchScore() : null;
        String matchSummary = currentModel != null ? currentModel.matchSummary() : null;

        JobPostingReadModel updatedModel = new JobPostingReadModel(
                event.jobPostingId(),
                event.companyName(),
                event.title(),
                event.status(),
                event.applyUrl(),
                matchScore,
                matchSummary,
                LocalDateTime.now().toString()
        );

        redisTemplate.opsForValue().set(redisKey, updatedModel, 7, TimeUnit.DAYS);
    }

    @RabbitListener(queues = RabbitMqConfig.QUEUE_JOB_MATCHING_COMPLETED)
    public void handleJobMatchingCompleted(JobMatchingCompletedEvent event) {
        if (redisTemplate == null) {
            log.info("[CQRS Event] RedisTemplate 없음 (스킵): id={}", event.jobPostingId());
            return;
        }
        log.info("[CQRS Event] RabbitMQ 수신 - JobMatchingCompleted: id={}, score={}", event.jobPostingId(), event.score());
        String redisKey = CQRS_KEY_PREFIX + event.jobPostingId();
        
        JobPostingReadModel currentModel = (JobPostingReadModel) redisTemplate.opsForValue().get(redisKey);
        if (currentModel != null) {
            JobPostingReadModel updatedModel = new JobPostingReadModel(
                    currentModel.id(),
                    currentModel.companyName(),
                    currentModel.title(),
                    currentModel.status(),
                    currentModel.applyUrl(),
                    event.score(),
                    event.summary(),
                    LocalDateTime.now().toString()
            );
            redisTemplate.opsForValue().set(redisKey, updatedModel, 7, TimeUnit.DAYS);
        }
    }
}
