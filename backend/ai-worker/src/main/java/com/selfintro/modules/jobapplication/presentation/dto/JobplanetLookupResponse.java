package com.selfintro.modules.jobapplication.presentation.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record JobplanetLookupResponse(
        Long jobPostingId,
        String companyName,
        String searchUrl,
        BigDecimal rating,
        Integer reviewCount,
        String jobplanetCompanyName,
        String companyUrl,
        LocalDateTime checkedAt) {}
