package com.selfintro.modules.supportaccess.application;

import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.identity.domain.*;
import com.selfintro.modules.profile.domain.repository.ProfileRepository;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import com.selfintro.modules.supportaccess.domain.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SupportAccessService {

    private final SupportAccessRequestRepository requestRepository;
    private final WorkspaceRepository workspaceRepository;
    private final AppUserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final ExperienceRepository experienceRepository;
    private final StudyRepository studyRepository;
    private final SecurityAuditService auditService;

    public List<SupportAccessView> listForOperator(Long operatorUserId) {
        return requestRepository.findAllByOperatorIdOrderByRequestedAtDesc(operatorUserId).stream()
                .map(this::toView)
                .toList();
    }

    public List<SupportAccessView> listForWorkspace(Long workspaceId) {
        return requestRepository.findAllByWorkspaceIdOrderByRequestedAtDesc(workspaceId).stream()
                .map(this::toView)
                .toList();
    }

    @Transactional
    public SupportAccessView request(
            Long operatorUserId,
            String workspaceSlug,
            String reason,
            Set<SupportAccessScope> scopes,
            int durationMinutes) {
        LocalDateTime now = now();
        Workspace workspace =
                workspaceRepository
                        .findBySlugAndStatus(workspaceSlug, WorkspaceStatus.ACTIVE)
                        .orElseThrow(this::notFound);
        AppUser operator = userRepository.findById(operatorUserId).orElseThrow(this::notFound);

        boolean duplicate =
                requestRepository.findAllByOperatorIdOrderByRequestedAtDesc(operatorUserId).stream()
                        .filter(request -> request.getWorkspace().getId().equals(workspace.getId()))
                        .anyMatch(
                                request ->
                                        (request.getStatus() == SupportAccessStatus.PENDING
                                                        && !request.isRequestExpiredAt(now))
                                                || request.isActiveAt(now));
        if (duplicate) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "이미 승인 대기 중이거나 활성화된 지원 접근이 있습니다.");
        }

        return toView(
                requestRepository.save(
                        SupportAccessRequest.request(
                                workspace, operator, reason, scopes, durationMinutes, now)));
    }

    @Transactional
    public SupportAccessView approve(Long workspaceId, Long requestId, AppUser approver) {
        SupportAccessRequest request = requireWorkspaceRequest(workspaceId, requestId);
        try {
            request.approve(approver, now());
        } catch (IllegalStateException exception) {
            throw conflict(exception);
        }
        return toView(request);
    }

    @Transactional
    public SupportAccessView deny(Long workspaceId, Long requestId, AppUser denier) {
        SupportAccessRequest request = requireWorkspaceRequest(workspaceId, requestId);
        try {
            request.deny(denier, now());
        } catch (IllegalStateException exception) {
            throw conflict(exception);
        }
        return toView(request);
    }

    @Transactional
    public SupportAccessView revokeByWorkspace(Long workspaceId, Long requestId, AppUser revoker) {
        SupportAccessRequest request = requireWorkspaceRequest(workspaceId, requestId);
        try {
            request.revoke(revoker, now());
        } catch (IllegalStateException exception) {
            throw conflict(exception);
        }
        return toView(request);
    }

    @Transactional
    public SupportAccessView revokeByOperator(Long operatorUserId, Long requestId) {
        SupportAccessRequest request =
                requestRepository.findById(requestId).orElseThrow(this::notFound);
        if (!request.getOperator().getId().equals(operatorUserId)) throw notFound();
        AppUser operator = userRepository.findById(operatorUserId).orElseThrow(this::notFound);
        try {
            request.revoke(operator, now());
        } catch (IllegalStateException exception) {
            throw conflict(exception);
        }
        return toView(request);
    }

    public SupportSnapshot snapshot(
            Long operatorUserId, String workspaceSlug, SupportAccessScope scope) {
        Workspace workspace =
                workspaceRepository
                        .findBySlugAndStatus(workspaceSlug, WorkspaceStatus.ACTIVE)
                        .orElseThrow(this::notFound);
        LocalDateTime now = now();
        SupportAccessRequest grant =
                requestRepository
                        .findAllByOperatorIdAndWorkspaceIdAndStatusOrderByApprovedAtDesc(
                                operatorUserId, workspace.getId(), SupportAccessStatus.APPROVED)
                        .stream()
                        .filter(
                                request ->
                                        request.isActiveAt(now)
                                                && request.getScopes().contains(scope))
                        .findFirst()
                        .orElse(null);
        if (grant == null) {
            auditService.recordAuthorizationDenied(
                    operatorUserId, workspace.getId(), "SUPPORT_ACCESS_NOT_ACTIVE");
            throw notFound();
        }

        Object data =
                switch (scope) {
                    case PROFILE_READ ->
                            profileRepository
                                    .findByWorkspaceId(workspace.getId())
                                    .map(
                                            profile ->
                                                    new ProfileDiagnostic(
                                                            true,
                                                            profile.getEmail() != null
                                                                    && !profile.getEmail()
                                                                            .isBlank(),
                                                            profile.getPhone() != null
                                                                    && !profile.getPhone()
                                                                            .isBlank(),
                                                            profile.isPublicEmail(),
                                                            profile.isPublicPhone(),
                                                            profile.getUpdatedAt()))
                                    .orElseGet(
                                            () ->
                                                    new ProfileDiagnostic(
                                                            false, false, false, false, false,
                                                            null));
                    case EXPERIENCE_READ ->
                            new CountDiagnostic(
                                    experienceRepository
                                            .findAllByWorkspaceIdOrderByDisplayOrderAsc(
                                                    workspace.getId())
                                            .size());
                    case STUDY_READ ->
                            new CountDiagnostic(
                                    studyRepository
                                            .findAllByWorkspaceIdOrderByTitleAsc(workspace.getId())
                                            .size());
                };
        return new SupportSnapshot(
                grant.getId(),
                workspace.getId(),
                workspace.getSlug(),
                scope,
                grant.getAccessExpiresAt(),
                data);
    }

    private SupportAccessRequest requireWorkspaceRequest(Long workspaceId, Long requestId) {
        return requestRepository
                .findByIdAndWorkspaceId(requestId, workspaceId)
                .orElseThrow(this::notFound);
    }

    private SupportAccessView toView(SupportAccessRequest request) {
        LocalDateTime now = now();
        String effectiveStatus =
                request.isRequestExpiredAt(now)
                        ? "EXPIRED"
                        : request.getStatus() == SupportAccessStatus.APPROVED
                                        && !request.isActiveAt(now)
                                ? "EXPIRED"
                                : request.getStatus().name();
        return new SupportAccessView(
                request.getId(),
                request.getWorkspace().getId(),
                request.getWorkspace().getSlug(),
                request.getWorkspace().getName(),
                request.getOperator().getDisplayName(),
                request.getReason(),
                Set.copyOf(request.getScopes()),
                request.getRequestedDurationMinutes(),
                effectiveStatus,
                request.getRequestedAt(),
                request.getRequestExpiresAt(),
                request.getApprovedAt(),
                request.getAccessExpiresAt(),
                request.getRevokedAt());
    }

    private LocalDateTime now() {
        return LocalDateTime.now();
    }

    private ResponseStatusException conflict(IllegalStateException exception) {
        return new ResponseStatusException(HttpStatus.CONFLICT, exception.getMessage(), exception);
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "리소스를 찾을 수 없습니다.");
    }

    public record SupportAccessView(
            Long id,
            Long workspaceId,
            String workspaceSlug,
            String workspaceName,
            String operatorDisplayName,
            String reason,
            Set<SupportAccessScope> scopes,
            int requestedDurationMinutes,
            String status,
            LocalDateTime requestedAt,
            LocalDateTime requestExpiresAt,
            LocalDateTime approvedAt,
            LocalDateTime accessExpiresAt,
            LocalDateTime revokedAt) {}

    public record SupportSnapshot(
            Long grantId,
            Long workspaceId,
            String workspaceSlug,
            SupportAccessScope scope,
            LocalDateTime accessExpiresAt,
            Object data) {}

    public record ProfileDiagnostic(
            boolean exists,
            boolean emailConfigured,
            boolean phoneConfigured,
            boolean publicEmail,
            boolean publicPhone,
            LocalDateTime updatedAt) {}

    public record CountDiagnostic(int count) {}
}
