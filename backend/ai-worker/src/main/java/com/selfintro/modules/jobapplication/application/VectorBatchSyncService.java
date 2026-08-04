package com.selfintro.modules.jobapplication.application;

import com.selfintro.global.ai.ContextualChunker;
import com.selfintro.global.ai.VectorEmbeddingService;
import com.selfintro.vectorsearch.domain.entity.ExperienceVector;
import com.selfintro.vectorsearch.domain.repository.ExperienceVectorRepository;
import com.selfintro.vectorsearch.domain.entity.JobPostingVector;
import com.selfintro.vectorsearch.domain.repository.JobPostingVectorRepository;
import com.selfintro.vectorsearch.domain.entity.StudyVector;
import com.selfintro.vectorsearch.domain.repository.StudyVectorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * 기존 MySQL 데이터(JobPosting, Experience, Study) ➔ Oracle 26ai Native VECTOR 고품질 일괄 배치 동기화 서비스
 * (2026 SOTA Contextual Retrieval + Recursive 512t/20% Overlap 적용)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VectorBatchSyncService {

    private final JobPostingVectorRepository jobPostingVectorRepository;
    private final ExperienceVectorRepository experienceVectorRepository;
    private final StudyVectorRepository studyVectorRepository;
    private final ContextualChunker contextualChunker;
    private final VectorEmbeddingService vectorEmbeddingService;

    public record BatchSyncSummary(
            int jobPostingChunksCreated,
            int experienceChunksCreated,
            int studyChunksCreated
    ) {}

    /**
     * 프로젝트 경험 텍스트 청킹 및 Oracle 26ai 배치 동기화
     */
    @Transactional
    public int syncExperienceVector(Long experienceId, String title, String role, String techStack, String description) {
        experienceVectorRepository.deleteByExperienceId(experienceId);

        String contextualHeader = String.format(
                "[도메인: 경력/프로젝트 | 제목: %s | 역할: %s | 기술스택: %s]",
                safe(title), safe(role), safe(techStack)
        );

        List<String> chunks = contextualChunker.chunkTextWithContext(description, contextualHeader);
        int createdCount = 0;

        for (String chunk : chunks) {
            String vectorStr = vectorEmbeddingService.embedToVectorString(chunk);
            ExperienceVector expVector = ExperienceVector.builder()
                    .experienceId(experienceId)
                    .chunkContent(chunk)
                    .embeddingVector(vectorStr)
                    .build();
            experienceVectorRepository.save(expVector);
            createdCount++;
        }

        log.info("경험 ID {} - Oracle 26ai 고품질 벡터 청크 {}건 동기화 완료", experienceId, createdCount);
        return createdCount;
    }

    /**
     * 기술 스터디 마크다운 청킹 및 Oracle 26ai 배치 동기화
     */
    @Transactional
    public int syncStudyVector(Long studyId, String title, String category, String markdownContent) {
        studyVectorRepository.deleteByStudyId(studyId);

        String contextualHeader = String.format(
                "[도메인: 기술 스터디 | 제목: %s | 카테고리: %s]",
                safe(title), safe(category)
        );

        List<String> chunks = contextualChunker.chunkTextWithContext(markdownContent, contextualHeader);
        int createdCount = 0;

        for (String chunk : chunks) {
            String vectorStr = vectorEmbeddingService.embedToVectorString(chunk);
            StudyVector studyVector = StudyVector.builder()
                    .studyId(studyId)
                    .chunkContent(chunk)
                    .embeddingVector(vectorStr)
                    .build();
            studyVectorRepository.save(studyVector);
            createdCount++;
        }

        log.info("스터디 ID {} - Oracle 26ai 고품질 벡터 청크 {}건 동기화 완료", studyId, createdCount);
        return createdCount;
    }

    /**
     * 채용공고 텍스트 청킹 및 Oracle 26ai 배치 동기화
     */
    @Transactional
    public int syncJobPostingVector(Long jobPostingId, String title, String companyName, String rawText) {
        jobPostingVectorRepository.deleteByJobPostingId(jobPostingId);

        String contextualHeader = String.format(
                "[도메인: 채용공고 | 회사명: %s | 공고제목: %s]",
                safe(companyName), safe(title)
        );

        List<String> chunks = contextualChunker.chunkTextWithContext(rawText, contextualHeader);
        int createdCount = 0;

        for (String chunk : chunks) {
            String vectorStr = vectorEmbeddingService.embedToVectorString(chunk);
            JobPostingVector jpVector = JobPostingVector.builder()
                    .jobPostingId(jobPostingId)
                    .chunkContent(chunk)
                    .embeddingVector(vectorStr)
                    .build();
            jobPostingVectorRepository.save(jpVector);
            createdCount++;
        }

        log.info("채용공고 ID {} - Oracle 26ai 고품질 벡터 청크 {}건 동기화 완료", jobPostingId, createdCount);
        return createdCount;
    }

    private static String safe(String val) {
        return val == null ? "" : val;
    }
}
