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

@Getter
@Entity
@Table(name = "job_posting_cover_letter_revision")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPostingCoverLetterRevision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cover_letter_item_id", nullable = false)
    private Long coverLetterItemId;

    @Column(name = "sender_type", nullable = false, length = 10)
    private String senderType;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private JobPostingCoverLetterRevision(
            Long coverLetterItemId, String senderType, String content, LocalDateTime createdAt) {
        this.coverLetterItemId = coverLetterItemId;
        this.senderType = senderType;
        this.content = content;
        this.createdAt = createdAt;
    }

    public static JobPostingCoverLetterRevision create(
            Long coverLetterItemId, String senderType, String content, LocalDateTime createdAt) {
        return new JobPostingCoverLetterRevision(coverLetterItemId, senderType, content, createdAt);
    }
}
