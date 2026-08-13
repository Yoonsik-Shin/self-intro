package com.selfintro.modules.storage.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.storage.application.ImageScope;
import com.selfintro.modules.storage.application.StorageService;
import com.selfintro.modules.storage.presentation.dto.PresignedUploadRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

class ImageUploadControllerTest {

    private StorageService storageService;
    private WorkspaceAccessPolicy workspaceAccessPolicy;
    private ImageUploadController controller;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        storageService = mock(StorageService.class);
        workspaceAccessPolicy = mock(WorkspaceAccessPolicy.class);
        authentication = mock(Authentication.class);
        controller = new ImageUploadController(storageService, workspaceAccessPolicy);
    }

    @Test
    void presignsWorkspaceOwnedGalleryObjectAfterRoleCheck() {
        Workspace workspace = mock(Workspace.class);
        WorkspaceMember member = mock(WorkspaceMember.class);
        when(workspace.getId()).thenReturn(42L);
        when(member.getWorkspace()).thenReturn(workspace);
        when(workspaceAccessPolicy.requireAnyRole(
                        authentication,
                        "w-demo",
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR))
                .thenReturn(member);
        when(storageService.presignUpload(42L, ImageScope.STUDY_GALLERY, "study.png", "image/png"))
                .thenReturn(
                        new StorageService.PresignedUpload(
                                "workspaces/42/study/gallery/object.png",
                                "https://upload.example/object.png",
                                "https://cdn.example/object.png"));

        var response =
                controller.workspacePresignUpload(
                        "w-demo",
                        new PresignedUploadRequest(
                                ImageScope.STUDY_GALLERY, "study.png", "image/png"),
                        authentication);

        assertThat(response.objectKey()).startsWith("workspaces/42/study/gallery/");
        verify(storageService)
                .presignUpload(42L, ImageScope.STUDY_GALLERY, "study.png", "image/png");
    }

    @Test
    void rejectsJobScreenshotScopesFromGenericWorkspaceUpload() {
        Workspace workspace = mock(Workspace.class);
        WorkspaceMember member = mock(WorkspaceMember.class);
        when(workspace.getId()).thenReturn(42L);
        when(member.getWorkspace()).thenReturn(workspace);
        when(workspaceAccessPolicy.requireAnyRole(
                        authentication,
                        "w-demo",
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR))
                .thenReturn(member);

        assertThatThrownBy(
                        () ->
                                controller.workspacePresignUpload(
                                        "w-demo",
                                        new PresignedUploadRequest(
                                                ImageScope.JOB_POSTING_SCREENSHOT,
                                                "job.png",
                                                "image/png"),
                                        authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("전용 임시 업로드");

        verify(storageService, never()).presignUpload(any(), any(), any(), any());
    }
}
