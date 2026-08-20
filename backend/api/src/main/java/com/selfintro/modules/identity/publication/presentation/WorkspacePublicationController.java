package com.selfintro.modules.identity.publication.presentation;

import com.selfintro.bff.application.IntroductionChannel;
import com.selfintro.bff.presentation.dto.IntroductionResponse;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.identity.publication.application.WorkspacePublicationService;
import com.selfintro.modules.identity.publication.application.WorkspacePublishedContentService;
import com.selfintro.modules.identity.publication.presentation.dto.PublicStudyPreview;
import com.selfintro.modules.identity.publication.presentation.dto.WorkspacePublicationHistoryResponse;
import com.selfintro.modules.identity.publication.presentation.dto.WorkspacePublicationPublishRequest;
import com.selfintro.modules.identity.publication.presentation.dto.WorkspacePublicationRevisionResponse;
import com.selfintro.modules.identity.publication.presentation.dto.WorkspacePublicationStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/publication/manage")
@RequiredArgsConstructor
public class WorkspacePublicationController {
    private final WorkspaceAccessPolicy workspaceAccessPolicy;
    private final WorkspacePublicationService publicationService;
    private final WorkspacePublishedContentService publishedContentService;

    @GetMapping
    public WorkspacePublicationStatusResponse status(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return publicationService.status(
                readMember(authentication, workspaceSlug).getWorkspace().getId());
    }

    @PostMapping("/publish")
    public WorkspacePublicationStatusResponse publish(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @RequestBody(required = false) WorkspacePublicationPublishRequest request) {
        WorkspaceMember member = manageMember(authentication, workspaceSlug);
        String note = request == null ? null : normalizeNote(request.note());
        return publicationService.publish(
                member.getWorkspace().getId(), member.getUser().getId(), note);
    }

    @PostMapping("/revisions/{revisionNumber}/pin")
    public WorkspacePublicationRevisionResponse pin(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable int revisionNumber) {
        WorkspaceMember member = manageMember(authentication, workspaceSlug);
        return publicationService.togglePin(member.getWorkspace().getId(), revisionNumber, true);
    }

    @PostMapping("/revisions/{revisionNumber}/unpin")
    public WorkspacePublicationRevisionResponse unpin(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable int revisionNumber) {
        WorkspaceMember member = manageMember(authentication, workspaceSlug);
        return publicationService.togglePin(member.getWorkspace().getId(), revisionNumber, false);
    }

    private String normalizeNote(String note) {
        if (note == null) {
            return null;
        }
        String trimmed = note.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @GetMapping("/revisions")
    public WorkspacePublicationHistoryResponse revisions(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return publicationService.history(
                readMember(authentication, workspaceSlug).getWorkspace().getId());
    }

    @GetMapping("/revisions/{revisionNumber}/preview")
    public IntroductionResponse previewRevision(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable int revisionNumber) {
        Long workspaceId = readMember(authentication, workspaceSlug).getWorkspace().getId();
        return publishedContentService.introductionAtRevision(
                workspaceId, revisionNumber, IntroductionChannel.WEB);
    }

    @GetMapping("/revisions/{revisionNumber}/preview/study")
    public PublicStudyPreview previewRevisionStudy(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable int revisionNumber) {
        Long workspaceId = readMember(authentication, workspaceSlug).getWorkspace().getId();
        return publishedContentService.studyPreviewAtRevision(workspaceId, revisionNumber);
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
