package com.selfintro.jobposting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.global.ai.LlmDispatcher;
import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterRevisionRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftResponse;
import com.selfintro.vectorsearch.application.RelevantProfileDigestService;
import jakarta.persistence.EntityNotFoundException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CoverLetterDraftAiServiceTest {

    @Mock private JobPostingRepository jobPostingRepository;
    @Mock private RelevantProfileDigestService relevantProfileDigestService;
    @Mock private LlmDispatcher llmDispatcher;
    @Mock private JobPostingCoverLetterRevisionRepository revisionRepository;

    private CoverLetterDraftAiService service;

    @BeforeEach
    void setUp() {
        service = new CoverLetterDraftAiService(
                jobPostingRepository,
                relevantProfileDigestService,
                llmDispatcher,
                revisionRepository);
    }

    @Test
    void generatesDraftWithCharacterLimitPrompt() {
        JobPosting posting = JobPosting.registerApplied(
                "원티드", "백엔드 개발자", null, "직접입력", null, null, false, null, null, null, null, "담당업무", "자격요건", "우대사항", null, null, null, java.time.LocalDateTime.now());
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(posting));
        when(relevantProfileDigestService.buildDigest(anyString(), any())).thenReturn("프로필 요약 정보");
        when(llmDispatcher.generate(anyString(), anyString(), any(), any())).thenReturn("생성된 AI 초안 답변입니다.");

        JobPostingCoverLetterDraftRequest request =
                new JobPostingCoverLetterDraftRequest("지원 동기를 작성하세요.", 1000, null, null, 10L, null, null);
        JobPostingCoverLetterDraftResponse response = service.generateDraft(1L, request);

        assertThat(response.question()).isEqualTo("지원 동기를 작성하세요.");
        assertThat(response.draftAnswer()).isEqualTo("생성된 AI 초안 답변입니다.");
        assertThat(response.characterLimit()).isEqualTo(1000);
        verify(revisionRepository).save(any());
    }

    @Test
    void generatesRevisionDraftWithFeedbackPrompt() {
        JobPosting posting = JobPosting.registerApplied(
                "원티드", "백엔드 개발자", null, "직접입력", null, null, false, null, null, null, null, "담당업무", "자격요건", "우대사항", null, null, null, java.time.LocalDateTime.now());
        when(jobPostingRepository.findById(1L)).thenReturn(Optional.of(posting));
        when(relevantProfileDigestService.buildDigest(anyString(), any())).thenReturn("프로필 요약 정보");
        when(llmDispatcher.generate(anyString(), anyString(), any(), any())).thenReturn("피드백이 반영되어 개작된 AI 답변입니다.");

        JobPostingCoverLetterDraftRequest request =
                new JobPostingCoverLetterDraftRequest("지원 동기를 작성하세요.", 1000, "이전 초안", "성과 수치를 더 강조해주세요.", 10L, null, null);
        JobPostingCoverLetterDraftResponse response = service.generateDraft(1L, request);

        assertThat(response.draftAnswer()).isEqualTo("피드백이 반영되어 개작된 AI 답변입니다.");
    }

    @Test
    void throwsEntityNotFoundExceptionWhenJobPostingMissing() {
        when(jobPostingRepository.findById(99L)).thenReturn(Optional.empty());

        JobPostingCoverLetterDraftRequest request =
                new JobPostingCoverLetterDraftRequest("질문", 500, null, null, null, null, null);

        assertThatThrownBy(() -> service.generateDraft(99L, request))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
