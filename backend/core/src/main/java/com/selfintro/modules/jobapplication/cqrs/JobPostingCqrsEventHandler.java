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
            log.error("[CQRS Error] Redis NoSQL 저장소(RedisTemplate)가 연결되어 있지 않습니다! CQRS Read Model 투영 실패 - id={}", event.jobPostingId());
            return;
        }
        try {
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
            log.info("[CQRS Success] Redis NoSQL 투영 완료 - key={}", redisKey);
        } catch (Exception e) {
            log.error("[CQRS Error] Redis NoSQL 처리 중 예외 발생! id={}", event.jobPostingId(), e);
        }
    }

    @RabbitListener(queues = RabbitMqConfig.QUEUE_JOB_MATCHING_COMPLETED)
    public void handleJobMatchingCompleted(JobMatchingCompletedEvent event) {
        if (redisTemplate == null) {
            log.error("[CQRS Error] Redis NoSQL 저장소(RedisTemplate)가 연결되어 있지 않습니다! CQRS Read Model 투영 실패 - id={}", event.jobPostingId());
            return;
        }
        try {
            log.info("[CQRS Event] RabbitMQ 수신 - JobMatchingCompleted: id={}, score={}", event.jobPostingId(), event.score());
            String redisKey = CQRS_KEY_PREFIX + event.jobPostingId();
            
            JobPostingReadModel currentModel = (JobPostingReadModel) redisTemplate.opsForValue().get(redisKey);
            JobPostingReadModel updatedModel = new JobPostingReadModel(
                    event.jobPostingId(),
                    currentModel != null ? currentModel.companyName() : "",
                    currentModel != null ? currentModel.title() : "",
                    currentModel != null ? currentModel.status() : "NEW",
                    currentModel != null ? currentModel.applyUrl() : "",
                    event.score(),
                    event.summary(),
                    LocalDateTime.now().toString()
            );
            redisTemplate.opsForValue().set(redisKey, updatedModel, 7, TimeUnit.DAYS);
            log.info("[CQRS Success] Redis NoSQL 투영 완료 - key={}", redisKey);
        } catch (Exception e) {
            log.error("[CQRS Error] Redis NoSQL 처리 중 예외 발생! id={}", event.jobPostingId(), e);
        }
    }
}
