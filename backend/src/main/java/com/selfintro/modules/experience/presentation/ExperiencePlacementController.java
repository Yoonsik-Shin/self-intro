package com.selfintro.modules.experience.presentation;

import com.selfintro.modules.experience.application.ExperiencePlacementService;
import com.selfintro.modules.experience.domain.ExperiencePlacementType;
import com.selfintro.modules.experience.presentation.dto.ExperiencePlacementRequest;
import com.selfintro.modules.experience.presentation.dto.ExperiencePlacementResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/experience-placements")
@RequiredArgsConstructor
public class ExperiencePlacementController {

    private final ExperiencePlacementService placementService;

    @GetMapping("/{placementType}")
    public ResponseEntity<List<ExperiencePlacementResponse>> list(
            @PathVariable ExperiencePlacementType placementType) {
        return ResponseEntity.ok(placementService.getAll(placementType));
    }

    @PutMapping("/{placementType}")
    public ResponseEntity<List<ExperiencePlacementResponse>> replaceAll(
            @PathVariable ExperiencePlacementType placementType,
            @Valid @RequestBody List<ExperiencePlacementRequest> requests) {
        return ResponseEntity.ok(placementService.replaceAll(placementType, requests));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(exception.getMessage());
    }
}
