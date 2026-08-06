package com.selfintro.jobposting.application;

import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.CareerProfileDigestBuilder;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftResponse;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CoverLetterDraftAiService {

    private static final String DRAFT_SYSTEM_PROMPT =
            """
            당신은 채용 공고와 지원자의 경력/프로젝트/공부/역량 프로필을 바탕으로 합격 가능성이 높은 자기소개서 초안을 작성하는 전문 커리어 컨설턴트입니다.

            [작성 원칙]
            1. 프로필에 명시된 실제 경험, 프로젝트, 공부 내용, 핵심역량만을 근거로 작성하고, 프로필에 없는 사실을 허위로 지어내지 마세요.
            2. 채용 공고의 직무 요구사항과 연결고리를 명확히 하여 설득력 있게 작성하세요.
            3. 인사말("안녕하세요", "초안입니다")이나 추가적인 설명 없이 곧바로 제출 가능한 자소서 답변 본문만 작성하세요.
            4. 글자 수 제약조건이 주어진 경우 이를 엄격히 준수하여 분량을 맞추세요.
            """;

    private final JobPostingRepository jobPostingRepository;
    private final CareerProfileDigestBuilder careerProfileDigestBuilder;
    private final NvidiaNimClient nvidiaNimClient;

    public JobPostingCoverLetterDraftResponse generateDraft(Long jobPostingId, JobPostingCoverLetterDraftRequest request) {
        JobPosting posting = jobPostingRepository.findById(jobPostingId)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 채용 공고입니다: " + jobPostingId));

        String profileDigest = careerProfileDigestBuilder.build();
        String userPrompt = buildUserPrompt(posting, profileDigest, request.question(), request.characterLimit());

        String rawDraft = nvidiaNimClient.generate(DRAFT_SYSTEM_PROMPT, userPrompt);
        String draftAnswer = rawDraft.replace("\\n", "\n").trim();

        return new JobPostingCoverLetterDraftResponse(
                request.question(),
                draftAnswer,
                request.characterLimit()
        );
    }

    private String buildUserPrompt(
            JobPosting posting,
            String profileDigest,
            String question,
            Integer characterLimit) {
        StringBuilder sb = new StringBuilder();
        sb.append("## 지원자 프로필 (경력/프로젝트/공부/역량)\n").append(profileDigest).append("\n\n");
        sb.append("## 지원 대상 채용 공고\n");
        sb.append("회사: ").append(posting.getCompanyName()).append("\n");
        sb.append("직무: ").append(posting.getPositionTitle()).append("\n");
        if (AiJsonSupport.hasText(posting.getJobDescription())) {
            sb.append("담당업무:\n").append(posting.getJobDescription()).append("\n");
        }
        if (AiJsonSupport.hasText(posting.getRequiredQualifications())) {
            sb.append("자격요건:\n").append(posting.getRequiredQualifications()).append("\n");
        }
        if (AiJsonSupport.hasText(posting.getPreferredQualifications())) {
            sb.append("우대사항:\n").append(posting.getPreferredQualifications()).append("\n");
        }
        sb.append("\n## 작성할 자기소개서 문항\n");
        sb.append("질문: ").append(question).append("\n");

        if (characterLimit != null && characterLimit > 0) {
            int minChars = Math.max(100, characterLimit - 100);
            int maxChars = Math.max(minChars + 10, characterLimit - 50);
            sb.append(String.format("글자 수 제한: 공백 포함 최대로 %d자 제한입니다. 분량을 철저히 준수하여 공백 포함 약 %d자 ~ %d자 사이로 작성해 주세요.\n",
                    characterLimit, minChars, maxChars));
        } else {
            sb.append("글자 수 제한: 별도 제한이 없으므로 공백 포함 약 500자 ~ 700자 내외로 작성해 주세요.\n");
        }

        return sb.toString();
    }
}
