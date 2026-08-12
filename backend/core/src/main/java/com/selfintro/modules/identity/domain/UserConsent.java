package com.selfintro.modules.identity.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_consent")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserConsent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "consent_type", nullable = false, length = 40)
    private String consentType;

    @Column(name = "policy_version", nullable = false, length = 40)
    private String policyVersion;

    @Column(nullable = false)
    private boolean granted;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    public static UserConsent record(
            Long userId, String consentType, String policyVersion, boolean granted) {
        UserConsent consent = new UserConsent();
        consent.userId = userId;
        consent.consentType = consentType;
        consent.policyVersion = policyVersion;
        consent.granted = granted;
        consent.recordedAt = LocalDateTime.now();
        return consent;
    }
}
