package com.selfintro.modules.jobapplication.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 유사 공고 수집 관련, 재배포 없이 바꾸고 싶은 값들의 전역 설정. 항상 id=1 단일 행만 사용한다 (access-key 같은 비밀값만 계속 환경변수로 관리한다). */
@Getter
@Entity
@Table(name = "job_posting_setting")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPostingSetting {
    public static final long SINGLETON_ID = 1L;

    @Id private Long id;

    @Column(name = "saramin_enabled", nullable = false)
    private boolean saraminEnabled;

    @Column(name = "search_keywords", length = 200)
    private String searchKeywords;

    @Column(name = "search_count", nullable = false)
    private int searchCount;

    @Column(name = "search_sort", nullable = false, length = 10)
    private String searchSort;

    @Column(name = "location_code", length = 100)
    private String locationCode;

    @Column(name = "job_code", length = 100)
    private String jobCode;

    @Column(name = "industry_code", length = 100)
    private String industryCode;

    @Column(name = "collector_scheduled_enabled", nullable = false)
    private boolean collectorScheduledEnabled;

    @Column(name = "matching_keyword_threshold", nullable = false)
    private int matchingKeywordThreshold;

    @Column(name = "collector_cron", nullable = false, length = 100)
    private String collectorCron;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private JobPostingSetting(
            Long id,
            boolean saraminEnabled,
            String searchKeywords,
            int searchCount,
            String searchSort,
            String locationCode,
            String jobCode,
            String industryCode,
            boolean collectorScheduledEnabled,
            int matchingKeywordThreshold,
            String collectorCron,
            LocalDateTime updatedAt) {
        this.id = id;
        this.saraminEnabled = saraminEnabled;
        this.searchKeywords = searchKeywords;
        this.searchCount = searchCount;
        this.searchSort = searchSort;
        this.locationCode = locationCode;
        this.jobCode = jobCode;
        this.industryCode = industryCode;
        this.collectorScheduledEnabled = collectorScheduledEnabled;
        this.matchingKeywordThreshold = matchingKeywordThreshold;
        this.collectorCron = collectorCron;
        this.updatedAt = updatedAt;
    }

    public static JobPostingSetting defaults(LocalDateTime now) {
        return new JobPostingSetting(
                SINGLETON_ID,
                false,
                null,
                20,
                "pd",
                null,
                null,
                null,
                false,
                0,
                "0 0 8 * * *",
                now);
    }

    public void update(
            boolean saraminEnabled,
            String searchKeywords,
            int searchCount,
            String searchSort,
            String locationCode,
            String jobCode,
            String industryCode,
            boolean collectorScheduledEnabled,
            int matchingKeywordThreshold,
            String collectorCron,
            LocalDateTime now) {
        this.saraminEnabled = saraminEnabled;
        this.searchKeywords = searchKeywords;
        this.searchCount = searchCount;
        this.searchSort = searchSort;
        this.locationCode = locationCode;
        this.jobCode = jobCode;
        this.industryCode = industryCode;
        this.collectorScheduledEnabled = collectorScheduledEnabled;
        this.matchingKeywordThreshold = matchingKeywordThreshold;
        this.collectorCron = collectorCron;
        this.updatedAt = now;
    }
}
