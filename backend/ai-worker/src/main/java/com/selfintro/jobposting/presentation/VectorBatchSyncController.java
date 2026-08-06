package com.selfintro.jobposting.presentation;

import com.selfintro.global.ai.CareerProfileDigestBuilder;
import com.selfintro.jobposting.application.VectorBatchSyncService;
import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * Oracle 26ai Native Vector 고품질 배치 동기화 & 하이브리드 검색 트리거 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/vector-sync")
@RequiredArgsConstructor
public class VectorBatchSyncController {

    private final VectorBatchSyncService vectorBatchSyncService;
    private final ExperienceRepository experienceRepository;
    private final StudyRepository studyRepository;
    private final CareerProfileDigestBuilder careerProfileDigestBuilder;

    public record ExperienceSyncRequest(Long id, String title, String content) {}
    public record StudySyncRequest(Long id, String title, String markdownContent) {}
    public record JobPostingSyncRequest(Long id, String title, String companyName, String rawText) {}

    @PostMapping("/experience")
    public ResponseEntity<Map<String, Object>> syncExperience(@RequestBody ExperienceSyncRequest request) {
        int count = vectorBatchSyncService.syncExperienceVector(
                request.id(), request.title(), request.content()
        );
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "experienceId", request.id(), "chunksCreated", count));
    }

    @PostMapping("/study")
    public ResponseEntity<Map<String, Object>> syncStudy(@RequestBody StudySyncRequest request) {
        int count = vectorBatchSyncService.syncStudyVector(
                request.id(), request.title(), request.markdownContent()
        );
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "studyId", request.id(), "chunksCreated", count));
    }

    @PostMapping("/job-posting")
    public ResponseEntity<Map<String, Object>> syncJobPosting(@RequestBody JobPostingSyncRequest request) {
        int count = vectorBatchSyncService.syncJobPostingVector(
                request.id(), request.title(), request.companyName(), request.rawText()
        );
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "jobPostingId", request.id(), "chunksCreated", count));
    }

    /**
     * 기존 Experience/Study 전체를 한 번에 백필한다. 벡터 스택을 처음 붙일 때 관리자가 1회 수동 트리거.
     *
     * <p>{@code vectorBatchSyncService}의 개별 sync 메서드를 여기(컨트롤러, 별개 빈)에서 호출해야
     * {@code @Transactional("vectorTransactionManager")}가 실제로 적용된다 — 같은 서비스 빈 안에서
     * self-invocation으로 호출하면 Spring AOP 프록시를 안 타서 트랜잭션이 걸리지 않는다.
     */
    @PostMapping("/backfill-all")
    public ResponseEntity<Map<String, Object>> backfillAll() {
        int experienceChunks = 0;
        int experienceCount = 0;
        for (Experience experience : experienceRepository.findAllByOrderByDisplayOrderAsc()) {
            experienceChunks += vectorBatchSyncService.syncExperienceVector(
                    experience.getId(),
                    experience.getTitle(),
                    careerProfileDigestBuilder.buildForExperience(experience));
            experienceCount++;
        }

        int studyChunks = 0;
        int studyCount = 0;
        for (Study study : studyRepository.findAll()) {
            studyChunks += vectorBatchSyncService.syncStudyVector(
                    study.getId(), study.getTitle(), study.getContentMarkdown());
            studyCount++;
        }

        log.info("[VectorBackfill] Experience {}건, Study {}건 백필 완료 (청크: exp={}, study={})",
                experienceCount, studyCount, experienceChunks, studyChunks);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "experienceCount", experienceCount,
                "experienceChunksCreated", experienceChunks,
                "studyCount", studyCount,
                "studyChunksCreated", studyChunks
        ));
    }
}
