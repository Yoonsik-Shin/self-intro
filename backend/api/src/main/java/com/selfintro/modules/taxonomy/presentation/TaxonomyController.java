package com.selfintro.modules.taxonomy.presentation;

import com.selfintro.modules.taxonomy.application.TaxonomyService;
import com.selfintro.modules.taxonomy.presentation.dto.TaxonomyNodeRequest;
import com.selfintro.modules.taxonomy.presentation.dto.TaxonomyNodeResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class TaxonomyController {

    private final TaxonomyService taxonomyService;

    /** 공개 페이지에서 breadcrumb(전체 경로)를 그리는 데 필요한 전체 트리 — 읽기 전용, 인증 불필요. */
    @GetMapping("/api/taxonomy-nodes")
    public List<TaxonomyNodeResponse> findAllPublic() {
        return taxonomyService.findAll();
    }

    @GetMapping("/api/admin/taxonomy-nodes")
    public List<TaxonomyNodeResponse> findAll() {
        return taxonomyService.findAll();
    }

    @PostMapping("/api/admin/taxonomy-nodes")
    public ResponseEntity<TaxonomyNodeResponse> create(
            @Valid @RequestBody TaxonomyNodeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taxonomyService.create(request));
    }

    @PutMapping("/api/admin/taxonomy-nodes/{id}")
    public TaxonomyNodeResponse update(
            @PathVariable Long id, @Valid @RequestBody TaxonomyNodeRequest request) {
        return taxonomyService.update(id, request);
    }

    @DeleteMapping("/api/admin/taxonomy-nodes/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        taxonomyService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Void> handleNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(exception.getMessage());
    }
}
