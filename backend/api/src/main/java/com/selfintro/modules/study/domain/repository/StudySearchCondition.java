package com.selfintro.modules.study.domain.repository;

import com.selfintro.modules.study.domain.enums.*;
import java.util.List;

public record StudySearchCondition(
        Long workspaceId,
        String keyword,
        List<Long> taxonomyNodeIds,
        List<String> tags,
        List<Long> skillIds,
        List<Long> experienceIds,
        List<Long> experienceDetailIds,
        StudySection section) {}
