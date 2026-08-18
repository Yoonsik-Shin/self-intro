package com.selfintro.modules.donation.presentation;

import com.selfintro.modules.donation.application.DonationService;
import com.selfintro.modules.donation.presentation.dto.DonationConfigResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/donations")
@RequiredArgsConstructor
public class DonationController {
    private final DonationService donationService;

    /** 후원 버튼 노출 여부 등 공개 설정. */
    @GetMapping("/config")
    public DonationConfigResponse config() {
        return new DonationConfigResponse(
                donationService.isDonationEnabled(), donationService.getKofiPageUrl());
    }
}
