package com.selfintro.modules.donation.application;

import com.selfintro.modules.donation.config.DonationProperties;
import com.selfintro.modules.donation.domain.Donation;
import com.selfintro.modules.donation.domain.DonationRepository;
import com.selfintro.modules.donation.presentation.dto.DonationCreateResponse;
import com.selfintro.modules.donation.presentation.dto.DonationStatusResponse;
import jakarta.persistence.EntityNotFoundException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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
    /** 페이앱 pay_state: 4=결제완료, 8/16/32/64=취소 계열 */
    private static final String PAY_STATE_PAID = "4";
    private static final Set<String> PAY_STATE_CANCELED = Set.of("8", "16", "32", "64");

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

    /**
     * 페이앱 feedbackurl 콜백 처리. 검증→행 잠금 조회→상태 전이가 단일 트랜잭션으로 완결된다.
     * true(=SUCCESS 응답)는 검증을 통과한 수신에만 반환한다. 이미 반영된 중복 수신도 true를
     * 반환해 페이앱의 재전송을 멈춘다.
     */
    @Transactional
    public boolean handleCallback(Map<String, String> params) {
        if (!verifyLinkValue(params.get("linkval"))) {
            log.warn("linkval 검증에 실패한 콜백을 거부합니다.");
            return false;
        }
        String mulNo = params.get("mul_no");
        if (mulNo == null || mulNo.isBlank()) {
            return false;
        }
        Optional<Donation> found = donationRepository.findWithLockByMulNo(mulNo);
        if (found.isEmpty()) {
            // payrequest 성공 직후 크래시로 mulNo 저장이 유실된 극단 케이스. FAIL로 페이앱 재시도에 위임.
            log.warn("알 수 없는 mul_no 콜백: {}", mulNo);
            return false;
        }
        Donation donation = found.get();
        if (!matchesAmount(params.get("price"), donation.getAmount())) {
            log.warn("콜백 금액 불일치: donationId={}, price={}", donation.getId(), params.get("price"));
            return false;
        }

        String payState = params.get("pay_state");
        LocalDateTime now = LocalDateTime.now(donationClock);
        if (PAY_STATE_PAID.equals(payState)) {
            donation.markPaid(now, payState);
            return true;
        }
        if (payState != null && PAY_STATE_CANCELED.contains(payState)) {
            donation.markCanceled(now, payState);
            return true;
        }
        // 알 수 없는 상태는 수신만 인정(SUCCESS)해 재전송 루프를 막고 로그로 추적한다.
        log.warn("처리하지 않는 pay_state 콜백: donationId={}, payState={}", donation.getId(), payState);
        return true;
    }

    private boolean verifyLinkValue(String received) {
        String configured = properties.payapp().linkValue();
        if (received == null || configured.isBlank()) {
            return false;
        }
        return MessageDigest.isEqual(
                configured.getBytes(StandardCharsets.UTF_8), received.getBytes(StandardCharsets.UTF_8));
    }

    private boolean matchesAmount(String price, int amount) {
        if (price == null) {
            return false;
        }
        try {
            return Integer.parseInt(price.trim()) == amount;
        } catch (NumberFormatException exception) {
            return false;
        }
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
