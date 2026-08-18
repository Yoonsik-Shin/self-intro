package com.selfintro.modules.jobposting.presentation;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.selfintro.modules.jobposting.application.WorkspaceJobApplicationCoverLetterService;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterSaveRequest;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WorkspaceJobCoverLetterControllerTest {

    private WorkspaceJobApplicationCoverLetterService service;
    private WorkspaceJobCoverLetterController controller;

    @BeforeEach
    void setUp() {
        service = mock(WorkspaceJobApplicationCoverLetterService.class);
        controller = new WorkspaceJobCoverLetterController(service);
    }

    @Test
    void viewerCanReadItemsFromResolvedWorkspaceOnly() {
        controller.list(42L, 7L);

        verify(service).list(42L, 7L);
    }

    @Test
    void replaceRequiresEditorRole() {
        JobPostingCoverLetterSaveRequest request = new JobPostingCoverLetterSaveRequest(List.of());

        controller.replace(42L, 7L, request);

        verify(service).replace(42L, 7L, request);
    }
}
