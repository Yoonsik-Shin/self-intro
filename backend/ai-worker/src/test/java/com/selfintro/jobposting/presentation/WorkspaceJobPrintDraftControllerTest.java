package com.selfintro.jobposting.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.jobposting.application.JobPostingPrintDraftService;
import com.selfintro.jobposting.presentation.dto.PrintTemplateRevisionRequest;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

class WorkspaceJobPrintDraftControllerTest {

    @Test
    void generationRequiresEditorAccessAndUsesResolvedWorkspace() {
        JobPostingPrintDraftService service = mock(JobPostingPrintDraftService.class);
        WorkspaceAccessPolicy accessPolicy = mock(WorkspaceAccessPolicy.class);
        Authentication authentication = mock(Authentication.class);
        Workspace workspace = mock(Workspace.class);
        WorkspaceMember member = mock(WorkspaceMember.class);
        SseEmitter emitter = new SseEmitter();
        when(workspace.getId()).thenReturn(42L);
        when(member.getWorkspace()).thenReturn(workspace);
        when(accessPolicy.requireAnyRole(
                        authentication,
                        "w-demo",
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR))
                .thenReturn(member);
        when(service.generateStream(42L, 7L, "CLAUDE", null)).thenReturn(emitter);
        WorkspaceJobPrintDraftController controller =
                new WorkspaceJobPrintDraftController(service, accessPolicy);

        assertThat(controller.generate(authentication, "w-demo", 7L, "CLAUDE", null))
                .isSameAs(emitter);
    }

    @Test
    void revisionCannotAddressAWorkspaceWithoutEditorAccess() {
        JobPostingPrintDraftService service = mock(JobPostingPrintDraftService.class);
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
        WorkspaceJobPrintDraftController controller =
                new WorkspaceJobPrintDraftController(service, accessPolicy);

        controller.revise(
                authentication,
                "w-demo",
                7L,
                9L,
                new PrintTemplateRevisionRequest("강점을 앞쪽에 배치"),
                null,
                null);

        verify(service).reviseStream(42L, 7L, 9L, "강점을 앞쪽에 배치", null, null);
    }
}
