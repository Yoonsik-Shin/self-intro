package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.*;
import com.selfintro.modules.taxonomy.application.TaxonomySchemeService;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class RegistrationService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final AppUserRepository appUserRepository;
    private final RegistrationInvitationRepository invitationRepository;
    private final EmailVerificationTokenRepository verificationTokenRepository;
    private final UserConsentRepository userConsentRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceSlugService workspaceSlugService;
    private final RegistrationSecretHasher secretHasher;
    private final PasswordEncoder passwordEncoder;
    private final RegistrationPasswordPolicy passwordPolicy;
    private final EmailVerificationSender emailVerificationSender;
    private final TaxonomySchemeService taxonomySchemeService;

    @Value("${app.registration.email.token-valid-for:30m}")
    private Duration verificationTokenValidFor;

    @Value("${app.registration.policy.terms-version:2026-08-22}")
    private String termsVersion;

    @Value("${app.registration.policy.privacy-version:2026-08-22}")
    private String privacyVersion;

    @Value("${app.registration.policy.marketing-version:2026-08-22}")
    private String marketingVersion;

    @Transactional
    public void register(
            String invitationCode,
            String email,
            String password,
            String nickname,
            boolean termsAccepted,
            boolean privacyAccepted,
            boolean marketingAccepted) {
        if (!termsAccepted || !privacyAccepted) {
            throw new IllegalArgumentException("필수 약관에 동의해야 합니다.");
        }
        passwordPolicy.validate(password);
        String canonicalEmail = canonicalizeEmail(email);
        LocalDateTime now = LocalDateTime.now();
        RegistrationInvitation invitation =
                invitationRepository
                        .findByCodeHash(secretHasher.hash(invitationCode))
                        .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 초대 코드입니다."));
        invitation.validateForConsumption(now, canonicalEmail);

        // Existing and new addresses pass the same invitation validation and password hashing
        // boundary so an invalid invitation cannot be used as an account-existence oracle.
        String passwordHash = passwordEncoder.encode(password);
        if (appUserRepository.existsByEmailCanonical(canonicalEmail)) {
            return;
        }
        invitation.consume(now, canonicalEmail);

        AppUser user =
                appUserRepository.save(
                        AppUser.register(
                                "usr-" + UUID.randomUUID(),
                                email.trim(),
                                canonicalEmail,
                                passwordHash,
                                nickname.trim()));
        userConsentRepository.save(UserConsent.record(user.getId(), "TERMS", termsVersion, true));
        userConsentRepository.save(
                UserConsent.record(user.getId(), "PRIVACY", privacyVersion, true));
        userConsentRepository.save(
                UserConsent.record(user.getId(), "MARKETING", marketingVersion, marketingAccepted));

        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        verificationTokenRepository.save(
                EmailVerificationToken.issue(
                        user.getId(),
                        secretHasher.hash(rawToken),
                        now.plus(verificationTokenValidFor),
                        now));
        emailVerificationSender.send(user.getEmail(), rawToken);
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        EmailVerificationToken token =
                verificationTokenRepository
                        .findByTokenHash(secretHasher.hash(rawToken))
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "만료되었거나 유효하지 않은 확인 링크입니다."));
        LocalDateTime now = LocalDateTime.now();
        token.use(now);
        AppUser user = appUserRepository.findById(token.getUserId()).orElseThrow();
        user.verifyEmail(now);
    }

    @Transactional
    public Workspace createFirstWorkspace(Long userId, String workspaceName) {
        AppUser user =
                appUserRepository
                        .findById(userId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.UNAUTHORIZED,
                                                "로그인 세션이 유효하지 않습니다. 다시 로그인해 주세요."));
        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "이메일 확인이 필요합니다.");
        }
        if (!workspaceMemberRepository
                .findAllByUserIdAndStatus(userId, MembershipStatus.ACTIVE)
                .isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 Workspace가 존재합니다.");
        }
        Workspace workspace =
                workspaceRepository.save(Workspace.createPrivatePersonal(workspaceName.trim()));
        workspaceSlugService.registerCanonical(workspace);
        workspaceMemberRepository.save(WorkspaceMember.owner(workspace, user));
        taxonomySchemeService.ensureDefaultSubscription(workspace.getId());
        return workspace;
    }

    private String canonicalizeEmail(String email) {
        if (email == null || email.isBlank() || email.length() > 255 || !email.contains("@")) {
            throw new IllegalArgumentException("유효한 이메일이 필요합니다.");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
