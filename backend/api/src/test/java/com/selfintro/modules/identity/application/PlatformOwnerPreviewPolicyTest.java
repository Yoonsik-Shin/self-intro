package com.selfintro.modules.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.domain.PlatformRole;
import com.selfintro.modules.identity.domain.UserPlatformRoleRepository;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class PlatformOwnerPreviewPolicyTest {

    @Mock private UserPlatformRoleRepository platformRoleRepository;
    @Mock private WorkspaceRepository workspaceRepository;

    @Test
    void allowsOnlyPlatformOwnerOnExactConfiguredWorkspace() {
        Workspace workspace = Workspace.createPersonal("Owner Preview", "preview-workspace");
        ReflectionTestUtils.setField(workspace, "id", 7L);
        when(workspaceRepository.findById(7L)).thenReturn(Optional.of(workspace));
        when(platformRoleRepository.existsByUserIdAndRole(11L, PlatformRole.PLATFORM_OWNER))
                .thenReturn(true);
        PlatformOwnerPreviewPolicy policy =
                new PlatformOwnerPreviewPolicy(
                        platformRoleRepository,
                        workspaceRepository,
                        true,
                        " PREVIEW-WORKSPACE ,ignored-workspace");

        assertThat(policy.isAllowed(11L, 7L)).isTrue();
        assertThat(policy.isAllowed(null, 7L)).isFalse();
    }

    @Test
    void remainsFailClosedWhenDisabledOrWorkspaceIsNotAllowlisted() {
        Workspace workspace = Workspace.createPersonal("Other", "other-workspace");
        ReflectionTestUtils.setField(workspace, "id", 8L);
        when(workspaceRepository.findById(8L)).thenReturn(Optional.of(workspace));

        PlatformOwnerPreviewPolicy disabled =
                new PlatformOwnerPreviewPolicy(
                        platformRoleRepository, workspaceRepository, false, "other-workspace");
        PlatformOwnerPreviewPolicy notAllowlisted =
                new PlatformOwnerPreviewPolicy(
                        platformRoleRepository, workspaceRepository, true, "preview-workspace");

        assertThat(disabled.isAllowed(11L, 8L)).isFalse();
        assertThat(notAllowlisted.isAllowed(11L, 8L)).isFalse();
    }

    @Test
    void resolvesConfiguredWorkspaceIdsForSchedulers() {
        Workspace workspace = Workspace.createPersonal("Owner Preview", "preview-workspace");
        ReflectionTestUtils.setField(workspace, "id", 7L);
        when(workspaceRepository.findBySlug("preview-workspace"))
                .thenReturn(Optional.of(workspace));
        PlatformOwnerPreviewPolicy policy =
                new PlatformOwnerPreviewPolicy(
                        platformRoleRepository, workspaceRepository, true, "preview-workspace");

        assertThat(policy.allowedWorkspaceIds()).containsExactly(7L);
    }
}
