package com.selfintro.study.dto;

import java.util.List;
import org.springframework.data.domain.Page;

public record StudyPageResponse(
        List<StudyResponse> content, int page, int size, long totalElements, int totalPages) {
    public static StudyPageResponse from(Page<StudyResponse> result) {
        return new StudyPageResponse(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }
}
