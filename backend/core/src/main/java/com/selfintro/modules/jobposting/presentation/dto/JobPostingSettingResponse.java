package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.entity.JobPostingSetting;
import java.math.BigDecimal;

public record JobPostingSettingResponse(
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
        String homeAddress,
        BigDecimal homeLatitude,
        BigDecimal homeLongitude) {

    public static JobPostingSettingResponse from(JobPostingSetting entity) {
        return new JobPostingSettingResponse(
                entity.isSaraminEnabled(),
                entity.getSearchKeywords(),
                entity.getSearchCount(),
                entity.getSearchSort(),
                entity.getLocationCode(),
                entity.getJobCode(),
                entity.getIndustryCode(),
                entity.isCollectorScheduledEnabled(),
                entity.getMatchingKeywordThreshold(),
                entity.getCollectorCron(),
                entity.getHomeAddress(),
                entity.getHomeLatitude(),
                entity.getHomeLongitude());
    }
}
