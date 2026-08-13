package com.selfintro.jobposting.presentation;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.jobposting.application.CoverLetterDraftAiService;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftRequest;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

class WorkspaceCoverLetterDraftAiControllerTest {

    @Test
    void generationRequiresEditorAccessAndUsesTheResolvedWorkspace() {
        CoverLetterDraftAiService service = mock(CoverLetterDraftAiService.class);
        WorkspaceAccessPolicy accessPolicy = mock(WorkspaceAccessPolicy.class);
        Authentication authentication = mock(Authentication.class);
        Workspace workspace = mock(Workspace.class);
        WorkspaceMember member = mock(WorkspaceMember.class);
        when(workspace.getId()).thenReturn(42L);
        when(member.getWorkspace()).thenReturn(workspace);
        when(accessPolicy.requireAnyRole(
                        authentication,
                        "w-demo",
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR))
                .thenReturn(member);
        WorkspaceCoverLetterDraftAiController controller =
                new WorkspaceCoverLetterDraftAiController(service, accessPolicy);
        JobPostingCoverLetterDraftRequest request =
                new JobPostingCoverLetterDraftRequest(
                        "지원 동기", 500, null, null, 9L, null, null);

        controller.generate(authentication, "w-demo", 7L, request);

        verify(service).generateDraft(42L, 7L, request);
    }
}
