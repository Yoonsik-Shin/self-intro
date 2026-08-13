package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.EmailChangeTokenRepository;
import com.selfintro.modules.identity.domain.EmailVerificationTokenRepository;
import com.selfintro.modules.identity.domain.PasswordResetTokenRepository;
import com.selfintro.modules.identity.domain.RegistrationInvitationRepository;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitationRepository;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitationStatus;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvitationRetentionService {

    private final RegistrationInvitationRepository registrationInvitationRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailChangeTokenRepository emailChangeTokenRepository;
    private final WorkspaceMembershipInvitationRepository workspaceInvitationRepository;

    @Value("${app.invitation-retention.enabled:true}")
    private boolean enabled;

    @Value("${app.invitation-retention.closed-for:30d}")
    private Duration closedFor;

    @Value("${app.invitation-retention.batch-size:500}")
    private int batchSize;

    @Scheduled(
            cron = "${app.invitation-retention.cleanup-cron:0 30 3 * * *}",
            zone = "${app.invitation-retention.time-zone:Asia/Seoul}")
    @Transactional
    public void scheduledCleanup() {
        if (!enabled) return;
        CleanupResult result = cleanup(LocalDateTime.now());
        if (result.totalDeleted() > 0) {
            log.info(
                    "Invitation retention cleanup completed: registration={}, emailVerification={}, passwordReset={}, emailChange={}, workspace={}",
                    result.registrationDeleted(),
                    result.emailVerificationDeleted(),
                    result.passwordResetDeleted(),
                    result.emailChangeDeleted(),
                    result.workspaceDeleted());
        }
    }

    @Transactional
    public CleanupResult cleanup(LocalDateTime now) {
        LocalDateTime cutoff = now.minus(closedFor);
        int limit = Math.max(1, Math.min(batchSize, 5000));
        PageRequest page = PageRequest.of(0, limit);

        List<Long> registrationIds =
                registrationInvitationRepository.findRetentionCandidateIds(cutoff, page);
        List<Long> emailVerificationIds =
                emailVerificationTokenRepository.findRetentionCandidateIds(cutoff, page);
        List<Long> passwordResetIds =
                passwordResetTokenRepository.findRetentionCandidateIds(cutoff, page);
        List<Long> emailChangeIds =
                emailChangeTokenRepository.findRetentionCandidateIds(cutoff, page);
        List<Long> workspaceIds =
                workspaceInvitationRepository.findRetentionCandidateIds(
                        cutoff,
                        WorkspaceMembershipInvitationStatus.PENDING,
                        WorkspaceMembershipInvitationStatus.ACCEPTED,
                        WorkspaceMembershipInvitationStatus.REVOKED,
                        WorkspaceMembershipInvitationStatus.DECLINED,
                        page);
        registrationInvitationRepository.deleteAllByIdInBatch(registrationIds);
        emailVerificationTokenRepository.deleteAllByIdInBatch(emailVerificationIds);
        passwordResetTokenRepository.deleteAllByIdInBatch(passwordResetIds);
        emailChangeTokenRepository.deleteAllByIdInBatch(emailChangeIds);
        workspaceInvitationRepository.deleteAllByIdInBatch(workspaceIds);
        return new CleanupResult(
                registrationIds.size(),
                emailVerificationIds.size(),
                passwordResetIds.size(),
                emailChangeIds.size(),
                workspaceIds.size());
    }

    public record CleanupResult(
            int registrationDeleted,
            int emailVerificationDeleted,
            int passwordResetDeleted,
            int emailChangeDeleted,
            int workspaceDeleted) {
        public int totalDeleted() {
            return registrationDeleted
                    + emailVerificationDeleted
                    + passwordResetDeleted
                    + emailChangeDeleted
                    + workspaceDeleted;
        }
    }
}
