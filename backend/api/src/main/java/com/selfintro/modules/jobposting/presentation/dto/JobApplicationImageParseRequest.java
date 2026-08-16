package com.selfintro.modules.jobposting.presentation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record JobApplicationImageParseRequest(@NotEmpty List<ImagePart> images) {

    public record ImagePart(@NotNull byte[] bytes, @NotNull String mimeType) {}
}
