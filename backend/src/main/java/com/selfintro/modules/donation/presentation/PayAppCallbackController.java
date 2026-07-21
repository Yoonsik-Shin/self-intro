package com.selfintro.modules.donation.presentation;

import com.selfintro.modules.donation.application.DonationService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
public class PayAppCallbackController {
    private final DonationService donationService;

    @PostMapping(
            value = "/api/donations/payapp/callback",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
            produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> callback(@RequestParam Map<String, String> params) {
        boolean accepted = donationService.handleCallback(params);
        return accepted ? ResponseEntity.ok("SUCCESS") : ResponseEntity.badRequest().body("FAIL");
    }

    /** 낙관적 락 충돌(잠금 우회 경로가 생긴 경우의 안전망)은 FAIL로 응답해 페이앱 재시도에 위임한다. */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<String> handleOptimisticLockConflict(
            OptimisticLockingFailureException exception) {
        log.warn("콜백 처리 중 낙관적 락 충돌이 발생했습니다.", exception);
        return ResponseEntity.badRequest().body("FAIL");
    }
}
