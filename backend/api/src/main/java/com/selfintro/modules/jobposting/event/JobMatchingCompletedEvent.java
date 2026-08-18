package com.selfintro.modules.jobposting.event;

import java.time.LocalDateTime;

public record JobMatchingCompletedEvent(
        Long jobPostingId, Integer score, String summary, LocalDateTime matchedAt) {}
