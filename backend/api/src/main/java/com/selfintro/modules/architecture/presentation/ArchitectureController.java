package com.selfintro.modules.architecture.presentation;

import com.selfintro.modules.architecture.application.ArchitectureService;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureLayerRequest;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureLayerResponse;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureOverviewRequest;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureOverviewResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ArchitectureController {

    private final ArchitectureService architectureService;

    @GetMapping("/api/architecture/overview")
    public ResponseEntity<ArchitectureOverviewResponse> getOverview() {
        return architectureService
                .getOverview()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/api/architecture/layers")
    public ResponseEntity<List<ArchitectureLayerResponse>> getLayers() {
        return ResponseEntity.ok(architectureService.getVisibleLayers());
    }

    @PutMapping("/api/admin/architecture/overview")
    public ResponseEntity<ArchitectureOverviewResponse> updateOverview(
            @Valid @RequestBody ArchitectureOverviewRequest request) {
        return ResponseEntity.ok(architectureService.upsertOverview(request));
    }

    @GetMapping("/api/admin/architecture/layers")
    public ResponseEntity<List<ArchitectureLayerResponse>> listLayers() {
        return ResponseEntity.ok(architectureService.getAllLayers());
    }

    @PostMapping("/api/admin/architecture/layers")
    public ResponseEntity<ArchitectureLayerResponse> createLayer(
            @Valid @RequestBody ArchitectureLayerRequest request) {
        return ResponseEntity.ok(architectureService.createLayer(request));
    }

    @PutMapping("/api/admin/architecture/layers/{id}")
    public ResponseEntity<ArchitectureLayerResponse> updateLayer(
            @PathVariable Long id, @Valid @RequestBody ArchitectureLayerRequest request) {
        return ResponseEntity.ok(architectureService.updateLayer(id, request));
    }

    @DeleteMapping("/api/admin/architecture/layers/{id}")
    public ResponseEntity<Void> deleteLayer(@PathVariable Long id) {
        architectureService.deleteLayer(id);
        return ResponseEntity.noContent().build();
    }
}
