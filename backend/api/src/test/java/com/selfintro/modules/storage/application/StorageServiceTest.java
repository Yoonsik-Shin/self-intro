package com.selfintro.modules.storage.application;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class StorageServiceTest {

    private final StorageService service = new StorageService(null, 300);

    @Test
    void finalPdfMustUseWorkspacePrivatePdfScope() {
        assertThatCode(
                        () ->
                                service.requireOwnedObjectKey(
                                        7L,
                                        ImageScope.PRINT_TEMPLATE_FINAL_PDF,
                                        "workspaces/7/print-template/final-pdf/2026/08/resume.pdf"))
                .doesNotThrowAnyException();

        assertThatThrownBy(
                        () ->
                                service.requireOwnedObjectKey(
                                        7L,
                                        ImageScope.PRINT_TEMPLATE_FINAL_PDF,
                                        "workspaces/7/experience/gallery/2026/08/resume.pdf"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void finalPdfCannotReferenceAnotherWorkspace() {
        assertThatThrownBy(
                        () ->
                                service.requireOwnedObjectKey(
                                        7L,
                                        ImageScope.PRINT_TEMPLATE_FINAL_PDF,
                                        "workspaces/8/print-template/final-pdf/2026/08/resume.pdf"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
