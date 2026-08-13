package com.selfintro.studyplan.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.studyplan.application.StudyPlanService;
import com.selfintro.studyplan.presentation.dto.StudyPlanCategorySelectionRequest;
import com.selfintro.studyplan.presentation.dto.StudyPlanCreateRequest;
import com.selfintro.studyplan.presentation.dto.StudyPlanMessageRequest;
import com.selfintro.studyplan.presentation.dto.StudyPlanResponse;
import com.selfintro.studyplan.presentation.dto.StudyPlanSummaryResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/worker/workspaces/{workspaceSlug}/study-plans/manage")
@RequiredArgsConstructor
public class StudyPlanController {

    private final StudyPlanService studyPlanService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping
    public List<StudyPlanSummaryResponse> list(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return studyPlanService.list(readWorkspaceId(authentication, workspaceSlug));
    }

    @GetMapping("/{id}")
    public StudyPlanResponse get(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        return studyPlanService.get(readWorkspaceId(authentication, workspaceSlug), id);
    }

    @ResponseStatus(HttpStatus.CREATED)
    @PostMapping
    public StudyPlanResponse create(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody StudyPlanCreateRequest request) {
        return studyPlanService.create(
                writeWorkspaceId(authentication, workspaceSlug),
                request.weeklyAvailableMinutes(),
                request.focusGoal());
    }

    @PostMapping("/{id}/messages")
    public StudyPlanResponse sendMessage(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @Valid @RequestBody StudyPlanMessageRequest request) {
        return studyPlanService.sendMessage(
                writeWorkspaceId(authentication, workspaceSlug),
                id,
                request.content(),
                request.aiModel(),
                request.customModelName());
    }

    @PostMapping("/{id}/generate")
    public StudyPlanResponse generatePlan(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String aiModel,
            @org.springframework.web.bind.annotation.RequestParam(required = false)
                    String customModelName) {
        return studyPlanService.generatePlan(
                writeWorkspaceId(authentication, workspaceSlug), id, aiModel, customModelName);
    }

    @PostMapping("/{id}/confirm")
    public StudyPlanResponse confirm(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        return studyPlanService.confirm(writeWorkspaceId(authentication, workspaceSlug), id);
    }

    @PostMapping("/{id}/unconfirm")
    public StudyPlanResponse unconfirm(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        return studyPlanService.unconfirm(writeWorkspaceId(authentication, workspaceSlug), id);
    }

    @PatchMapping("/{id}/candidates/{resourceId}/toggle-selected")
    public StudyPlanResponse toggleCandidateSelected(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @PathVariable Long resourceId) {
        return studyPlanService.toggleCandidateSelected(
                writeWorkspaceId(authentication, workspaceSlug), id, resourceId);
    }

    @PatchMapping("/{id}/candidates/category-selection")
    public StudyPlanResponse setCategorySelected(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @Valid @RequestBody StudyPlanCategorySelectionRequest request) {
        return studyPlanService.setCategorySelected(
                writeWorkspaceId(authentication, workspaceSlug),
                id,
                request.category(),
                request.selected());
    }

    @PatchMapping("/{id}/items/{itemId}/toggle-completed")
    public StudyPlanResponse toggleCompleted(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @PathVariable Long itemId) {
        return studyPlanService.toggleCompleted(
                writeWorkspaceId(authentication, workspaceSlug), id, itemId);
    }

    @PatchMapping("/{id}/items/{itemId}/toggle-understanding")
    public StudyPlanResponse toggleUnderstanding(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @PathVariable Long itemId) {
        return studyPlanService.toggleUnderstanding(
                writeWorkspaceId(authentication, workspaceSlug), id, itemId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        studyPlanService.delete(writeWorkspaceId(authentication, workspaceSlug), id);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<String> handleNotFound(EntityNotFoundException exception) {
        return ResponseEntity.notFound().build();
    }

    private Long readWorkspaceId(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy
                .requireAnyRole(
                        authentication,
                        workspaceSlug,
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR,
                        WorkspaceRole.VIEWER)
                .getWorkspace()
                .getId();
    }

    private Long writeWorkspaceId(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy
                .requireAnyRole(
                        authentication,
                        workspaceSlug,
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR)
                .getWorkspace()
                .getId();
    }
}
