package com.selfintro.modules.architecture.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.selfintro.modules.architecture.domain.ArchitectureLayer;
import com.selfintro.modules.architecture.domain.ArchitectureLayerRepository;
import com.selfintro.modules.architecture.domain.ArchitectureOverview;
import com.selfintro.modules.architecture.domain.ArchitectureOverviewRepository;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureLayerRequest;
import com.selfintro.modules.architecture.presentation.dto.ArchitectureOverviewRequest;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ArchitectureServiceTest {
    @Mock ArchitectureOverviewRepository overviewRepository;
    @Mock ArchitectureLayerRepository layerRepository;

    private ArchitectureService service;

    @BeforeEach
    void setUp() {
        service = new ArchitectureService(overviewRepository, layerRepository);
    }

    @Test
    void createsOverviewWhenNoneExists() {
        when(overviewRepository.findFirstOverview()).thenReturn(Optional.empty());
        when(overviewRepository.save(any(ArchitectureOverview.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        ArchitectureOverviewRequest request =
                new ArchitectureOverviewRequest("헤딩", "서브헤딩", "다이어그램", "diagram text");

        var response = service.upsertOverview(request);

        assertThat(response.heading()).isEqualTo("헤딩");
        assertThat(response.diagramText()).isEqualTo("diagram text");
    }

    @Test
    void updatesExistingOverviewInPlace() {
        ArchitectureOverview existing =
                ArchitectureOverview.create("옛 헤딩", "옛 서브헤딩", "옛 다이어그램", "old text");
        when(overviewRepository.findFirstOverview()).thenReturn(Optional.of(existing));
        when(overviewRepository.save(any(ArchitectureOverview.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        ArchitectureOverviewRequest request =
                new ArchitectureOverviewRequest("새 헤딩", "새 서브헤딩", "새 다이어그램", "new text");

        var response = service.upsertOverview(request);

        assertThat(response.heading()).isEqualTo("새 헤딩");
        assertThat(response.diagramText()).isEqualTo("new text");
    }

    @Test
    void createsLayerWithOrderedItems() {
        when(layerRepository.save(any(ArchitectureLayer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        ArchitectureLayerRequest request =
                new ArchitectureLayerRequest(
                        "💻",
                        "Backend Layer",
                        1,
                        true,
                        List.of(
                                new ArchitectureLayerRequest.ItemRequest("Java 21", "기반의 API 서비스"),
                                new ArchitectureLayerRequest.ItemRequest(
                                        null, "Flyway 마이그레이션 적용")));

        var response = service.createLayer(request);

        assertThat(response.title()).isEqualTo("Backend Layer");
        assertThat(response.items()).hasSize(2);
        assertThat(response.items().get(0).strongText()).isEqualTo("Java 21");
        assertThat(response.items().get(1).strongText()).isNull();
    }

    @Test
    void deletingMissingLayerThrows() {
        when(layerRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.deleteLayer(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("존재하지 않는");
    }
}
