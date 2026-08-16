package com.selfintro.modules.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.application.PlatformOperationsOverviewService.PlatformOperationsOverview;
import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.identity.domain.MembershipStatus;
import com.selfintro.modules.identity.domain.UserStatus;
import com.selfintro.modules.identity.domain.WorkspaceMemberRepository;
import com.selfintro.modules.identity.domain.WorkspacePublicationStatus;
import com.selfintro.modules.identity.domain.WorkspaceRepository;
import com.selfintro.modules.identity.domain.WorkspaceStatus;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PlatformOperationsOverviewServiceTest {

    @Mock private AppUserRepository appUserRepository;
    @Mock private WorkspaceRepository workspaceRepository;
    @Mock private WorkspaceMemberRepository workspaceMemberRepository;

    @Test
    void returnsOnlyAggregateOperationalCounts() {
        PlatformOperationsOverviewService service =
                new PlatformOperationsOverviewService(
                        appUserRepository, workspaceRepository, workspaceMemberRepository);
        when(appUserRepository.count()).thenReturn(12L);
        when(appUserRepository.countByStatus(UserStatus.PENDING_VERIFICATION)).thenReturn(2L);
        when(appUserRepository.countByStatus(UserStatus.ACTIVE)).thenReturn(8L);
        when(appUserRepository.countByStatus(UserStatus.SUSPENDED)).thenReturn(1L);
        when(appUserRepository.countByStatus(UserStatus.DELETED)).thenReturn(1L);
        when(workspaceRepository.count()).thenReturn(10L);
        when(workspaceRepository.countByStatus(WorkspaceStatus.ACTIVE)).thenReturn(7L);
        when(workspaceRepository.countByStatus(WorkspaceStatus.SUSPENDED)).thenReturn(1L);
        when(workspaceRepository.countByStatus(WorkspaceStatus.DELETED)).thenReturn(2L);
        when(workspaceRepository.countByStatusAndPublicationStatus(
                        WorkspaceStatus.ACTIVE, WorkspacePublicationStatus.PRIVATE))
                .thenReturn(4L);
        when(workspaceRepository.countByStatusAndPublicationStatus(
                        WorkspaceStatus.ACTIVE, WorkspacePublicationStatus.PUBLISHED))
                .thenReturn(3L);
        when(workspaceMemberRepository.count()).thenReturn(15L);
        when(workspaceMemberRepository.countByStatus(MembershipStatus.ACTIVE)).thenReturn(12L);
        when(workspaceMemberRepository.countByStatus(MembershipStatus.INVITED)).thenReturn(2L);
        when(workspaceMemberRepository.countByStatus(MembershipStatus.SUSPENDED)).thenReturn(1L);

        Instant before = Instant.now();
        PlatformOperationsOverview overview = service.load();
        Instant after = Instant.now();

        assertThat(overview.accounts().total()).isEqualTo(12L);
        assertThat(overview.accounts().active()).isEqualTo(8L);
        assertThat(overview.workspaces().activePrivate()).isEqualTo(4L);
        assertThat(overview.workspaces().activePublished()).isEqualTo(3L);
        assertThat(overview.memberships().invited()).isEqualTo(2L);
        assertThat(overview.generatedAt()).isBetween(before, after);
    }
}
