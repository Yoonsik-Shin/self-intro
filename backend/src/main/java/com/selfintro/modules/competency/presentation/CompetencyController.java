package com.selfintro.modules.competency.presentation;

import com.selfintro.modules.competency.application.CompetencyService;
import com.selfintro.modules.competency.presentation.dto.CompetencyRequest;
import com.selfintro.modules.competency.presentation.dto.CompetencyResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/competencies")
@RequiredArgsConstructor
public class CompetencyController {
    private final CompetencyService competencyService;

    @GetMapping
    public ResponseEntity<List<CompetencyResponse>> list() {
        return ResponseEntity.ok(competencyService.getAll());
    }

    @PostMapping
    public ResponseEntity<CompetencyResponse> create(@Valid @RequestBody CompetencyRequest request) {
        return ResponseEntity.ok(competencyService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CompetencyResponse> update(@PathVariable Long id, @Valid @RequestBody CompetencyRequest request) {
        return ResponseEntity.ok(competencyService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        competencyService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
