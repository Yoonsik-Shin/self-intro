package com.selfintro.jobposting.presentation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * URL 파싱이 불가능한 공고를 JD 스크린샷으로 등록할 때, 이미 presigned 업로드된 이미지 목록. sourceUrl은 선택 — 있으면 "원본 보기" 링크로만 저장하고
 * 내용 파싱에는 쓰지 않는다(애초에 그 URL 텍스트 파싱을 못 믿을 상황이라 스크린샷을 쓰는 것이므로, 섞으면 다시 오염된다).
 */
public record JobPostingImageIngestRequest(
        @NotEmpty @Valid List<ImageRef> images, String sourceUrl) {

    public record ImageRef(
            @NotBlank String objectKey, @NotBlank String url, @NotBlank String contentType) {}
}
