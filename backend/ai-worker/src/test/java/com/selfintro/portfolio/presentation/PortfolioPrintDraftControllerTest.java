package com.selfintro.portfolio.presentation;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.portfolio.application.PortfolioPrintDraftService;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

class PortfolioPrintDraftControllerTest {

    @Test
    void generationRequiresEditorAccessAndUsesResolvedWorkspace() {
        PortfolioPrintDraftService service = mock(PortfolioPrintDraftService.class);
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
        PortfolioPrintDraftController controller =
                new PortfolioPrintDraftController(service, accessPolicy);

        controller.generatePrintDraftStream(
                authentication, "w-demo", 7L, "PORTRAIT", "CLAUDE", null);

        verify(service).generateStream(42L, 7L, "PORTRAIT", "CLAUDE", null);
    }
}
