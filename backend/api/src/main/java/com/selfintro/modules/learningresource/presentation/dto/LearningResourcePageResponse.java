package com.selfintro.modules.learningresource.presentation.dto;

import java.util.List;
import org.springframework.data.domain.Page;

public record LearningResourcePageResponse(
        List<LearningResourceResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages) {
    public static LearningResourcePageResponse from(Page<LearningResourceResponse> result) {
        return new LearningResourcePageResponse(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }
}
