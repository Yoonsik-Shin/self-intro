package com.selfintro.modules.identity.publication.presentation.dto;

import com.selfintro.modules.competency.presentation.dto.CompetencyResponse;
import com.selfintro.modules.profile.presentation.dto.ProfileResponse;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import java.util.List;

public record PublicProfileSnapshot(
        ProfileResponse profile,
        List<SkillResponse> skills,
        List<CompetencyResponse> competencies) {}
