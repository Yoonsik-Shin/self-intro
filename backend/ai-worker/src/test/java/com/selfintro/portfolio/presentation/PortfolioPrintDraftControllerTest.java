package com.selfintro.portfolio.presentation;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.selfintro.portfolio.application.PortfolioPrintDraftService;
import org.junit.jupiter.api.Test;

class PortfolioPrintDraftControllerTest {

    @Test
    void generationDelegatesToService() {
        PortfolioPrintDraftService service = mock(PortfolioPrintDraftService.class);
        PortfolioPrintDraftController controller = new PortfolioPrintDraftController(service);

        controller.generatePrintDraftStream(42L, 7L, "PORTRAIT", "CLAUDE", null);

        verify(service).generateStream(42L, 7L, "PORTRAIT", "CLAUDE", null);
    }
}
