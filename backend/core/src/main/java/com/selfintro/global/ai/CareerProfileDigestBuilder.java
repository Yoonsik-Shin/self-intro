package com.selfintro.global.ai;

import com.selfintro.modules.competency.domain.entity.Competency;
import com.selfintro.modules.competency.domain.entity.CompetencyEvidence;
import com.selfintro.modules.competency.domain.repository.CompetencyRepository;
import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.entity.ExperienceDetail;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.skill.domain.entity.Skill;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 지원자의 경력/프로젝트 경험과 핵심역량을 AI 프롬프트에 넣기 좋은 텍스트로 요약한다. 채용 공고 어필포인트 분석({@link
 * com.selfintro.modules.jobapplication.application.CareerAppealAnalyzer})과 AI 학습 계획 생성 양쪽에서 공유하는
 * 로직이라 여기로 뽑았다.
 */
@Component
@RequiredArgsConstructor
public class CareerProfileDigestBuilder {

    private static final int DEFAULT_MAX_LENGTH = 8000;
    private static final Set<String> CAREER_RELEVANT_TYPES = Set.of("CAREER", "PROJECT");

    private final ExperienceRepository experienceRepository;
    private final CompetencyRepository competencyRepository;

    public String build() {
        StringBuilder sb = new StringBuilder();

        experienceRepository.findAllByOrderByDisplayOrderAsc().stream()
                .filter(experience -> CAREER_RELEVANT_TYPES.contains(experience.getType()))
                .forEach(experience -> appendExperience(sb, experience));

        competencyRepository.findAllByVisibleTrueOrderByDisplayOrderAsc().stream()
                .forEach(competency -> appendCompetency(sb, competency));

        return AiJsonSupport.limit(sb.toString(), DEFAULT_MAX_LENGTH);
    }

    private void appendExperience(StringBuilder sb, Experience experience) {
        sb.append("### ").append(experience.getTitle());
        sb.append(" (").append(experience.getPeriodStart());
        if (experience.getPeriodEnd() != null) {
            sb.append(" ~ ").append(experience.getPeriodEnd());
        }
        sb.append(")\n");
        if (AiJsonSupport.hasText(experience.getSummary())) {
            sb.append(experience.getSummary()).append("\n");
        }
        if (AiJsonSupport.hasText(experience.getTakeaway())) {
            sb.append("배운 점: ").append(experience.getTakeaway()).append("\n");
        }
        List<String> skillNames = experience.getSkills().stream().map(Skill::getName).toList();
        if (!skillNames.isEmpty()) {
            sb.append("사용 기술: ").append(String.join(", ", skillNames)).append("\n");
        }
        for (ExperienceDetail detail : experience.getDetails()) {
            if (!detail.isVisible()) continue;
            sb.append("- ").append(detail.getContent());
            if (AiJsonSupport.hasText(detail.getOutcome())) {
                sb.append(" (성과: ").append(detail.getOutcome()).append(")");
            }
            sb.append("\n");
        }
        sb.append("\n");
    }

    private void appendCompetency(StringBuilder sb, Competency competency) {
        sb.append("### 핵심역량: ").append(competency.getTitle()).append("\n");
        sb.append(competency.getSummary()).append("\n");
        for (CompetencyEvidence evidence : competency.getEvidences()) {
            if (!AiJsonSupport.hasText(evidence.getEvidenceSummary())) continue;
            sb.append("- 근거(")
                    .append(evidence.getExperience().getTitle())
                    .append("): ")
                    .append(evidence.getEvidenceSummary())
                    .append("\n");
        }
        sb.append("\n");
    }
}
