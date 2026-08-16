package com.selfintro.modules.competency.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.competency.application.CompetencyService;
import com.selfintro.modules.competency.presentation.dto.CompetencyRequest;
import com.selfintro.modules.competency.presentation.dto.CompetencyResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/competencies")
@RequiredArgsConstructor
public class WorkspaceCompetencyController {

    private final CompetencyService competencyService;

    @GetMapping
    public List<CompetencyResponse> list(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId) {
        return competencyService.getAll(workspaceId);
    }

    @PostMapping
    public CompetencyResponse create(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody CompetencyRequest request) {
        return competencyService.create(workspaceId, request);
    }

    @PutMapping("/{id}")
    public CompetencyResponse update(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long id,
            @Valid @RequestBody CompetencyRequest request) {
        return competencyService.update(workspaceId, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long id) {
        competencyService.delete(workspaceId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reorder")
    public List<CompetencyResponse> reorder(
            @CurrentWorkspace Long workspaceId,
            @RequestBody List<Long> ids) {
        return competencyService.reorder(workspaceId, ids);
    }
}
