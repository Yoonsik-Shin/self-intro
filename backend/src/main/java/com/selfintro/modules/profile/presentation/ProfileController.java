package com.selfintro.modules.profile.presentation;

import com.selfintro.modules.profile.application.ProfileService;
import com.selfintro.modules.profile.presentation.dto.ProfileRequest;
import com.selfintro.modules.profile.presentation.dto.ProfileResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @PutMapping
    public ResponseEntity<ProfileResponse> upsert(@Valid @RequestBody ProfileRequest request) {
        return ResponseEntity.ok(ProfileResponse.from(profileService.upsert(request)));
    }
}
