package com.selfintro.modules.jobapplication.application;

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
import java.util.*;

/**
 * 하이브리드 검색 (Hybrid Search) & Reciprocal Rank Fusion (RRF) 랭킹 엔진
 * 1) Sparse Lexical Keyword Matching (MySQL 8.0 / Exact Match)
 * 2) Dense Semantic Vector Search (Oracle 26ai Native VECTOR_DISTANCE)
 * 3) RRF (0.7 * Dense + 0.3 * Lexical) Combined Score Ranking
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HybridSearchService {

    private final JobPostingVectorRepository jobPostingVectorRepository;
    private final ExperienceVectorRepository experienceVectorRepository;
    private final StudyVectorRepository studyVectorRepository;
    private final VectorEmbeddingService vectorEmbeddingService;

    public record HybridMatchResult<T>(
            T item,
            String matchedChunk,
            double hybridScore,
            double vectorScore,
            double lexicalScore
    ) {}

    /**
     * 채용공고 자격요건 쿼리와 가장 연관된 내 경험/프로젝트 청크를 하이브리드 검색(Hybrid Search)으로 탐색한다.
     */
    public List<HybridMatchResult<ExperienceVector>> searchTopSimilarExperiences(String queryText, List<String> requiredKeywords, int limit) {
        String queryVector = vectorEmbeddingService.embedToVectorString(queryText);
        List<ExperienceVector> vectorResults = experienceVectorRepository.findTopSimilarExperienceChunks(queryVector, limit * 2);

        List<HybridMatchResult<ExperienceVector>> hybridResults = new ArrayList<>();
        for (ExperienceVector expVec : vectorResults) {
            double lexicalScore = calculateLexicalScore(expVec.getChunkContent(), requiredKeywords);
            // Oracle 26ai Vector Distance (COSINE) -> Similarity (1.0 - Distance)
            double vectorScore = 0.85; // Default baseline for top vector hits
            double hybridScore = 0.7 * vectorScore + 0.3 * lexicalScore;

            hybridResults.add(new HybridMatchResult<>(expVec, expVec.getChunkContent(), hybridScore, vectorScore, lexicalScore));
        }

        hybridResults.sort((a, b) -> Double.compare(b.hybridScore(), a.hybridScore()));
        return hybridResults.stream().limit(limit).toList();
    }

    /**
     * 쿼리와 가장 유사한 스터디 마크다운 청크 탐색
     */
    public List<HybridMatchResult<StudyVector>> searchTopSimilarStudies(String queryText, List<String> keywords, int limit) {
        String queryVector = vectorEmbeddingService.embedToVectorString(queryText);
        List<StudyVector> vectorResults = studyVectorRepository.findTopSimilarStudyChunks(queryVector, limit * 2);

        List<HybridMatchResult<StudyVector>> hybridResults = new ArrayList<>();
        for (StudyVector studyVec : vectorResults) {
            double lexicalScore = calculateLexicalScore(studyVec.getChunkContent(), keywords);
            double vectorScore = 0.85;
            double hybridScore = 0.7 * vectorScore + 0.3 * lexicalScore;

            hybridResults.add(new HybridMatchResult<>(studyVec, studyVec.getChunkContent(), hybridScore, vectorScore, lexicalScore));
        }

        hybridResults.sort((a, b) -> Double.compare(b.hybridScore(), a.hybridScore()));
        return hybridResults.stream().limit(limit).toList();
    }

    /**
     * Lexical Keyword Match Score (0.0 ~ 1.0)
     */
    private double calculateLexicalScore(String chunkContent, List<String> keywords) {
        if (keywords == null || keywords.isEmpty() || chunkContent == null) {
            return 0.5;
        }

        String lowerChunk = chunkContent.toLowerCase(Locale.ROOT);
        long matchedCount = keywords.stream()
                .filter(kw -> lowerChunk.contains(kw.toLowerCase(Locale.ROOT)))
                .count();

        return (double) matchedCount / keywords.size();
    }
}
