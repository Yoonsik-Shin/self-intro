package com.selfintro.study.repository;

import com.selfintro.study.entity.StudyStatus;
import java.util.List;

public record StudySearchCondition(
        String keyword,
        String category,
        List<String> tags,
        List<Long> skillIds,
        List<Long> experienceIds,
        List<Long> experienceDetailIds,
        StudyStatus status) {}
