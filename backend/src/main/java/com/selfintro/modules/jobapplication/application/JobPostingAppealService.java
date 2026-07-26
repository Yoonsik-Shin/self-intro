package com.selfintro.modules.jobapplication.application;

import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.competency.domain.entity.Competency;
import com.selfintro.modules.competency.domain.entity.CompetencyEvidence;
import com.selfintro.modules.competency.domain.repository.CompetencyRepository;
import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.entity.ExperienceDetail;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingCandidate;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingCandidateRepository;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingCandidateResponse;
import com.selfintro.modules.skill.domain.entity.Skill;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 수집된 채용 공고 후보 하나를 지원자의 경력/프로젝트/핵심역량 데이터와 대조해, 어떤 경험을 근거로 무엇을 어필하면 좋을지 AI로 정리해 후보에 저장한다. 온디맨드(버튼 클릭
 * 시)로만 호출되며, 자동수집 시점에는 실행되지 않는다 — 모든 후보에 대해 매번 AI를 돌리면 비용/지연이 커지기 때문이다.
 */
@Service
@RequiredArgsConstructor
public class JobPostingAppealService {

    private static final String APPEAL_PROMPT =
            """
            당신은 채용 공고와 지원자의 경력을 비교해 지원 전략을 조언하는 커리어 코치입니다.
            입력으로 지원자 프로필(경력/프로젝트 요약, 각 경험의 세부 내용, 핵심역량과 그 근거)과
            채용 공고(직무, 담당업무, 자격요건, 우대사항)가 주어집니다.
            프로필에 실제로 있는 사실만 근거로 삼아 답하고, 프로필에 없는 경험이나 능력을 지어내지
            마세요. 특정 항목에 대응되는 경험이 프로필에 없다면 억지로 연결 짓지 말고 솔직하게
            보완이 필요하다고 말하세요.
            반드시 아래 마크다운 구조로, 한국어로 답하세요.

            ## 어필하기 좋은 포인트
            (자격요건/우대사항과 실제로 연결되는 경험이 있는 만큼, 각 포인트마다 굵게 강조한 제목과
            함께 어떤 경험/프로젝트를 근거로 어떻게 표현하면 좋을지 2~3문장으로 설명. 근거가 약하면
            무리해서 만들지 말고 개수를 줄이세요.)

            ## 보완이 필요해 보이는 부분
            (자격요건/우대사항 중 프로필에서 뚜렷한 근거를 찾기 어려운 항목을 짧게 나열. 없으면
            "특별히 부족한 부분은 보이지 않습니다"라고만 쓰세요.)
            """;

    private static final int MAX_PROFILE_DIGEST_LENGTH = 8000;
    private static final Set<String> CAREER_RELEVANT_TYPES = Set.of("CAREER", "PROJECT");

    private final JobPostingCandidateRepository candidateRepository;
    private final ExperienceRepository experienceRepository;
    private final CompetencyRepository competencyRepository;
    private final NvidiaNimClient nvidiaNimClient;

    @Transactional
    public JobPostingCandidateResponse analyzeAppeal(Long candidateId) {
        JobPostingCandidate candidate =
                candidateRepository
                        .findById(candidateId)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "존재하지 않는 수집 공고입니다: " + candidateId));

        String profileDigest = buildProfileDigest();
        String userPrompt = buildUserPrompt(candidate, profileDigest);
        String analysis = nvidiaNimClient.generate(APPEAL_PROMPT, userPrompt);

        candidate.applyAppealAnalysis(analysis, LocalDateTime.now());
        return JobPostingCandidateResponse.from(candidate);
    }

    private String buildUserPrompt(JobPostingCandidate candidate, String profileDigest) {
        StringBuilder sb = new StringBuilder();
        sb.append("## 지원자 프로필\n").append(profileDigest).append("\n\n");
        sb.append("## 채용 공고\n");
        sb.append("회사: ").append(candidate.getCompanyName()).append("\n");
        sb.append("직무: ").append(candidate.getTitle()).append("\n");
        appendIfPresent(sb, "담당업무", candidate.getJobDescription());
        appendIfPresent(sb, "자격요건", candidate.getRequiredQualifications());
        appendIfPresent(sb, "우대사항", candidate.getPreferredQualifications());
        return sb.toString();
    }

    private void appendIfPresent(StringBuilder sb, String label, String value) {
        if (AiJsonSupport.hasText(value)) {
            sb.append(label).append(":\n").append(value).append("\n");
        }
    }

    private String buildProfileDigest() {
        StringBuilder sb = new StringBuilder();

        experienceRepository.findAllByOrderByDisplayOrderAsc().stream()
                .filter(experience -> CAREER_RELEVANT_TYPES.contains(experience.getType()))
                .forEach(experience -> appendExperience(sb, experience));

        competencyRepository.findAllByVisibleTrueOrderByDisplayOrderAsc().stream()
                .forEach(competency -> appendCompetency(sb, competency));

        return AiJsonSupport.limit(sb.toString(), MAX_PROFILE_DIGEST_LENGTH);
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
