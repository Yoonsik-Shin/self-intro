package com.selfintro.modules.jobposting.domain.entity;

import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionBasis;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionReviewStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "job_posting_permission_review_event")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPostingPermissionReviewEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_posting_id", nullable = false)
    private Long jobPostingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 30)
    private JobPostingPermissionReviewStatus reviewStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission_basis", nullable = false, length = 40)
    private JobPostingPermissionBasis permissionBasis;

    @Column(name = "evidence_reference", length = 1000)
    private String evidenceReference;

    @Column(name = "grantor_name", length = 150)
    private String grantorName;

    @Column(name = "grantor_authority", length = 200)
    private String grantorAuthority;

    @Column(name = "permission_scope_note", length = 1000)
    private String permissionScopeNote;

    @Column(name = "terms_version", length = 100)
    private String termsVersion;

    @Column(name = "revocation_contact", length = 200)
    private String revocationContact;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "reviewed_by_user_id", nullable = false)
    private Long reviewedByUserId;

    @Column(name = "reviewed_at", nullable = false)
    private LocalDateTime reviewedAt;

    public static JobPostingPermissionReviewEvent snapshot(JobPosting posting) {
        JobPostingPermissionReviewEvent event = new JobPostingPermissionReviewEvent();
        event.jobPostingId = posting.getId();
        event.reviewStatus = posting.getPermissionReviewStatus();
        event.permissionBasis = posting.getPermissionBasis();
        event.evidenceReference = posting.getPermissionEvidenceReference();
        event.grantorName = posting.getPermissionGrantorName();
        event.grantorAuthority = posting.getPermissionGrantorAuthority();
        event.permissionScopeNote = posting.getPermissionScopeNote();
        event.termsVersion = posting.getPermissionTermsVersion();
        event.revocationContact = posting.getPermissionRevocationContact();
        event.expiresAt = posting.getPermissionExpiresAt();
        event.reviewedByUserId = posting.getPermissionReviewedByUserId();
        event.reviewedAt = posting.getPermissionReviewedAt();
        return event;
    }
}
