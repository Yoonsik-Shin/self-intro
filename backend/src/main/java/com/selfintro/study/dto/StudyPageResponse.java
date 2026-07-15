package com.selfintro.study.dto;

import org.springframework.data.domain.Page;
import java.util.List;

public record StudyPageResponse(
        List<StudyResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public static StudyPageResponse from(Page<StudyResponse> result) {
        return new StudyPageResponse(
                result.getContent(), result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }
}
