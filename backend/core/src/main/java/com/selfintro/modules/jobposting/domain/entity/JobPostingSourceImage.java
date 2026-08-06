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

/**
 * URL 파싱이 불가능해 JD 스크린샷으로 등록한 공고의 원본 이미지를 보관한다. 상세 드로어의
 * "원본 이미지 보기"가 그대로 읽어 보여준다 — URL 수집 공고의 "원본 보기"(원본 URL)에
 * 대응하는 이미지 버전이다. 스크롤 캡처처럼 한 공고에 여러 장이 붙을 수 있다.
 */
@Getter
@Entity
@Table(name = "job_posting_source_image")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPostingSourceImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_posting_id", nullable = false, updatable = false)
    private Long jobPostingId;

    @Column(name = "object_key", nullable = false, updatable = false, length = 500)
    private String objectKey;

    @Column(name = "image_url", nullable = false, updatable = false, length = 500)
    private String imageUrl;

    @Column(name = "display_order", nullable = false, updatable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private JobPostingSourceImage(
            Long jobPostingId,
            String objectKey,
            String imageUrl,
            int displayOrder,
            LocalDateTime now) {
        this.jobPostingId = jobPostingId;
        this.objectKey = objectKey;
        this.imageUrl = imageUrl;
        this.displayOrder = displayOrder;
        this.createdAt = now;
    }

    public static JobPostingSourceImage of(
            Long jobPostingId,
            String objectKey,
            String imageUrl,
            int displayOrder,
            LocalDateTime now) {
        return new JobPostingSourceImage(jobPostingId, objectKey, imageUrl, displayOrder, now);
    }
}
