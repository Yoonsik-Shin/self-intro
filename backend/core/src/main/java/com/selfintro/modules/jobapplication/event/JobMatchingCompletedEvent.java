package com.selfintro.modules.jobapplication.event;

import java.time.LocalDateTime;

public record JobMatchingCompletedEvent(
        Long jobPostingId, Integer score, String summary, LocalDateTime matchedAt) {}
