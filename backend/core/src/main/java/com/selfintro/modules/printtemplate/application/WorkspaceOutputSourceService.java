package com.selfintro.modules.printtemplate.application;

import com.selfintro.bff.presentation.dto.IntroductionResponse;
import com.selfintro.modules.competency.application.CompetencyService;
import com.selfintro.modules.experience.application.ExperienceService;
import com.selfintro.modules.experience.presentation.dto.ExperienceResponse;
import com.selfintro.modules.profile.application.ProfileService;
import com.selfintro.modules.profile.presentation.dto.ProfileResponse;
import com.selfintro.modules.skill.application.SkillService;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 이력서·PDF 편집 전용 원본 projection. 공개 페이지의 활성 revision을 재사용하지 않고 현재 Workspace의 원본 기록 전체를 반환하며, 실제 출력 포함
 * 여부는 PrintTemplate 구성에서 결정한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceOutputSourceService {

    private final ProfileService profileService;
    private final ExperienceService experienceService;
    private final SkillService skillService;
    private final CompetencyService competencyService;

    public IntroductionResponse get(Long workspaceId) {
        List<ExperienceResponse> experiences = experienceService.listAll(workspaceId);
        List<ExperienceResponse> projects =
                experiences.stream().filter(item -> "PROJECT".equals(item.type())).toList();
        return new IntroductionResponse(
                profileService.getProfile(workspaceId).map(ProfileResponse::from).orElse(null),
                experiences,
                projects,
                skillService.getWorkspaceSkills(workspaceId).stream()
                        .map(SkillResponse::from)
                        .toList(),
                calculateCareerSummary(experiences),
                competencyService.getAll(workspaceId));
    }

    private String calculateCareerSummary(List<ExperienceResponse> experiences) {
        List<ExperienceResponse> careers =
                experiences.stream()
                        .filter(item -> "CAREER".equals(item.type()))
                        .sorted(Comparator.comparing(ExperienceResponse::periodStart))
                        .toList();
        long totalMonths = 0;
        YearMonth mergedStart = null;
        YearMonth mergedEnd = null;
        for (ExperienceResponse career : careers) {
            YearMonth start = YearMonth.from(career.periodStart());
            YearMonth end =
                    career.periodEnd() == null
                            ? YearMonth.now()
                            : YearMonth.from(career.periodEnd());
            if (end.isBefore(start)) continue;
            if (mergedStart == null) {
                mergedStart = start;
                mergedEnd = end;
            } else if (!start.isAfter(mergedEnd.plusMonths(1))) {
                if (end.isAfter(mergedEnd)) mergedEnd = end;
            } else {
                totalMonths += ChronoUnit.MONTHS.between(mergedStart, mergedEnd) + 1;
                mergedStart = start;
                mergedEnd = end;
            }
        }
        if (mergedStart != null) {
            totalMonths += ChronoUnit.MONTHS.between(mergedStart, mergedEnd) + 1;
        }
        if (totalMonths == 0) return "";
        long years = totalMonths / 12;
        long months = totalMonths % 12;
        if (years == 0) return months + "개월";
        return months == 0 ? years + "년" : years + "년 " + months + "개월";
    }
}
