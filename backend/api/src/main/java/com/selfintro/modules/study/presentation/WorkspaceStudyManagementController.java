package com.selfintro.modules.study.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.study.application.StudyService;
import com.selfintro.modules.study.domain.enums.StudySection;
import com.selfintro.modules.study.presentation.dto.StudyPageResponse;
import com.selfintro.modules.study.presentation.dto.StudyRequest;
import com.selfintro.modules.study.presentation.dto.StudyResponse;
import jakarta.validation.Valid;
import java.net.URI;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/studies/manage")
@RequiredArgsConstructor
public class WorkspaceStudyManagementController {

    private final StudyService studyService;

    @GetMapping
    public StudyPageResponse search(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long taxonomyNodeId,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) List<Long> skillIds,
            @RequestParam(required = false) List<Long> experienceIds,
            @RequestParam(required = false) List<Long> experienceDetailIds,
            @RequestParam(required = false) StudySection section,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return studyService.searchAdmin(
                workspaceId,
                q,
                taxonomyNodeId,
                tags,
                skillIds,
                experienceIds,
                experienceDetailIds,
                section,
                page,
                size);
    }

    @PostMapping
    public ResponseEntity<StudyResponse> create(
            @CurrentWorkspace Long workspaceId,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody StudyRequest request) {
        StudyResponse response = studyService.create(workspaceId, request);
        return ResponseEntity.created(
                        URI.create(
                                "/api/workspaces/" + workspaceSlug + "/studies/" + response.slug()))
                .body(response);
    }

    @PutMapping("/{id}")
    public StudyResponse update(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long id,
            @Valid @RequestBody StudyRequest request) {
        return studyService.update(workspaceId, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@CurrentWorkspace Long workspaceId, @PathVariable Long id) {
        studyService.delete(workspaceId, id);
        return ResponseEntity.noContent().build();
    }
}
