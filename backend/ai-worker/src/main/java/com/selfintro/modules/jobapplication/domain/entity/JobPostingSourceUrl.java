package com.selfintro.modules.jobapplication.domain.entity;

import com.selfintro.modules.jobapplication.domain.enums.JobPostingPlatform;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 공고 하나(job_posting)에 여러 플랫폼의 URL이 등록될 수 있음을 표현한다. 원본보기 팝오버가 그대로 읽어 보여준다. */
@Getter
@Entity
@Table(name = "job_posting_source_url")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPostingSourceUrl {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_posting_id", nullable = false, updatable = false)
    private Long jobPostingId;

    @Column(name = "url", nullable = false, updatable = false, length = 500)
    private String url;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform", nullable = false, updatable = false, length = 20)
    private JobPostingPlatform platform;

    /** 처음 이 공고를 만든 URL. 카드/팝오버에서 대표로 보여주는 기준이다. */
    @Column(name = "is_primary", nullable = false, updatable = false)
    private boolean primary;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private JobPostingSourceUrl(
            Long jobPostingId,
            String url,
            JobPostingPlatform platform,
            boolean primary,
            LocalDateTime now) {
        this.jobPostingId = jobPostingId;
        this.url = url;
        this.platform = platform;
        this.primary = primary;
        this.createdAt = now;
    }

    public static JobPostingSourceUrl primary(
            Long jobPostingId, String url, JobPostingPlatform platform, LocalDateTime now) {
        return new JobPostingSourceUrl(jobPostingId, url, platform, true, now);
    }

    public static JobPostingSourceUrl additional(
            Long jobPostingId, String url, JobPostingPlatform platform, LocalDateTime now) {
        return new JobPostingSourceUrl(jobPostingId, url, platform, false, now);
    }
}
