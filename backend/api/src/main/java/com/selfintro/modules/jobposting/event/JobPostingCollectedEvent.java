package com.selfintro.modules.jobposting.event;

import java.time.LocalDateTime;

public record JobPostingCollectedEvent(
        Long jobPostingId,
        String companyName,
        String title,
        String applyUrl,
        String status,
        LocalDateTime collectedAt) {}
