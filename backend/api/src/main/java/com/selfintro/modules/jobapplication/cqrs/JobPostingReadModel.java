package com.selfintro.modules.jobapplication.cqrs;

import java.io.Serializable;

public record JobPostingReadModel(
        Long id,
        String companyName,
        String title,
        String status,
        String applyUrl,
        String lastUpdatedAt)
        implements Serializable {}
