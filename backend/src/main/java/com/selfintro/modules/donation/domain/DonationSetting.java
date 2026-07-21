package com.selfintro.modules.donation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 후원 기능 전역 설정. 항상 id=1 단일 행만 사용한다. */
@Getter
@Entity
@Table(name = "donation_setting")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DonationSetting {
    public static final long SINGLETON_ID = 1L;

    @Id private Long id;

    @Column(name = "donation_enabled", nullable = false)
    private boolean donationEnabled;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private DonationSetting(Long id, boolean donationEnabled, LocalDateTime updatedAt) {
        this.id = id;
        this.donationEnabled = donationEnabled;
        this.updatedAt = updatedAt;
    }

    public static DonationSetting defaults(LocalDateTime now) {
        return new DonationSetting(SINGLETON_ID, true, now);
    }

    public void updateEnabled(boolean enabled, LocalDateTime now) {
        this.donationEnabled = enabled;
        this.updatedAt = now;
    }
}
