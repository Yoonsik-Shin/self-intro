package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.entity.JobPostingPermissionReviewEvent;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionBasis;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionReviewStatus;
import java.time.LocalDateTime;

public record JobPostingPermissionReviewEventResponse(
        Long id,
        JobPostingPermissionReviewStatus reviewStatus,
        JobPostingPermissionBasis permissionBasis,
        String evidenceReference,
        String grantorName,
        String grantorAuthority,
        String permissionScopeNote,
        String termsVersion,
        String revocationContact,
        LocalDateTime expiresAt,
        Long reviewedByUserId,
        LocalDateTime reviewedAt) {

    public static JobPostingPermissionReviewEventResponse from(
            JobPostingPermissionReviewEvent event) {
        return new JobPostingPermissionReviewEventResponse(
                event.getId(),
                event.getReviewStatus(),
                event.getPermissionBasis(),
                event.getEvidenceReference(),
                event.getGrantorName(),
                event.getGrantorAuthority(),
                event.getPermissionScopeNote(),
                event.getTermsVersion(),
                event.getRevocationContact(),
                event.getExpiresAt(),
                event.getReviewedByUserId(),
                event.getReviewedAt());
    }
}
