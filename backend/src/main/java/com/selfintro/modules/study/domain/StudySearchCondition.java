package com.selfintro.modules.study.domain;

import java.util.List;

public record StudySearchCondition(
        String keyword,
        String category,
        List<String> tags,
        List<Long> skillIds,
        List<Long> experienceIds,
        List<Long> experienceDetailIds,
        StudyStatus status) {}
