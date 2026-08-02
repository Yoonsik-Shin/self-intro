package com.selfintro.modules.study.domain.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "study_vector")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyVector {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "study_id", nullable = false)
    private Long studyId;

    @Column(name = "chunk_content", columnDefinition = "CLOB", nullable = false)
    private String chunkContent;

    /**
     * Oracle 26ai VECTOR 데이터 타입 (1536차원 임베딩 수치 배열 문자열)
     */
    @Column(name = "embedding_vector", columnDefinition = "VECTOR", nullable = false)
    private String embeddingVector;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public StudyVector(Long studyId, String chunkContent, String embeddingVector) {
        this.studyId = studyId;
        this.chunkContent = chunkContent;
        this.embeddingVector = embeddingVector;
        this.createdAt = LocalDateTime.now();
    }
}
