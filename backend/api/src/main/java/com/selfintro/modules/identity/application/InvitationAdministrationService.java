package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.RegistrationInvitation;
import com.selfintro.modules.identity.domain.RegistrationInvitationRepository;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InvitationAdministrationService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RegistrationInvitationRepository invitationRepository;
    private final RegistrationSecretHasher secretHasher;
    private final InvitationEmailSender invitationEmailSender;

    @Value("${app.registration.invitation.signup-base-url:http://localhost:3000/signup}")
    private String signupBaseUrl;

    @Transactional(readOnly = true)
    public List<InvitationView> list() {
        LocalDateTime now = LocalDateTime.now();
        return invitationRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(invitation -> InvitationView.from(invitation, now))
                .toList();
    }

    @Transactional
    public IssuedInvitation issue(
            Long actorUserId,
            String label,
            String recipientEmail,
            int maxUses,
            int validForHours,
            boolean sendEmail) {
        String normalizedLabel = normalizeLabel(label);
        String canonicalRecipient = normalizeOptionalEmail(recipientEmail);
        if (maxUses < 1 || maxUses > 100) {
            throw new IllegalArgumentException("사용 가능 횟수는 1~100회여야 합니다.");
        }
        if (validForHours < 1 || validForHours > 720) {
            throw new IllegalArgumentException("유효기간은 1시간~30일이어야 합니다.");
        }
        if (canonicalRecipient != null && maxUses != 1) {
            throw new IllegalArgumentException("이메일 지정 초대는 1회용이어야 합니다.");
        }
        if (sendEmail && canonicalRecipient == null) {
            throw new IllegalArgumentException("메일 발송에는 초대받을 이메일이 필요합니다.");
        }

        LocalDateTime expiresAt = LocalDateTime.now().plusHours(validForHours);
        String rawCode = newRawCode();
        RegistrationInvitation invitation =
                invitationRepository.save(
                        RegistrationInvitation.issue(
                                secretHasher.hash(rawCode),
                                normalizedLabel,
                                canonicalRecipient,
                                expiresAt,
                                maxUses,
                                actorUserId));
        String invitationUrl = invitationUrl(rawCode);
        if (sendEmail) {
            invitationEmailSender.send(canonicalRecipient, invitationUrl, expiresAt);
            invitation.markSent(LocalDateTime.now());
        }
        return new IssuedInvitation(
                InvitationView.from(invitation, LocalDateTime.now()),
                sendEmail ? null : rawCode,
                sendEmail ? null : invitationUrl);
    }

    @Transactional
    public InvitationView revoke(Long invitationId) {
        RegistrationInvitation invitation =
                invitationRepository.findById(invitationId).orElseThrow();
        LocalDateTime now = LocalDateTime.now();
        invitation.revoke(now);
        return InvitationView.from(invitation, now);
    }

    @Transactional
    public IssuedInvitation replaceAndSend(Long actorUserId, Long invitationId) {
        RegistrationInvitation existing = invitationRepository.findById(invitationId).orElseThrow();
        if (existing.getRecipientEmailCanonical() == null) {
            throw new IllegalArgumentException("이메일이 지정된 초대만 다시 발송할 수 있습니다.");
        }
        LocalDateTime now = LocalDateTime.now();
        if ("ACTIVE".equals(existing.getStatus()) && existing.getExpiresAt().isAfter(now)) {
            existing.revoke(now);
        }
        int validForHours =
                Math.max(
                        1,
                        (int) java.time.Duration.between(now, existing.getExpiresAt()).toHours());
        return issue(
                actorUserId,
                existing.getLabel(),
                existing.getRecipientEmailCanonical(),
                1,
                Math.min(validForHours, 720),
                true);
    }

    private String newRawCode() {
        byte[] bytes = new byte[24];
        SECURE_RANDOM.nextBytes(bytes);
        return "inv_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String invitationUrl(String rawCode) {
        // Fragment values are not sent in the HTTP request, so invitation secrets do not enter
        // reverse-proxy or application access logs. The signup client consumes and removes it.
        return signupBaseUrl + "#invite=" + rawCode;
    }

    private String normalizeLabel(String label) {
        if (label == null || label.isBlank() || label.trim().length() > 120) {
            throw new IllegalArgumentException("초대 이름은 1~120자로 입력해 주세요.");
        }
        return label.trim();
    }

    private String normalizeOptionalEmail(String email) {
        if (email == null || email.isBlank()) return null;
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() > 255 || !normalized.contains("@")) {
            throw new IllegalArgumentException("유효한 이메일이 필요합니다.");
        }
        return normalized;
    }

    public record IssuedInvitation(InvitationView invitation, String code, String invitationUrl) {}

    public record InvitationView(
            Long id,
            String label,
            String recipientEmailMasked,
            String status,
            int maxUses,
            int usedCount,
            int sentCount,
            LocalDateTime lastSentAt,
            LocalDateTime expiresAt,
            LocalDateTime revokedAt,
            LocalDateTime createdAt) {
        static InvitationView from(RegistrationInvitation invitation, LocalDateTime now) {
            return new InvitationView(
                    invitation.getId(),
                    invitation.getLabel() == null ? "이름 없는 초대" : invitation.getLabel(),
                    maskEmail(invitation.getRecipientEmailCanonical()),
                    invitation.effectiveStatus(now),
                    invitation.getMaxUses(),
                    invitation.getUsedCount(),
                    invitation.getSentCount(),
                    invitation.getLastSentAt(),
                    invitation.getExpiresAt(),
                    invitation.getRevokedAt(),
                    invitation.getCreatedAt());
        }

        private static String maskEmail(String email) {
            if (email == null) return null;
            int at = email.indexOf('@');
            if (at <= 0) return "***";
            String local = email.substring(0, at);
            String visible = local.substring(0, 1);
            return visible + "***" + email.substring(at);
        }
    }
}
