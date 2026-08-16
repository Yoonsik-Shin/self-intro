package com.selfintro.jobposting.presentation;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.selfintro.jobposting.application.WorkspaceJobApplicationMatchingService;
import org.junit.jupiter.api.Test;

class WorkspaceJobApplicationMatchingControllerTest {

    @Test
    void rematchDelegatesToService() {
        WorkspaceJobApplicationMatchingService service =
                mock(WorkspaceJobApplicationMatchingService.class);
        WorkspaceJobApplicationMatchingController controller =
                new WorkspaceJobApplicationMatchingController(service);

        controller.rematch(42L, 7L);

        verify(service).rematch(42L, 7L);
    }
}
