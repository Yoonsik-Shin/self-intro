package com.selfintro.modules.identity.publication.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.identity.publication.application.PublicPageCompositionService;
import com.selfintro.modules.identity.publication.presentation.dto.PublicExperienceDraft;
import com.selfintro.modules.identity.publication.presentation.dto.PublicProfileDraft;
import com.selfintro.modules.identity.publication.presentation.dto.PublicStudyDraft;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceSlug}/public-page/draft")
public class PublicPageCompositionController {

    private final WorkspaceAccessPolicy workspaceAccessPolicy;
    private final PublicPageCompositionService compositionService;

    @GetMapping("/profile")
    public PublicProfileDraft profile(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return compositionService.profile(
                readMember(authentication, workspaceSlug).getWorkspace().getId());
    }

    @PutMapping("/profile")
    public PublicProfileDraft updateProfile(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody PublicProfileDraft draft) {
        WorkspaceMember member = writeMember(authentication, workspaceSlug);
        return compositionService.updateProfile(
                member.getWorkspace().getId(), member.getUser().getId(), draft);
    }

    @GetMapping("/experience")
    public PublicExperienceDraft experience(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return compositionService.experience(
                readMember(authentication, workspaceSlug).getWorkspace().getId());
    }

    @PutMapping("/experience")
    public PublicExperienceDraft updateExperience(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody PublicExperienceDraft draft) {
        WorkspaceMember member = writeMember(authentication, workspaceSlug);
        return compositionService.updateExperience(
                member.getWorkspace().getId(), member.getUser().getId(), draft);
    }

    @GetMapping("/study")
    public PublicStudyDraft study(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return compositionService.study(
                readMember(authentication, workspaceSlug).getWorkspace().getId());
    }

    @PutMapping("/study")
    public PublicStudyDraft updateStudy(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody PublicStudyDraft draft) {
        WorkspaceMember member = writeMember(authentication, workspaceSlug);
        return compositionService.updateStudy(
                member.getWorkspace().getId(), member.getUser().getId(), draft);
    }

    private WorkspaceMember readMember(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy.requireAnyRole(
                authentication,
                workspaceSlug,
                WorkspaceRole.OWNER,
                WorkspaceRole.ADMIN,
                WorkspaceRole.EDITOR,
                WorkspaceRole.VIEWER);
    }

    private WorkspaceMember writeMember(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy.requireAnyRole(
                authentication,
                workspaceSlug,
                WorkspaceRole.OWNER,
                WorkspaceRole.ADMIN,
                WorkspaceRole.EDITOR);
    }
}
