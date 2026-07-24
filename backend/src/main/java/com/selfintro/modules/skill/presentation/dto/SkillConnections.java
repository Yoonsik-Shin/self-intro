package com.selfintro.modules.skill.presentation.dto;

import java.util.List;

public record SkillConnections(
        List<Long> studyIds, List<Long> experienceIds, List<Long> experienceDetailIds) {}
