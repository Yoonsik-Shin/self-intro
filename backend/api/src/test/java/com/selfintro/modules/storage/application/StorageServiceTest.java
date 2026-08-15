package com.selfintro.modules.storage.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

class StorageServiceTest {

    private final ObjectStoragePort objectStoragePort = mock(ObjectStoragePort.class);
    private final StorageService service = new StorageService(objectStoragePort, 300);

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

    @Test
    void verifiesStoredPdfBytesAndComputesServerSideChecksum() {
        String objectKey = "workspaces/7/print-template/final-pdf/2026/08/resume.pdf";
        byte[] pdf = "%PDF-1.7\nbody".getBytes();
        when(objectStoragePort.stat(objectKey))
                .thenReturn(new ObjectStoragePort.ObjectMetadata(pdf.length, "application/pdf"));
        when(objectStoragePort.read(objectKey, 25L * 1024 * 1024)).thenReturn(pdf);

        StorageService.VerifiedPdf verified =
                service.verifyOwnedPdf(7L, ImageScope.PRINT_TEMPLATE_FINAL_PDF, objectKey);

        assertThat(verified.contentLength()).isEqualTo(pdf.length);
        assertThat(verified.contentType()).isEqualTo("application/pdf");
        assertThat(verified.sha256Checksum()).hasSize(64);
    }

    @Test
    void rejectsObjectWhoseBytesAreNotPdf() {
        String objectKey = "workspaces/7/print-template/final-pdf/2026/08/resume.pdf";
        byte[] content = "not-a-pdf".getBytes();
        when(objectStoragePort.stat(objectKey))
                .thenReturn(
                        new ObjectStoragePort.ObjectMetadata(content.length, "application/pdf"));
        when(objectStoragePort.read(objectKey, 25L * 1024 * 1024)).thenReturn(content);

        assertThatThrownBy(
                        () ->
                                service.verifyOwnedPdf(
                                        7L, ImageScope.PRINT_TEMPLATE_FINAL_PDF, objectKey))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("PDF 파일 헤더");
    }
}
