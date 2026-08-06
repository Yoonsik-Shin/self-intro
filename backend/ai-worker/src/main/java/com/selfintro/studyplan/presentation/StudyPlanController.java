package com.selfintro.studyplan.presentation;

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
@RequestMapping("/api/admin/study-plans")
@RequiredArgsConstructor
public class StudyPlanController {

    private final StudyPlanService studyPlanService;

    @GetMapping
    public List<StudyPlanSummaryResponse> list() {
        return studyPlanService.list();
    }

    @GetMapping("/{id}")
    public StudyPlanResponse get(@PathVariable Long id) {
        return studyPlanService.get(id);
    }

    @ResponseStatus(HttpStatus.CREATED)
    @PostMapping
    public StudyPlanResponse create(@Valid @RequestBody StudyPlanCreateRequest request) {
        return studyPlanService.create(request.weeklyAvailableMinutes(), request.focusGoal());
    }

    @PostMapping("/{id}/messages")
    public StudyPlanResponse sendMessage(
            @PathVariable Long id, @Valid @RequestBody StudyPlanMessageRequest request) {
        return studyPlanService.sendMessage(id, request.content(), request.aiModel(), request.customModelName());
    }

    @PostMapping("/{id}/generate")
    public StudyPlanResponse generatePlan(
            @PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String aiModel,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String customModelName) {
        return studyPlanService.generatePlan(id, aiModel, customModelName);
    }

    @PostMapping("/{id}/confirm")
    public StudyPlanResponse confirm(@PathVariable Long id) {
        return studyPlanService.confirm(id);
    }

    @PostMapping("/{id}/unconfirm")
    public StudyPlanResponse unconfirm(@PathVariable Long id) {
        return studyPlanService.unconfirm(id);
    }

    @PatchMapping("/{id}/candidates/{resourceId}/toggle-selected")
    public StudyPlanResponse toggleCandidateSelected(
            @PathVariable Long id, @PathVariable Long resourceId) {
        return studyPlanService.toggleCandidateSelected(id, resourceId);
    }

    @PatchMapping("/{id}/candidates/category-selection")
    public StudyPlanResponse setCategorySelected(
            @PathVariable Long id, @Valid @RequestBody StudyPlanCategorySelectionRequest request) {
        return studyPlanService.setCategorySelected(id, request.category(), request.selected());
    }

    @PatchMapping("/{id}/items/{itemId}/toggle-completed")
    public StudyPlanResponse toggleCompleted(@PathVariable Long id, @PathVariable Long itemId) {
        return studyPlanService.toggleCompleted(id, itemId);
    }

    @PatchMapping("/{id}/items/{itemId}/toggle-understanding")
    public StudyPlanResponse toggleUnderstanding(@PathVariable Long id, @PathVariable Long itemId) {
        return studyPlanService.toggleUnderstanding(id, itemId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        studyPlanService.delete(id);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<String> handleNotFound(EntityNotFoundException exception) {
        return ResponseEntity.notFound().build();
    }
}
