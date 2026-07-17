package com.selfintro.modules.donation.presentation;

import com.selfintro.modules.donation.application.DonationService;
import com.selfintro.modules.donation.presentation.dto.DonationCreateRequest;
import com.selfintro.modules.donation.presentation.dto.DonationCreateResponse;
import com.selfintro.modules.donation.presentation.dto.DonationStatusResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/donations")
@RequiredArgsConstructor
public class DonationController {
    private static final String COMPLETE_PAGE = """
            <!doctype html>
            <html lang="ko">
            <head><meta charset="utf-8"><title>후원 완료</title></head>
            <body style="font-family: sans-serif; text-align: center; padding-top: 4rem;">
            <p>결제가 처리되었습니다. 이 창은 닫아주세요.</p>
            <script>window.close();</script>
            </body>
            </html>
            """;

    private final DonationService donationService;

    @PostMapping
    public DonationCreateResponse create(@Valid @RequestBody DonationCreateRequest request) {
        return donationService.create(request.amount(), request.message());
    }

    @GetMapping("/{clientToken}")
    public DonationStatusResponse getStatus(@PathVariable String clientToken) {
        return donationService.getStatus(clientToken);
    }

    /** 페이앱 returnurl. 결제 완료 후 팝업이 이동해 오는 안내 페이지 (상태 갱신은 콜백이 담당). */
    @GetMapping(value = "/complete", produces = MediaType.TEXT_HTML_VALUE)
    public String complete() {
        return COMPLETE_PAGE;
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<String> handleNotFound(EntityNotFoundException exception) {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(exception.getMessage());
    }
}
