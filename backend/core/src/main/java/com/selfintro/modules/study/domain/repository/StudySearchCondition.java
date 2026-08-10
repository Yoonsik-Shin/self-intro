package com.selfintro.modules.study.domain.repository;

import com.selfintro.modules.study.domain.entity.*;
import com.selfintro.modules.study.domain.enums.*;
import java.util.List;

public record StudySearchCondition(
        String keyword,
        List<Long> taxonomyNodeIds,
        List<String> tags,
        List<Long> skillIds,
        List<Long> experienceIds,
        List<Long> experienceDetailIds,
        StudyStatus status,
        StudySection section) {}
