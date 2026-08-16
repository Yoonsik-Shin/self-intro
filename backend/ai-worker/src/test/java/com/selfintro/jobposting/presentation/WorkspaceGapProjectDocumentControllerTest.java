package com.selfintro.jobposting.presentation;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.selfintro.jobposting.application.GapProjectDocumentService;
import org.junit.jupiter.api.Test;

class WorkspaceGapProjectDocumentControllerTest {

    @Test
    void listingDelegatesToService() {
        GapProjectDocumentService service = mock(GapProjectDocumentService.class);
        WorkspaceGapProjectDocumentController controller =
                new WorkspaceGapProjectDocumentController(service);

        controller.list(42L, 7L);

        verify(service).list(42L, 7L);
    }

    @Test
    void generationDelegatesToService() {
        GapProjectDocumentService service = mock(GapProjectDocumentService.class);
        WorkspaceGapProjectDocumentController controller =
                new WorkspaceGapProjectDocumentController(service);

        controller.generate(42L, 7L, "CLAUDE", null);

        verify(service).generate(42L, 7L, "CLAUDE", null);
    }
}
