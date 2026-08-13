package com.selfintro.jobposting.presentation;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.jobposting.application.GapProjectDocumentService;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

class WorkspaceGapProjectDocumentControllerTest {

    @Test
    void listingResolvesViewerWorkspaceBeforeReadingDocuments() {
        GapProjectDocumentService service = mock(GapProjectDocumentService.class);
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
                        WorkspaceRole.EDITOR,
                        WorkspaceRole.VIEWER))
                .thenReturn(member);
        WorkspaceGapProjectDocumentController controller =
                new WorkspaceGapProjectDocumentController(service, accessPolicy);

        controller.list(authentication, "w-demo", 7L);

        verify(service).list(42L, 7L);
    }

    @Test
    void generationRequiresEditorAccessAndUsesResolvedWorkspace() {
        GapProjectDocumentService service = mock(GapProjectDocumentService.class);
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
        WorkspaceGapProjectDocumentController controller =
                new WorkspaceGapProjectDocumentController(service, accessPolicy);

        controller.generate(authentication, "w-demo", 7L, "CLAUDE", null);

        verify(service).generate(42L, 7L, "CLAUDE", null);
    }
}
