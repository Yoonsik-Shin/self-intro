package com.selfintro.modules.identity.publication.presentation;

import com.selfintro.bff.application.IntroductionChannel;
import com.selfintro.bff.presentation.dto.IntroductionResponse;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.identity.publication.application.PublicPageCompositionService;
import com.selfintro.modules.identity.publication.application.WorkspacePublicationProjectionBuilder;
import com.selfintro.modules.identity.publication.presentation.dto.ExperiencePreviewRequest;
import com.selfintro.modules.identity.publication.presentation.dto.ProfileExperiencePreviewRequest;
import com.selfintro.modules.identity.publication.presentation.dto.PublicExperienceDraft;
import com.selfintro.modules.identity.publication.presentation.dto.PublicExperienceSnapshot;
import com.selfintro.modules.identity.publication.presentation.dto.PublicProfileDraft;
import com.selfintro.modules.identity.publication.presentation.dto.PublicStudyDraft;
import com.selfintro.modules.identity.publication.presentation.dto.PublicStudyPreview;
import com.selfintro.modules.identity.publication.presentation.dto.StudyPreviewRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
    private final WorkspacePublicationProjectionBuilder projectionBuilder;

    @GetMapping("/preview/introduction")
    public IntroductionResponse previewIntroduction(
            Authentication authentication, @PathVariable String workspaceSlug) {
        WorkspaceMember member = readMember(authentication, workspaceSlug);
        return projectionBuilder.introduction(
                member.getWorkspace().getId(), IntroductionChannel.WEB);
    }

    @GetMapping("/preview/experience")
    public PublicExperienceSnapshot previewExperience(
            Authentication authentication, @PathVariable String workspaceSlug) {
        WorkspaceMember member = readMember(authentication, workspaceSlug);
        return projectionBuilder.experienceSnapshot(member.getWorkspace().getId());
    }

    @GetMapping("/preview/study")
    public PublicStudyPreview previewStudy(
            Authentication authentication, @PathVariable String workspaceSlug) {
        WorkspaceMember member = readMember(authentication, workspaceSlug);
        Long workspaceId = member.getWorkspace().getId();
        return new PublicStudyPreview(
                projectionBuilder.studies(workspaceId),
                projectionBuilder.studyTaxonomy(workspaceId));
    }

    /**
     * 저장하지 않은 편집 중인 초안을 그대로 계산해서 보여준다(디비에 쓰지 않음). 요청에 담기지 않은 쪽(null)은 이미 저장된 초안을 그대로 사용한다 — 왼쪽에서
     * 프로필만 만지는 중이면 경험 구성은 저장된 값을 유지한 채 프로필만 실시간으로 반영해서 보여준다.
     */
    @PostMapping("/preview/introduction")
    public IntroductionResponse previewIntroductionLive(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @RequestBody ProfileExperiencePreviewRequest request) {
        WorkspaceMember member = readMember(authentication, workspaceSlug);
        Long workspaceId = member.getWorkspace().getId();
        PublicProfileDraft profileDraft =
                request.profile() != null
                        ? request.profile()
                        : compositionService.profile(workspaceId);
        PublicExperienceDraft experienceDraft =
                request.experience() != null
                        ? request.experience()
                        : compositionService.experience(workspaceId);
        return projectionBuilder.introduction(
                workspaceId, IntroductionChannel.WEB, profileDraft, experienceDraft);
    }

    @PostMapping("/preview/experience")
    public PublicExperienceSnapshot previewExperienceLive(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @RequestBody ExperiencePreviewRequest request) {
        Long workspaceId = readMember(authentication, workspaceSlug).getWorkspace().getId();
        PublicExperienceDraft draft =
                request.experience() != null
                        ? request.experience()
                        : compositionService.experience(workspaceId);
        return projectionBuilder.experienceSnapshot(workspaceId, draft);
    }

    @PostMapping("/preview/study")
    public PublicStudyPreview previewStudyLive(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @RequestBody StudyPreviewRequest request) {
        Long workspaceId = readMember(authentication, workspaceSlug).getWorkspace().getId();
        PublicStudyDraft draft =
                request.study() != null ? request.study() : compositionService.study(workspaceId);
        return new PublicStudyPreview(
                projectionBuilder.studies(workspaceId, draft),
                projectionBuilder.studyTaxonomy(workspaceId, draft));
    }

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
