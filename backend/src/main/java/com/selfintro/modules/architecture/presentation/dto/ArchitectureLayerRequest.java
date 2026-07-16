package com.selfintro.modules.architecture.presentation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ArchitectureLayerRequest(
    @NotBlank @Size(max = 16) String icon,
    @NotBlank @Size(max = 120) String title,
    int displayOrder,
    boolean visible,
    @NotNull List<@Valid ItemRequest> items
) {
    public record ItemRequest(
        @Size(max = 200) String strongText,
        @NotBlank @Size(max = 500) String bodyText
    ) {}
}
