package com.selfintro.modules.donation.presentation;

import com.selfintro.modules.donation.application.DonationService;
import com.selfintro.modules.donation.presentation.dto.AdminDonationSummaryResponse;
import com.selfintro.modules.donation.presentation.dto.DonationConfigResponse;
import com.selfintro.modules.donation.presentation.dto.DonationEventResponse;
import com.selfintro.modules.donation.presentation.dto.DonationSettingRequest;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/donations")
@RequiredArgsConstructor
public class AdminDonationController {
    private final DonationService donationService;

    @GetMapping
    public AdminDonationSummaryResponse list() {
        return donationService.adminList();
    }

    @PutMapping("/settings")
    public DonationConfigResponse updateSettings(
            @Valid @RequestBody DonationSettingRequest request) {
        return new DonationConfigResponse(
                donationService.updateDonationEnabled(request.enabled()),
                donationService.getKofiPageUrl());
    }

    @GetMapping("/{id}/events")
    public List<DonationEventResponse> events(@PathVariable Long id) {
        return donationService.adminEvents(id);
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        donationService.cancel(id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<String> handleNotFound(EntityNotFoundException exception) {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleInvalidState(IllegalStateException exception) {
        return ResponseEntity.badRequest().body(exception.getMessage());
    }
}
