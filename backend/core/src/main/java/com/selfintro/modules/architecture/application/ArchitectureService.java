package com.selfintro.modules.architecture.application;

import com.selfintro.modules.architecture.domain.entity.ArchitectureLayer;
import com.selfintro.modules.architecture.domain.entity.ArchitectureOverview;
import com.selfintro.modules.architecture.domain.repository.ArchitectureLayerRepository;
import com.selfintro.modules.architecture.domain.repository.ArchitectureOverviewRepository;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureLayerRequest;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureLayerResponse;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureOverviewRequest;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureOverviewResponse;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ArchitectureService {

    private final ArchitectureOverviewRepository overviewRepository;
    private final ArchitectureLayerRepository layerRepository;

    @Cacheable(value = "architecture:overview", key = "'default'")
    public Optional<ArchitectureOverviewResponse> getOverview() {
        return overviewRepository.findFirstOverview().map(ArchitectureOverviewResponse::from);
    }

    @Transactional
    @CacheEvict(value = "architecture:overview", allEntries = true)
    public ArchitectureOverviewResponse upsertOverview(ArchitectureOverviewRequest request) {
        ArchitectureOverview overview =
                overviewRepository
                        .findFirstOverview()
                        .map(
                                existing -> {
                                    existing.update(
                                            request.heading(),
                                            request.subheading(),
                                            request.diagramHeading(),
                                            request.diagramText());
                                    return existing;
                                })
                        .orElseGet(
                                () ->
                                        ArchitectureOverview.create(
                                                request.heading(),
                                                request.subheading(),
                                                request.diagramHeading(),
                                                request.diagramText()));
        return ArchitectureOverviewResponse.from(overviewRepository.save(overview));
    }

    public List<ArchitectureLayerResponse> getAllLayers() {
        return layerRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(ArchitectureLayerResponse::from)
                .toList();
    }

    @Cacheable(value = "architecture:layers", key = "'visible'")
    public List<ArchitectureLayerResponse> getVisibleLayers() {
        return layerRepository.findAllByVisibleTrueOrderByDisplayOrderAsc().stream()
                .map(ArchitectureLayerResponse::from)
                .toList();
    }

    @Transactional
    @CacheEvict(value = "architecture:layers", allEntries = true)
    public ArchitectureLayerResponse createLayer(ArchitectureLayerRequest request) {
        ArchitectureLayer layer =
                ArchitectureLayer.create(
                        request.icon(), request.title(), request.displayOrder(), request.visible());
        layer.replaceItems(toDrafts(request));
        return ArchitectureLayerResponse.from(layerRepository.save(layer));
    }

    @Transactional
    @CacheEvict(value = "architecture:layers", allEntries = true)
    public ArchitectureLayerResponse updateLayer(Long id, ArchitectureLayerRequest request) {
        ArchitectureLayer layer =
                layerRepository
                        .findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 아키텍처 레이어입니다."));
        layer.update(request.icon(), request.title(), request.displayOrder(), request.visible());
        layer.replaceItems(toDrafts(request));
        layerRepository.flush();
        return ArchitectureLayerResponse.from(layer);
    }

    @Transactional
    @CacheEvict(value = "architecture:layers", allEntries = true)
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
