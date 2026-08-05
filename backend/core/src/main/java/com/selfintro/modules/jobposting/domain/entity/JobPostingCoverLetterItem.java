package com.selfintro.modules.jobposting.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 채용 공고별로 최종 제출한 자기소개서 문항과 답변을 저장한다. 수정 이력은 보관하지 않는다. */
@Getter
@Entity
@Table(name = "job_posting_cover_letter_item")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPostingCoverLetterItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_posting_id", nullable = false)
    private Long jobPostingId;

    @Column(name = "question", nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(name = "answer", nullable = false, columnDefinition = "TEXT")
    private String answer;

    @Column(name = "character_limit")
    private Integer characterLimit;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private JobPostingCoverLetterItem(
            Long jobPostingId,
            String question,
            String answer,
            Integer characterLimit,
            int displayOrder,
            LocalDateTime now) {
        this.jobPostingId = jobPostingId;
        this.question = question;
        this.answer = answer;
        this.characterLimit = characterLimit;
        this.displayOrder = displayOrder;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static JobPostingCoverLetterItem create(
            Long jobPostingId,
            String question,
            String answer,
            Integer characterLimit,
            int displayOrder,
            LocalDateTime now) {
        return new JobPostingCoverLetterItem(
                jobPostingId, question, answer, characterLimit, displayOrder, now);
    }
}
