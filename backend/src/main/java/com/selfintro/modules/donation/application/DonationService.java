package com.selfintro.modules.donation.application;

import com.selfintro.modules.donation.config.DonationProperties;
import com.selfintro.modules.donation.domain.Donation;
import com.selfintro.modules.donation.domain.DonationRepository;
import com.selfintro.modules.donation.presentation.dto.DonationCreateResponse;
import com.selfintro.modules.donation.presentation.dto.DonationStatusResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Service
@RequiredArgsConstructor
public class DonationService {
    private final DonationRepository donationRepository;
    private final PayAppClient payAppClient;
    private final DonationProperties properties;
    private final Clock donationClock;

    /**
     * 후원 생성. 페이앱 HTTP 호출이 DB 트랜잭션을 잡지 않도록 의도적으로 @Transactional을 두지 않는다
     * (save가 각자 짧은 트랜잭션으로 커밋). payUrl은 mulNo가 커밋된 뒤에만 반환되므로,
     * 이 메서드가 어느 지점에서 실패하든 "결제는 됐는데 기록이 없는" 상황은 생기지 않는다.
     */
    public DonationCreateResponse create(int amount, String message) {
        validateAmount(amount);
        Donation donation = donationRepository.save(
                Donation.request(amount, normalizeMessage(message), LocalDateTime.now(donationClock)));

        PayAppPayRequestResult result;
        try {
            result = payAppClient.payRequest(amount, donation.getClientToken());
        } catch (RuntimeException exception) {
            markFailed(donation);
            throw exception;
        }
        if (!result.success()) {
            markFailed(donation);
            log.warn("페이앱 payrequest 실패: donationId={}, error={}", donation.getId(), result.errorMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "결제 요청 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }

        donation.assignMulNo(result.mulNo());
        donationRepository.save(donation);
        return new DonationCreateResponse(donation.getClientToken(), result.payUrl());
    }

    @Transactional(readOnly = true)
    public DonationStatusResponse getStatus(String clientToken) {
        Donation donation = donationRepository.findByClientToken(clientToken)
                .orElseThrow(() -> new EntityNotFoundException("후원 내역을 찾을 수 없습니다."));
        return new DonationStatusResponse(donation.getStatus());
    }

    private void markFailed(Donation donation) {
        try {
            donation.markFailed();
            donationRepository.save(donation);
        } catch (RuntimeException exception) {
            // 실패 마킹까지 실패해도 PENDING 고아 행만 남을 뿐 정합성 문제는 없다. 로그만 남긴다.
            log.warn("후원 실패 상태 저장에 실패했습니다: donationId={}", donation.getId(), exception);
        }
    }

    private void validateAmount(int amount) {
        if (amount < properties.minAmount() || amount > properties.maxAmount()) {
            throw new IllegalArgumentException(
                    "후원 금액은 %,d원 이상 %,d원 이하여야 합니다.".formatted(properties.minAmount(), properties.maxAmount()));
        }
    }

    private String normalizeMessage(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }
        String trimmed = message.trim();
        return trimmed.length() > 200 ? trimmed.substring(0, 200) : trimmed;
    }
}
