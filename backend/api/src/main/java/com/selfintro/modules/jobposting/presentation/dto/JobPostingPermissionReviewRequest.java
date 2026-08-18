package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionBasis;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionReviewStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public record JobPostingPermissionReviewRequest(
        @NotNull JobPostingPermissionReviewStatus reviewStatus,
        @NotNull JobPostingPermissionBasis permissionBasis,
        @Size(max = 1000) String evidenceReference,
        @Size(max = 150) String grantorName,
        @Size(max = 200) String grantorAuthority,
        @Size(max = 1000) String permissionScopeNote,
        @Size(max = 100) String termsVersion,
        @Size(max = 200) String revocationContact,
        LocalDateTime expiresAt) {}
