package com.selfintro.modules.experience.application;

import com.selfintro.modules.experience.presentation.dto.ExperienceResponse;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

/** CAREER 타입 experience들의 기간을 병합·합산해 "N년 M개월" 형태의 총 경력 기간 문자열을 계산한다. */
public final class CareerSummaryCalculator {

    private CareerSummaryCalculator() {}

    public static String calculate(List<ExperienceResponse> experiences) {
        List<ExperienceResponse> careers =
                experiences.stream()
                        .filter(experience -> "CAREER".equals(experience.type()))
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
                continue;
            }
            if (!start.isAfter(mergedEnd.plusMonths(1))) {
                if (end.isAfter(mergedEnd)) mergedEnd = end;
            } else {
                totalMonths += Math.max(1, ChronoUnit.MONTHS.between(mergedStart, mergedEnd));
                mergedStart = start;
                mergedEnd = end;
            }
        }
        if (mergedStart != null) {
            totalMonths += Math.max(1, ChronoUnit.MONTHS.between(mergedStart, mergedEnd));
        }
        if (totalMonths == 0) return "경력 없음";
        long years = totalMonths / 12;
        long months = totalMonths % 12;
        if (years == 0) return months + "개월";
        if (months == 0) return years + "년";
        return years + "년 " + months + "개월";
    }
}
