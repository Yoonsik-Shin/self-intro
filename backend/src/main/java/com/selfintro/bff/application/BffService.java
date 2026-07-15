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
import com.selfintro.modules.competency.application.CompetencyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BffService {

    private final ProfileService profileService;
    private final ExperienceService experienceService;
    private final SkillService skillService;
    private final StudyService studyService;
    private final CompetencyService competencyService;

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

        return new IntroductionResponse(
            profile, experiences, skills, calculateCareerSummary(experiences), competencyService.getVisible());
    }

    private String calculateCareerSummary(List<ExperienceResponse> experiences) {
        List<ExperienceResponse> careers = experiences.stream()
            .filter(experience -> "CAREER".equals(experience.type()))
            .sorted(Comparator.comparing(ExperienceResponse::periodStart))
            .toList();

        long totalMonths = 0;
        YearMonth mergedStart = null;
        YearMonth mergedEnd = null;

        for (ExperienceResponse career : careers) {
            YearMonth start = YearMonth.from(career.periodStart());
            YearMonth end = career.periodEnd() == null ? YearMonth.now() : YearMonth.from(career.periodEnd());
            if (end.isBefore(start)) {
                continue;
            }

            if (mergedStart == null) {
                mergedStart = start;
                mergedEnd = end;
                continue;
            }

            if (!start.isAfter(mergedEnd.plusMonths(1))) {
                if (end.isAfter(mergedEnd)) {
                    mergedEnd = end;
                }
            } else {
                totalMonths += ChronoUnit.MONTHS.between(mergedStart, mergedEnd) + 1;
                mergedStart = start;
                mergedEnd = end;
            }
        }

        if (mergedStart != null) {
            totalMonths += ChronoUnit.MONTHS.between(mergedStart, mergedEnd) + 1;
        }

        if (totalMonths == 0) {
            return "경력 없음";
        }
        long years = totalMonths / 12;
        long months = totalMonths % 12;
        if (years == 0) {
            return months + "개월";
        }
        if (months == 0) {
            return years + "년";
        }
        return years + "년 " + months + "개월";
    }

    public LearningResponse getLearning() {
        StudyPageResponse studies = studyService.searchPublished(null, null, null, null, null, null, 0, 100);
        return new LearningResponse(studies.content());
    }
}
