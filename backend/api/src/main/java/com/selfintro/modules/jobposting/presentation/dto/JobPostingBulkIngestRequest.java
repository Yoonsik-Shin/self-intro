package com.selfintro.modules.jobposting.presentation.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record JobPostingBulkIngestRequest(@NotEmpty List<Row> rows) {

    public record Row(String url, List<JobPostingImageIngestRequest.ImageRef> images) {
        public boolean hasImages() {
            return images != null && !images.isEmpty();
        }
    }
}
