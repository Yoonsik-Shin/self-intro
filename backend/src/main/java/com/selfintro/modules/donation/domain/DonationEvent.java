package com.selfintro.modules.donation.domain;

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

/** 후원 상태 변화의 append-only 이력. 생성 후 수정/삭제하지 않는다 (감사 장부). */
@Getter
@Entity
@Table(name = "donation_event")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DonationEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "donation_id", nullable = false, updatable = false)
    private Long donationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, updatable = false, length = 30)
    private DonationEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor", nullable = false, updatable = false, length = 20)
    private DonationEventActor actor;

    @Column(name = "pay_state", updatable = false, length = 10)
    private String payState;

    @Column(name = "detail", updatable = false, length = 500)
    private String detail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private DonationEvent(Long donationId, DonationEventType eventType, DonationEventActor actor,
            String payState, String detail, LocalDateTime createdAt) {
        this.donationId = donationId;
        this.eventType = eventType;
        this.actor = actor;
        this.payState = payState;
        this.detail = detail;
        this.createdAt = createdAt;
    }

    public static DonationEvent of(Long donationId, DonationEventType eventType, DonationEventActor actor,
            String payState, String detail, LocalDateTime createdAt) {
        return new DonationEvent(donationId, eventType, actor, payState, truncateDetail(detail), createdAt);
    }

    private static String truncateDetail(String detail) {
        if (detail == null) return null;
        return detail.length() > 500 ? detail.substring(0, 500) : detail;
    }
}
