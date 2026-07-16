package com.selfintro.modules.architecture.application;

import com.selfintro.modules.architecture.domain.ArchitectureLayer;
import com.selfintro.modules.architecture.domain.ArchitectureLayerRepository;
import com.selfintro.modules.architecture.domain.ArchitectureOverview;
import com.selfintro.modules.architecture.domain.ArchitectureOverviewRepository;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureLayerRequest;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureLayerResponse;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureOverviewRequest;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureOverviewResponse;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ArchitectureService {

    private final ArchitectureOverviewRepository overviewRepository;
    private final ArchitectureLayerRepository layerRepository;

    public Optional<ArchitectureOverviewResponse> getOverview() {
        return overviewRepository.findFirstOverview().map(ArchitectureOverviewResponse::from);
    }

    @Transactional
    public ArchitectureOverviewResponse upsertOverview(ArchitectureOverviewRequest request) {
        ArchitectureOverview overview = overviewRepository.findFirstOverview()
            .map(existing -> {
                existing.update(request.heading(), request.subheading(), request.diagramHeading(), request.diagramText());
                return existing;
            })
            .orElseGet(() -> ArchitectureOverview.create(
                request.heading(), request.subheading(), request.diagramHeading(), request.diagramText()));
        return ArchitectureOverviewResponse.from(overviewRepository.save(overview));
    }

    public List<ArchitectureLayerResponse> getAllLayers() {
        return layerRepository.findAllByOrderByDisplayOrderAsc().stream()
            .map(ArchitectureLayerResponse::from)
            .toList();
    }

    public List<ArchitectureLayerResponse> getVisibleLayers() {
        return layerRepository.findAllByVisibleTrueOrderByDisplayOrderAsc().stream()
            .map(ArchitectureLayerResponse::from)
            .toList();
    }

    @Transactional
    public ArchitectureLayerResponse createLayer(ArchitectureLayerRequest request) {
        ArchitectureLayer layer = ArchitectureLayer.create(request.icon(), request.title(), request.displayOrder(), request.visible());
        layer.replaceItems(toDrafts(request));
        return ArchitectureLayerResponse.from(layerRepository.save(layer));
    }

    @Transactional
    public ArchitectureLayerResponse updateLayer(Long id, ArchitectureLayerRequest request) {
        ArchitectureLayer layer = layerRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 아키텍처 레이어입니다."));
        layer.update(request.icon(), request.title(), request.displayOrder(), request.visible());
        layer.replaceItems(toDrafts(request));
        layerRepository.flush();
        return ArchitectureLayerResponse.from(layer);
    }

    @Transactional
    public void deleteLayer(Long id) {
        if (!layerRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 아키텍처 레이어입니다.");
        }
        layerRepository.deleteById(id);
    }

    private List<ArchitectureLayer.ItemDraft> toDrafts(ArchitectureLayerRequest request) {
        return request.items().stream()
            .map(item -> new ArchitectureLayer.ItemDraft(item.strongText(), item.bodyText()))
            .toList();
    }
}
