package com.selfintro.modules.donation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "donation",
        uniqueConstraints = {
            @UniqueConstraint(name = "uk_donation_client_token", columnNames = "client_token"),
            @UniqueConstraint(name = "uk_donation_mul_no", columnNames = "mul_no")
        })
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Donation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_token", nullable = false, updatable = false, length = 36)
    private String clientToken;

    @Column(name = "amount", nullable = false)
    private int amount;

    @Column(name = "message", length = 200)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DonationStatus status;

    @Column(name = "mul_no", length = 64)
    private String mulNo;

    @Column(name = "pay_state", length = 10)
    private String payState;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "canceled_at")
    private LocalDateTime canceledAt;

    // 잠금 조회를 우회하는 경로가 생겼을 때 마지막 안전망 역할을 하는 낙관적 락 버전
    @Version
    @Column(name = "version", nullable = false)
    private long version;

    private Donation(int amount, String message, LocalDateTime createdAt) {
        this.clientToken = UUID.randomUUID().toString();
        this.amount = amount;
        this.message = message;
        this.status = DonationStatus.PENDING;
        this.createdAt = createdAt;
    }

    public static Donation request(int amount, String message, LocalDateTime createdAt) {
        return new Donation(amount, message, createdAt);
    }

    public void assignMulNo(String mulNo) {
        if (this.mulNo == null) {
            this.mulNo = mulNo;
        }
    }

    /** PENDING에서만 PAID로 전이한다. 중복 콜백은 false를 반환하며 아무것도 바꾸지 않는다. */
    public boolean markPaid(LocalDateTime paidAt, String payState) {
        if (status != DonationStatus.PENDING) {
            return false;
        }
        this.status = DonationStatus.PAID;
        this.paidAt = paidAt;
        this.payState = payState;
        return true;
    }

    /** PENDING·PAID에서만 CANCELED로 전이한다. 중복 취소는 false를 반환하며 아무것도 바꾸지 않는다. */
    public boolean markCanceled(LocalDateTime canceledAt, String payState) {
        if (status != DonationStatus.PENDING && status != DonationStatus.PAID) {
            return false;
        }
        this.status = DonationStatus.CANCELED;
        this.canceledAt = canceledAt;
        this.payState = payState;
        return true;
    }

    public void markFailed() {
        if (status == DonationStatus.PENDING) {
            this.status = DonationStatus.FAILED;
        }
    }
}
