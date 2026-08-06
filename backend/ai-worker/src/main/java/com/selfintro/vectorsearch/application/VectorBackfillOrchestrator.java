package com.selfintro.vectorsearch.application;

import com.selfintro.global.ai.CareerProfileDigestBuilder;
import com.selfintro.jobposting.application.VectorBatchSyncService;
import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * 기존 Experience/Study 전체를 Oracle 26ai 벡터 인덱스로 백필한다. 관리자가 벡터 스택을 처음 붙이거나
 * 재구축할 때 1회 수동 트리거하는 용도 — 항목이 수백 건이라 HTTP 요청/응답 왕복 안에서 동기로 끝내면
 * Cloudflare 엣지 타임아웃(524)에 걸린다. {@link #backfillAll()}을 별도 스레드에서 돌리고 컨트롤러는
 * 바로 202를 반환하도록 이 클래스를 컨트롤러와 분리된 빈으로 둔다({@code @Async}는 self-invocation이면
 * 적용되지 않는다 — {@code @Transactional}과 같은 이유).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VectorBackfillOrchestrator {

    private final VectorBatchSyncService vectorBatchSyncService;
    private final ExperienceRepository experienceRepository;
    private final StudyRepository studyRepository;
    private final CareerProfileDigestBuilder careerProfileDigestBuilder;

    @Async
    public void backfillAll() {
        int experienceChunks = 0;
        int experienceCount = 0;
        for (Experience experience : experienceRepository.findAllByOrderByDisplayOrderAsc()) {
            try {
                experienceChunks += vectorBatchSyncService.syncExperienceVector(
                        experience.getId(),
                        experience.getTitle(),
                        careerProfileDigestBuilder.buildForExperience(experience));
                experienceCount++;
            } catch (Exception exception) {
                log.error("[VectorBackfill] 경험 ID {} 백필 실패", experience.getId(), exception);
            }
        }

        int studyChunks = 0;
        int studyCount = 0;
        for (Study study : studyRepository.findAll()) {
            try {
                studyChunks += vectorBatchSyncService.syncStudyVector(
                        study.getId(), study.getTitle(), study.getContentMarkdown());
                studyCount++;
            } catch (Exception exception) {
                log.error("[VectorBackfill] 스터디 ID {} 백필 실패", study.getId(), exception);
            }
        }

        log.info("[VectorBackfill] 완료 - Experience {}/{}건, Study {}/{}건, 청크: exp={}, study={}",
                experienceCount, experienceRepository.count(),
                studyCount, studyRepository.count(),
                experienceChunks, studyChunks);
    }
}
