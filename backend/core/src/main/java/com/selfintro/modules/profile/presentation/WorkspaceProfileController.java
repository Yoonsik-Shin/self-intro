package com.selfintro.modules.profile.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.profile.application.ProfileService;
import com.selfintro.modules.profile.presentation.dto.ProfileRequest;
import com.selfintro.modules.profile.presentation.dto.ProfileResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/profile")
@RequiredArgsConstructor
public class WorkspaceProfileController {

    private final ProfileService profileService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping
    public ResponseEntity<ProfileResponse> get(
            @PathVariable String workspaceSlug, Authentication authentication) {
        Long workspaceId =
                workspaceAccessPolicy
                        .requireAnyRole(
                                authentication,
                                workspaceSlug,
                                WorkspaceRole.OWNER,
                                WorkspaceRole.ADMIN,
                                WorkspaceRole.EDITOR,
                                WorkspaceRole.VIEWER)
                        .getWorkspace()
                        .getId();
        return profileService
                .getProfile(workspaceId)
                .map(ProfileResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping
    public ResponseEntity<ProfileResponse> upsert(
            @PathVariable String workspaceSlug,
            @Valid @RequestBody ProfileRequest request,
            Authentication authentication) {
        Long workspaceId =
                workspaceAccessPolicy
                        .requireAnyRole(
                                authentication,
                                workspaceSlug,
                                WorkspaceRole.OWNER,
                                WorkspaceRole.ADMIN,
                                WorkspaceRole.EDITOR)
                        .getWorkspace()
                        .getId();
        return ResponseEntity.ok(ProfileResponse.from(profileService.upsert(workspaceId, request)));
    }
}
