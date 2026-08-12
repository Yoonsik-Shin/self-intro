package com.selfintro.modules.supportaccess.domain;

import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.Workspace;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "support_access_request")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SupportAccessRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operator_user_id", nullable = false)
    private AppUser operator;

    @Column(nullable = false, length = 500)
    private String reason;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "support_access_request_scope",
            joinColumns = @JoinColumn(name = "request_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false, length = 40)
    private Set<SupportAccessScope> scopes = EnumSet.noneOf(SupportAccessScope.class);

    @Column(name = "requested_duration_minutes", nullable = false)
    private int requestedDurationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SupportAccessStatus status;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "request_expires_at", nullable = false)
    private LocalDateTime requestExpiresAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_user_id")
    private AppUser approvedBy;

    @Column(name = "access_expires_at")
    private LocalDateTime accessExpiresAt;

    @Column(name = "denied_at")
    private LocalDateTime deniedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "denied_by_user_id")
    private AppUser deniedBy;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "revoked_by_user_id")
    private AppUser revokedBy;

    public static SupportAccessRequest request(
            Workspace workspace,
            AppUser operator,
            String reason,
            Set<SupportAccessScope> scopes,
            int durationMinutes,
            LocalDateTime now) {
        if (reason == null || reason.isBlank() || reason.length() > 500) {
            throw new IllegalArgumentException("지원 접근 사유는 1자 이상 500자 이하여야 합니다.");
        }
        if (scopes == null || scopes.isEmpty()) {
            throw new IllegalArgumentException("지원 접근 범위를 하나 이상 선택해야 합니다.");
        }
        if (durationMinutes < 15 || durationMinutes > 60) {
            throw new IllegalArgumentException("지원 접근 시간은 15분 이상 60분 이하여야 합니다.");
        }
        SupportAccessRequest request = new SupportAccessRequest();
        request.workspace = workspace;
        request.operator = operator;
        request.reason = reason.trim();
        request.scopes = EnumSet.copyOf(scopes);
        request.requestedDurationMinutes = durationMinutes;
        request.status = SupportAccessStatus.PENDING;
        request.requestedAt = now;
        request.requestExpiresAt = now.plusHours(24);
        return request;
    }

    public void approve(AppUser approver, LocalDateTime now) {
        requirePending(now);
        status = SupportAccessStatus.APPROVED;
        approvedAt = now;
        approvedBy = approver;
        accessExpiresAt = now.plusMinutes(requestedDurationMinutes);
    }

    public void deny(AppUser denier, LocalDateTime now) {
        requirePending(now);
        status = SupportAccessStatus.DENIED;
        deniedAt = now;
        deniedBy = denier;
    }

    public void revoke(AppUser revoker, LocalDateTime now) {
        if (status != SupportAccessStatus.APPROVED || !isActiveAt(now)) {
            throw new IllegalStateException("활성 지원 접근만 철회할 수 있습니다.");
        }
        status = SupportAccessStatus.REVOKED;
        revokedAt = now;
        revokedBy = revoker;
    }

    public boolean isActiveAt(LocalDateTime now) {
        return status == SupportAccessStatus.APPROVED
                && accessExpiresAt != null
                && now.isBefore(accessExpiresAt);
    }

    public boolean isRequestExpiredAt(LocalDateTime now) {
        return status == SupportAccessStatus.PENDING && !now.isBefore(requestExpiresAt);
    }

    private void requirePending(LocalDateTime now) {
        if (status != SupportAccessStatus.PENDING || isRequestExpiredAt(now)) {
            throw new IllegalStateException("승인 대기 중인 유효한 요청만 처리할 수 있습니다.");
        }
    }
}
