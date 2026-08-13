package com.selfintro.jobposting.application;

import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.LlmDispatcher;
import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingCoverLetterRevision;
import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobApplication;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterItemRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterRevisionRepository;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftResponse;
import com.selfintro.vectorsearch.application.RelevantProfileDigestService;
import com.selfintro.vectorsearch.application.RelevantProfileDigestService.TopK;
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

    private static final int EXPERIENCE_TOP_K = 6;
    private static final int STUDY_TOP_K = 4;

    private final WorkspaceJobApplicationRepository applicationRepository;
    private final JobPostingCoverLetterItemRepository itemRepository;
    private final RelevantProfileDigestService relevantProfileDigestService;
    private final LlmDispatcher llmDispatcher;
    private final JobPostingCoverLetterRevisionRepository revisionRepository;

    @Transactional
    public JobPostingCoverLetterDraftResponse generateDraft(
            Long workspaceId, Long jobPostingId, JobPostingCoverLetterDraftRequest request) {
        WorkspaceJobApplication application = findApplication(workspaceId, jobPostingId);
        JobPosting posting = application.getJobPosting();
        validateItemOwnership(application.getId(), request.coverLetterItemId());

        String profileDigest = buildRelevantProfileDigest(workspaceId, posting);
        boolean hasFeedback = AiJsonSupport.hasText(request.feedbackInstruction());
        String systemPrompt = hasFeedback ? REVISION_SYSTEM_PROMPT : DRAFT_SYSTEM_PROMPT;
        String userPrompt = buildUserPrompt(posting, profileDigest, request);

        String rawDraft =
                llmDispatcher.generate(
                        systemPrompt, userPrompt, request.aiModel(), request.customModelName());
        if (rawDraft == null || rawDraft.isBlank()) {
            throw new IllegalStateException("AI 모델이 빈 응답을 반환했습니다.");
        }
        String draftAnswer = rawDraft.replace("\\n", "\n").trim();
        String modelLabel =
                llmDispatcher.resolveLabel(request.aiModel(), request.customModelName());

        // 히스토리 저장 (coverLetterItemId가 존재하는 경우)
        if (request.coverLetterItemId() != null && request.coverLetterItemId() > 0) {
            LocalDateTime now = LocalDateTime.now();
            if (hasFeedback) {
                revisionRepository.save(
                        JobPostingCoverLetterRevision.create(
                                request.coverLetterItemId(),
                                "USER",
                                request.feedbackInstruction().trim(),
                                now));
            }
            revisionRepository.save(
                    JobPostingCoverLetterRevision.create(
                            request.coverLetterItemId(), "AI", draftAnswer, modelLabel, now));
        }

        return new JobPostingCoverLetterDraftResponse(
                request.question(), draftAnswer, request.characterLimit());
    }

    /**
     * 프로필 전체를 덤프하는 대신, 채용공고 요건과 하이브리드 검색(벡터+키워드)으로 가장 관련도 높은 경험/스터디 청크만 골라 프롬프트에 넣는다. 벡터 인덱스가 아직 비어
     * 있는 경우(백필 전 등)에는 {@link RelevantProfileDigestService}가 내부적으로 전체 덤프로 폴백한다.
     */
    private String buildRelevantProfileDigest(Long workspaceId, JobPosting posting) {
        String queryText =
                JobPostingRetrievalQueryText.build(
                        posting.getPositionTitle(),
                        posting.getJobDescription(),
                        posting.getRequiredQualifications(),
                        posting.getPreferredQualifications());
        return relevantProfileDigestService.buildDigest(
                workspaceId, queryText, new TopK(EXPERIENCE_TOP_K, STUDY_TOP_K));
    }

    private WorkspaceJobApplication findApplication(Long workspaceId, Long jobPostingId) {
        return applicationRepository
                .findByWorkspaceIdAndJobPostingId(workspaceId, jobPostingId)
                .orElseThrow(
                        () ->
                                new EntityNotFoundException(
                                        "Workspace job application not found: " + jobPostingId));
    }

    private void validateItemOwnership(Long applicationId, Long itemId) {
        if (itemId == null || itemId <= 0) {
            return;
        }
        itemRepository
                .findByIdAndWorkspaceJobApplicationId(itemId, applicationId)
                .orElseThrow(
                        () ->
                                new EntityNotFoundException(
                                        "Cover letter item not found: " + itemId));
    }

    private String buildUserPrompt(
            JobPosting posting, String profileDigest, JobPostingCoverLetterDraftRequest request) {
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
            sb.append(
                    String.format(
                            "\n글자 수 제한: 공백 포함 최대로 %d자 제한입니다. 분량을 철저히 준수하여 공백 포함 약 %d자 ~ %d자 사이로 작성해 주세요.\n",
                            characterLimit, minChars, maxChars));
        } else {
            sb.append("\n글자 수 제한: 별도 제한이 없으므로 공백 포함 약 500자 ~ 700자 내외로 작성해 주세요.\n");
        }

        return sb.toString();
    }
}
