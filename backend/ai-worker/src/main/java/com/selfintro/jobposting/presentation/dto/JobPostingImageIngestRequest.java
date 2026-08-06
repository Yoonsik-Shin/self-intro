package com.selfintro.jobposting.presentation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/** URL 파싱이 불가능한 공고를 JD 스크린샷으로 등록할 때, 이미 presigned 업로드된 이미지 목록. */
public record JobPostingImageIngestRequest(@NotEmpty @Valid List<ImageRef> images) {

    public record ImageRef(
            @NotBlank String objectKey, @NotBlank String url, @NotBlank String contentType) {}
}
