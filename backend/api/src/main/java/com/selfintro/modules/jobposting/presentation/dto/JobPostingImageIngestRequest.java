package com.selfintro.modules.jobposting.presentation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record JobPostingImageIngestRequest(
        @NotEmpty @Valid List<ImageRef> images, String sourceUrl) {

    public record ImageRef(
            @NotBlank String objectKey, @NotBlank String url, @NotBlank String contentType) {}
}
