package com.selfintro.vectorsearch.application;

import com.selfintro.global.config.RabbitMqConfig;
import com.selfintro.jobposting.application.VectorBatchSyncService;
import com.selfintro.modules.experience.event.ExperienceUpdatedEvent;
import com.selfintro.modules.study.event.StudyUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Experience/Study가 저장될 때 RabbitMQ로 발행되는 이벤트를 받아 Oracle 26ai 벡터 인덱스를 즉시 재동기화한다.
 * {@code api}는 vectorsearch 패키지를 컴포넌트 스캔에서 제외하므로, 이 리스너는 {@code worker} 파드에서만 뜬다
 * (발행은 core 모듈의 ExperienceService/StudyService에서, 처리는 여기서).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VectorSyncEventHandler {

    private final VectorBatchSyncService vectorBatchSyncService;

    @RabbitListener(queues = RabbitMqConfig.QUEUE_EXPERIENCE_UPDATED)
    public void handleExperienceUpdated(ExperienceUpdatedEvent event) {
        try {
            int count = vectorBatchSyncService.syncExperienceVector(
                    event.experienceId(), event.title(), event.content());
            log.info("[VectorSync] 경험 ID {} 이벤트 기반 재동기화 완료 - {}건", event.experienceId(), count);
        } catch (Exception exception) {
            log.error("[VectorSync] 경험 ID {} 재동기화 실패", event.experienceId(), exception);
        }
    }

    @RabbitListener(queues = RabbitMqConfig.QUEUE_STUDY_UPDATED)
    public void handleStudyUpdated(StudyUpdatedEvent event) {
        try {
            int count = vectorBatchSyncService.syncStudyVector(
                    event.studyId(), event.title(), event.content());
            log.info("[VectorSync] 스터디 ID {} 이벤트 기반 재동기화 완료 - {}건", event.studyId(), count);
        } catch (Exception exception) {
            log.error("[VectorSync] 스터디 ID {} 재동기화 실패", event.studyId(), exception);
        }
    }
}
