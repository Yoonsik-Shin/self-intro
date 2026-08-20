package com.selfintro.portfolio.presentation;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.selfintro.modules.portfolio.presentation.dto.PortfolioPrintDraftRevisionRequest;
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

    @Test
    void documentRevisionDelegatesToService() {
        PortfolioPrintDraftService service = mock(PortfolioPrintDraftService.class);
        PortfolioDocumentDraftController controller = new PortfolioDocumentDraftController(service);

        controller.revise(
                42L, 9L, new PortfolioPrintDraftRevisionRequest("분량을 줄여줘"), "CLAUDE", null);

        verify(service).reviseDocumentStream(42L, 9L, "분량을 줄여줘", "CLAUDE", null);
    }
}
