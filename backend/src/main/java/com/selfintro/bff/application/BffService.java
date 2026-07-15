package com.selfintro.bff.application;

import com.selfintro.bff.presentation.dto.IntroductionResponse;
import com.selfintro.bff.presentation.dto.LearningResponse;
import com.selfintro.modules.profile.application.ProfileService;
import com.selfintro.modules.profile.presentation.dto.ProfileResponse;
import com.selfintro.modules.experience.application.ExperienceService;
import com.selfintro.modules.experience.presentation.dto.ExperienceResponse;
import com.selfintro.modules.skill.application.SkillService;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import com.selfintro.study.service.StudyService;
import com.selfintro.study.dto.StudyPageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BffService {

    private final ProfileService profileService;
    private final ExperienceService experienceService;
    private final SkillService skillService;
    private final StudyService studyService;

    public IntroductionResponse getIntroduction() {
        ProfileResponse profile = profileService.getProfile()
            .map(ProfileResponse::from)
            .orElse(null);

        List<ExperienceResponse> experiences = experienceService.getAllExperiences().stream()
            .map(ExperienceResponse::from)
            .toList();

        List<SkillResponse> skills = skillService.getAllSkills().stream()
            .map(SkillResponse::from)
            .toList();

        return new IntroductionResponse(profile, experiences, skills);
    }

    public LearningResponse getLearning() {
        StudyPageResponse studies = studyService.searchPublished(null, null, null, null, null, null, 0, 100);
        return new LearningResponse(studies.content());
    }
}
