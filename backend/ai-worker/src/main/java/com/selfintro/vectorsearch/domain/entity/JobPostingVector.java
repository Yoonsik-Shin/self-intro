package com.selfintro.vectorsearch.domain.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "job_posting_vector")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPostingVector {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_posting_id", nullable = false)
    private Long jobPostingId;

    @Column(name = "chunk_content", columnDefinition = "CLOB", nullable = false)
    private String chunkContent;

    /**
     * Oracle 26ai VECTOR 데이터 타입 (1536차원 임베딩 수치 배열 문자열) Oracle 26ai에서는 VECTOR(1536, FLOAT32) 데이터 타입을
     * 지원합니다.
     */
    @Column(name = "embedding_vector", columnDefinition = "VECTOR", nullable = false)
    private String embeddingVector;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public JobPostingVector(Long jobPostingId, String chunkContent, String embeddingVector) {
        this.jobPostingId = jobPostingId;
        this.chunkContent = chunkContent;
        this.embeddingVector = embeddingVector;
        this.createdAt = LocalDateTime.now();
    }
}
