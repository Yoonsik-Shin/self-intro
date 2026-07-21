package com.selfintro.modules.architecture.presentation.dto;

import com.selfintro.modules.architecture.domain.ArchitectureLayer;
import com.selfintro.modules.architecture.domain.ArchitectureLayerItem;
import java.util.List;

public record ArchitectureLayerResponse(
        Long id,
        String icon,
        String title,
        int displayOrder,
        boolean visible,
        List<ItemResponse> items) {
    public static ArchitectureLayerResponse from(ArchitectureLayer layer) {
        List<ItemResponse> items = layer.getItems().stream().map(ItemResponse::from).toList();
        return new ArchitectureLayerResponse(
                layer.getId(),
                layer.getIcon(),
                layer.getTitle(),
                layer.getDisplayOrder(),
                layer.isVisible(),
                items);
    }

    public record ItemResponse(Long id, String strongText, String bodyText, int displayOrder) {
        static ItemResponse from(ArchitectureLayerItem item) {
            return new ItemResponse(
                    item.getId(), item.getStrongText(), item.getBodyText(), item.getDisplayOrder());
        }
    }
}
