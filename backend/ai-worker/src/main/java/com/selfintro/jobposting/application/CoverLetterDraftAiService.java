package com.selfintro.jobposting.application;

import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.CareerProfileDigestBuilder;
import com.selfintro.global.ai.ClaudeAiClient;
import com.selfintro.global.ai.GeminiAiClient;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.global.ai.OpenAiClient;
import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingCoverLetterRevision;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterRevisionRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private static final String REVISION_SYSTEM_PROMPT =
            """
            당신은 지원자의 프로필과 기존 자소서 초안, 그리고 사용자의 지적/보완 요청사항을 바탕으로 자소서 답변을 고품질로 개작(Revision)하는 전문 커리어 컨설턴트입니다.

            [작성 원칙]
            1. 프로필에 명시된 실제 경험과 사실만을 근거로 삼아 작성하세요.
            2. 사용자가 지적한 피드백/보완 요청사항을 최우선으로 반영하여 기존 초안의 부족한 점을 적극 수정 및 강화하세요.
            3. 인사말이나 부연 설명 없이 곧바로 제출 가능한 자소서 답변 본문만 작성하세요.
            4. 글자 수 제약조건이 주어진 경우 이를 엄격히 준수하여 분량을 맞추세요.
            """;

    private final JobPostingRepository jobPostingRepository;
    private final CareerProfileDigestBuilder careerProfileDigestBuilder;
    private final NvidiaNimClient nvidiaNimClient;
    private final ClaudeAiClient claudeAiClient;
    private final GeminiAiClient geminiAiClient;
    private final OpenAiClient openAiClient;
    private final JobPostingCoverLetterRevisionRepository revisionRepository;

    @Transactional
    public JobPostingCoverLetterDraftResponse generateDraft(Long jobPostingId, JobPostingCoverLetterDraftRequest request) {
        JobPosting posting = jobPostingRepository.findById(jobPostingId)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 채용 공고입니다: " + jobPostingId));

        String profileDigest = careerProfileDigestBuilder.build();
        boolean hasFeedback = AiJsonSupport.hasText(request.feedbackInstruction());
        String systemPrompt = hasFeedback ? REVISION_SYSTEM_PROMPT : DRAFT_SYSTEM_PROMPT;
        String userPrompt = buildUserPrompt(posting, profileDigest, request);

        String rawDraft = generateByModel(request, systemPrompt, userPrompt);
        String draftAnswer = rawDraft.replace("\\n", "\n").trim();
        String modelLabel = resolveAiModelLabel(request.aiModel(), request.customModelName());

        // 히스토리 저장 (coverLetterItemId가 존재하는 경우)
        if (request.coverLetterItemId() != null && request.coverLetterItemId() > 0) {
            LocalDateTime now = LocalDateTime.now();
            if (hasFeedback) {
                revisionRepository.save(JobPostingCoverLetterRevision.create(
                        request.coverLetterItemId(), "USER", request.feedbackInstruction().trim(), now));
            }
            revisionRepository.save(JobPostingCoverLetterRevision.create(
                    request.coverLetterItemId(), "AI", draftAnswer, modelLabel, now));
        }

        return new JobPostingCoverLetterDraftResponse(
                request.question(),
                draftAnswer,
                request.characterLimit()
        );
    }

    private String resolveAiModelLabel(String aiModel, String customModelName) {
        if (aiModel == null || aiModel.isBlank()) return "Nvidia NIM";
        return switch (aiModel.toUpperCase()) {
            case "CLAUDE_3_5_SONNET", "CLAUDE" -> "Claude 3.5 Sonnet";
            case "CLAUDE_3_7_SONNET" -> "Claude 3.7 Sonnet";
            case "GEMINI_2_FLASH", "GEMINI" -> "Gemini 2.0 Flash";
            case "O3_MINI" -> "OpenAI o3-mini";
            case "GPT_4O", "GPT" -> "GPT-4o";
            case "CUSTOM" -> (customModelName != null && !customModelName.isBlank()) ? customModelName : "Custom LLM";
            default -> "Nvidia NIM";
        };
    }

    private String generateByModel(JobPostingCoverLetterDraftRequest request, String systemPrompt, String userPrompt) {
        String modelKey = request.aiModel() != null ? request.aiModel().toUpperCase() : "NVIDIA_NIM";

        return switch (modelKey) {
            case "CLAUDE_3_5_SONNET", "CLAUDE" -> claudeAiClient.generate(systemPrompt, userPrompt, "claude-3-5-sonnet-20241022");
            case "CLAUDE_3_7_SONNET" -> claudeAiClient.generate(systemPrompt, userPrompt, "claude-3-7-sonnet-latest");
            case "GEMINI_2_FLASH", "GEMINI" -> geminiAiClient.generate(systemPrompt, userPrompt, "gemini-2.0-flash");
            case "O3_MINI" -> openAiClient.generate(systemPrompt, userPrompt, "o3-mini");
            case "GPT_4O", "GPT" -> openAiClient.generate(systemPrompt, userPrompt, "gpt-4o");
            case "CUSTOM" -> {
                String customName = request.customModelName();
                if (!AiJsonSupport.hasText(customName)) {
                    throw new IllegalArgumentException("커스텀 모델명을 입력해 주세요.");
                }
                if (customName.startsWith("claude")) {
                    yield claudeAiClient.generate(systemPrompt, userPrompt, customName);
                } else if (customName.startsWith("gemini")) {
                    yield geminiAiClient.generate(systemPrompt, userPrompt, customName);
                } else {
                    yield openAiClient.generate(systemPrompt, userPrompt, customName);
                }
            }
            default -> nvidiaNimClient.generate(systemPrompt, userPrompt);
        };
    }

    private String buildUserPrompt(
            JobPosting posting,
            String profileDigest,
            JobPostingCoverLetterDraftRequest request) {
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
        sb.append("질문: ").append(request.question()).append("\n");

        if (AiJsonSupport.hasText(request.currentDraft())) {
            sb.append("\n## 이전 작성 초안\n").append(request.currentDraft()).append("\n");
        }

        if (AiJsonSupport.hasText(request.feedbackInstruction())) {
            sb.append("\n## 사용자의 지적사항 및 보완 요청\n");
            sb.append(request.feedbackInstruction()).append("\n");
            sb.append("위 사용자의 지적사항과 요청을 최우선으로 반영하여 이전 초안을 수정 및 보완해 주세요.\n");
        }

        Integer characterLimit = request.characterLimit();
        if (characterLimit != null && characterLimit > 0) {
            int minChars = Math.max(100, characterLimit - 100);
            int maxChars = Math.max(minChars + 10, characterLimit - 50);
            sb.append(String.format("\n글자 수 제한: 공백 포함 최대로 %d자 제한입니다. 분량을 철저히 준수하여 공백 포함 약 %d자 ~ %d자 사이로 작성해 주세요.\n",
                    characterLimit, minChars, maxChars));
        } else {
            sb.append("\n글자 수 제한: 별도 제한이 없으므로 공백 포함 약 500자 ~ 700자 내외로 작성해 주세요.\n");
        }

        return sb.toString();
    }
}

