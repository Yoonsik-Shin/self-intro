package com.selfintro.modules.donation.application;

import com.selfintro.modules.donation.config.DonationProperties;
import com.selfintro.modules.donation.domain.Donation;
import com.selfintro.modules.donation.domain.DonationEvent;
import com.selfintro.modules.donation.domain.DonationEventActor;
import com.selfintro.modules.donation.domain.DonationEventRepository;
import com.selfintro.modules.donation.domain.DonationEventType;
import com.selfintro.modules.donation.domain.DonationRepository;
import com.selfintro.modules.donation.domain.DonationSetting;
import com.selfintro.modules.donation.domain.DonationSettingRepository;
import com.selfintro.modules.donation.domain.DonationStatus;
import com.selfintro.modules.donation.presentation.dto.AdminDonationResponse;
import com.selfintro.modules.donation.presentation.dto.AdminDonationSummaryResponse;
import com.selfintro.modules.donation.presentation.dto.DonationEventResponse;
import com.selfintro.modules.donation.presentation.dto.KofiWebhookPayload;
import jakarta.persistence.EntityNotFoundException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DonationService {
    private final DonationRepository donationRepository;
    private final DonationEventRepository donationEventRepository;
    private final DonationSettingRepository donationSettingRepository;
    private final DonationProperties properties;
    private final Clock donationClock;

    /** Ko-fi Webhook 수신 처리. */
    @Transactional
    public boolean handleKofiWebhook(KofiWebhookPayload payload) {
        if (payload == null || !verifyKofiToken(payload.verificationToken())) {
            log.warn("Verification Token이 유효하지 않은 Ko-fi Webhook 요청을 거부합니다.");
            return false;
        }
        String transactionId = payload.kofiTransactionId();
        if (transactionId == null || transactionId.isBlank()) {
            transactionId = payload.messageId();
        }
        if (transactionId == null || transactionId.isBlank()) {
            log.warn("트랜잭션 ID가 없는 Ko-fi Webhook 요청입니다.");
            return false;
        }

        Optional<Donation> existing = donationRepository.findWithLockByMulNo(transactionId);
        if (existing.isPresent()) {
            log.info("이미 처리된 Ko-fi 후원 트랜잭션입니다: {}", transactionId);
            return true;
        }

        int amount = parseKofiAmount(payload.amount());
        String senderName =
                payload.fromName() != null && !payload.fromName().isBlank()
                        ? payload.fromName()
                        : "익명 후원자";
        String userMessage = payload.message();
        String fullMessage = (senderName + ": " + (userMessage != null ? userMessage : "")).trim();
        if (fullMessage.length() > 200) {
            fullMessage = fullMessage.substring(0, 200);
        }

        LocalDateTime now = LocalDateTime.now(donationClock);
        Donation donation = Donation.request(amount, fullMessage, now);
        donation.assignMulNo(transactionId);
        donation.markPaid(now, "KOFI");
        donationRepository.save(donation);

        recordEvent(
                donation.getId(),
                DonationEventType.PAID,
                DonationEventActor.KOFI,
                "COMPLETED",
                "Ko-fi 후원 수신: %s %s (tx: %s)"
                        .formatted(payload.amount(), payload.currency(), transactionId));

        return true;
    }

    public String getKofiPageUrl() {
        return properties.kofi() != null ? properties.kofi().pageUrl() : null;
    }

    private boolean verifyKofiToken(String receivedToken) {
        if (receivedToken == null || properties.kofi() == null) {
            return false;
        }
        String configuredToken = properties.kofi().verificationToken();
        if (configuredToken == null || configuredToken.isBlank()) {
            return false;
        }
        return MessageDigest.isEqual(
                configuredToken.getBytes(StandardCharsets.UTF_8),
                receivedToken.getBytes(StandardCharsets.UTF_8));
    }

    private int parseKofiAmount(String amountStr) {
        if (amountStr == null || amountStr.isBlank()) {
            return 0;
        }
        try {
            double val = Double.parseDouble(amountStr.trim());
            return (int) Math.round(val);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    @Transactional(readOnly = true)
    public AdminDonationSummaryResponse adminList() {
        return new AdminDonationSummaryResponse(
                donationRepository.sumAmountByStatus(DonationStatus.PAID),
                donationRepository.countByStatus(DonationStatus.PAID),
                donationRepository.findTop200ByOrderByIdDesc().stream()
                        .map(AdminDonationResponse::from)
                        .toList());
    }

    /** 설정 행이 없으면(마이그레이션 전/테스트) 기본 노출로 간주한다. */
    public boolean isDonationEnabled() {
        return donationSettingRepository
                .findById(DonationSetting.SINGLETON_ID)
                .map(DonationSetting::isDonationEnabled)
                .orElse(true);
    }

    @Transactional
    public boolean updateDonationEnabled(boolean enabled) {
        LocalDateTime now = LocalDateTime.now(donationClock);
        DonationSetting setting =
                donationSettingRepository
                        .findById(DonationSetting.SINGLETON_ID)
                        .orElseGet(
                                () ->
                                        donationSettingRepository.save(
                                                DonationSetting.defaults(now)));
        setting.updateEnabled(enabled, now);
        return setting.isDonationEnabled();
    }

    @Transactional(readOnly = true)
    public List<DonationEventResponse> adminEvents(Long donationId) {
        if (!donationRepository.existsById(donationId)) {
            throw new EntityNotFoundException("후원 내역을 찾을 수 없습니다.");
        }
        return donationEventRepository.findByDonationIdOrderByIdAsc(donationId).stream()
                .map(DonationEventResponse::from)
                .toList();
    }

    private void recordEvent(
            Long donationId,
            DonationEventType type,
            DonationEventActor actor,
            String payState,
            String detail) {
        donationEventRepository.save(
                DonationEvent.of(
                        donationId,
                        type,
                        actor,
                        payState,
                        detail,
                        LocalDateTime.now(donationClock)));
    }
}
