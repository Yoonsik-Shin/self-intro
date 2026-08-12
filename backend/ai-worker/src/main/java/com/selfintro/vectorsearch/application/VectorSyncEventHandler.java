package com.selfintro.vectorsearch.application;

import com.selfintro.global.config.RabbitMqConfig;
import com.selfintro.jobposting.application.VectorBatchSyncService;
import com.selfintro.modules.experience.event.ExperienceUpdatedEvent;
import com.selfintro.modules.study.event.StudyUpdatedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Experience/Study가 저장될 때 RabbitMQ로 발행되는 이벤트를 받아 Oracle 26ai 벡터 인덱스를 즉시 재동기화한다. {@code api}는
 * vectorsearch 패키지를 컴포넌트 스캔에서 제외하므로, 이 리스너는 {@code worker} 파드에서만 뜬다 (발행은 core 모듈의
 * ExperienceService/StudyService에서, 처리는 여기서).
 */
@Component
@RequiredArgsConstructor
public class VectorSyncEventHandler {

    private final VectorBatchSyncService vectorBatchSyncService;

    @RabbitListener(
            queues = RabbitMqConfig.QUEUE_EXPERIENCE_UPDATED,
            containerFactory = "vectorSyncRabbitListenerContainerFactory")
    public void handleExperienceUpdated(ExperienceUpdatedEvent event) {
        if (event.deleted()) {
            vectorBatchSyncService.deleteExperienceVector(
                    event.workspaceId(), event.experienceId());
            return;
        }
        vectorBatchSyncService.syncExperienceVector(
                event.workspaceId(), event.experienceId(), event.title(), event.content());
    }

    @RabbitListener(
            queues = RabbitMqConfig.QUEUE_STUDY_UPDATED,
            containerFactory = "vectorSyncRabbitListenerContainerFactory")
    public void handleStudyUpdated(StudyUpdatedEvent event) {
        if (event.deleted()) {
            vectorBatchSyncService.deleteStudyVector(event.workspaceId(), event.studyId());
            return;
        }
        vectorBatchSyncService.syncStudyVector(
                event.workspaceId(), event.studyId(), event.title(), event.content());
    }
}
