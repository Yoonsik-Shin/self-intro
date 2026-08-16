package com.selfintro.modules.profile.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.profile.application.ProfileService;
import com.selfintro.modules.profile.presentation.dto.ProfileRequest;
import com.selfintro.modules.profile.presentation.dto.ProfileResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/profile")
@RequiredArgsConstructor
public class WorkspaceProfileController {

    private final ProfileService profileService;

    @GetMapping
    public ResponseEntity<ProfileResponse> get(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId) {
        return profileService
                .getProfile(workspaceId)
                .map(ProfileResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping
    public ResponseEntity<ProfileResponse> upsert(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody ProfileRequest request) {
        return ResponseEntity.ok(ProfileResponse.from(profileService.upsert(workspaceId, request)));
    }
}
