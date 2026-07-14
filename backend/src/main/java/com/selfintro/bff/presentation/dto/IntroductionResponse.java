package com.selfintro.bff.presentation.dto;

import com.selfintro.modules.profile.presentation.dto.ProfileResponse;
import com.selfintro.modules.experience.presentation.dto.ExperienceResponse;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import java.util.List;

public record IntroductionResponse(
    ProfileResponse profile,
    List<ExperienceResponse> experiences,
    List<SkillResponse> skills
) {}
