package com.selfintro.jobposting.presentation;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.selfintro.jobposting.application.CoverLetterDraftAiService;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftRequest;
import org.junit.jupiter.api.Test;

class WorkspaceCoverLetterDraftAiControllerTest {

    @Test
    void generationDelegatesToService() {
        CoverLetterDraftAiService service = mock(CoverLetterDraftAiService.class);
        WorkspaceCoverLetterDraftAiController controller =
                new WorkspaceCoverLetterDraftAiController(service);
        JobPostingCoverLetterDraftRequest request =
                new JobPostingCoverLetterDraftRequest("지원 동기", 500, null, null, 9L, null, null);

        controller.generate(42L, 7L, request);

        verify(service).generateDraft(42L, 7L, request);
    }
}
