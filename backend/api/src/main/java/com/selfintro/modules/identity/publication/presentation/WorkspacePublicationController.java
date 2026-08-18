package com.selfintro.modules.identity.publication.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.identity.publication.application.WorkspacePublicationService;
import com.selfintro.modules.identity.publication.presentation.dto.WorkspacePublicationHistoryResponse;
import com.selfintro.modules.identity.publication.presentation.dto.WorkspacePublicationStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/publication/manage")
@RequiredArgsConstructor
public class WorkspacePublicationController {
    private final WorkspaceAccessPolicy workspaceAccessPolicy;
    private final WorkspacePublicationService publicationService;

    @GetMapping
    public WorkspacePublicationStatusResponse status(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return publicationService.status(
                readMember(authentication, workspaceSlug).getWorkspace().getId());
    }

    @PostMapping("/publish")
    public WorkspacePublicationStatusResponse publish(
            Authentication authentication, @PathVariable String workspaceSlug) {
        WorkspaceMember member = manageMember(authentication, workspaceSlug);
        return publicationService.publish(member.getWorkspace().getId(), member.getUser().getId());
    }

    @GetMapping("/revisions")
    public WorkspacePublicationHistoryResponse revisions(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return publicationService.history(
                readMember(authentication, workspaceSlug).getWorkspace().getId());
    }

    @PostMapping("/revisions/{revisionNumber}/rollback")
    public WorkspacePublicationStatusResponse rollback(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable int revisionNumber) {
        WorkspaceMember member = manageMember(authentication, workspaceSlug);
        return publicationService.rollback(
                member.getWorkspace().getId(), revisionNumber, member.getUser().getId());
    }

    @PostMapping("/unpublish")
    public WorkspacePublicationStatusResponse unpublish(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return publicationService.unpublish(
                manageMember(authentication, workspaceSlug).getWorkspace().getId());
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

    private WorkspaceMember manageMember(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy.requireAnyRole(
                authentication, workspaceSlug, WorkspaceRole.OWNER, WorkspaceRole.ADMIN);
    }
}
