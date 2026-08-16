package com.selfintro.modules.supportaccess.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.Workspace;
import java.time.LocalDateTime;
import java.util.Set;
import org.junit.jupiter.api.Test;

class SupportAccessRequestTest {

    private final Workspace workspace = Workspace.createPersonal("테스트", "w-test");
    private final AppUser operator =
            AppUser.createBootstrapOwner("operator", "hash", "지원 담당자", null);
    private final AppUser owner = AppUser.createBootstrapOwner("owner", "hash", "소유자", null);
    private final LocalDateTime requestedAt = LocalDateTime.of(2026, 8, 13, 9, 0);

    @Test
    void 승인시요청한시간만큼만읽기권한이활성화된다() {
        SupportAccessRequest request =
                SupportAccessRequest.request(
                        workspace,
                        operator,
                        "프로필 공개 설정 장애 확인",
                        Set.of(SupportAccessScope.PROFILE_READ),
                        30,
                        requestedAt);

        request.approve(owner, requestedAt.plusMinutes(10));

        assertThat(request.getStatus()).isEqualTo(SupportAccessStatus.APPROVED);
        assertThat(request.getAccessExpiresAt()).isEqualTo(requestedAt.plusMinutes(40));
        assertThat(request.isActiveAt(requestedAt.plusMinutes(39))).isTrue();
        assertThat(request.isActiveAt(requestedAt.plusMinutes(40))).isFalse();
    }

    @Test
    void 만료된요청은승인할수없다() {
        SupportAccessRequest request =
                SupportAccessRequest.request(
                        workspace,
                        operator,
                        "학습 공개 수 점검",
                        Set.of(SupportAccessScope.STUDY_READ),
                        15,
                        requestedAt);

        assertThatThrownBy(() -> request.approve(owner, requestedAt.plusHours(24)))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 활성승인은소유자또는요청자가철회할수있다() {
        SupportAccessRequest request =
                SupportAccessRequest.request(
                        workspace,
                        operator,
                        "경험 개수 정합성 확인",
                        Set.of(SupportAccessScope.EXPERIENCE_READ),
                        60,
                        requestedAt);
        request.approve(owner, requestedAt.plusMinutes(1));

        request.revoke(operator, requestedAt.plusMinutes(2));

        assertThat(request.getStatus()).isEqualTo(SupportAccessStatus.REVOKED);
        assertThat(request.isActiveAt(requestedAt.plusMinutes(3))).isFalse();
    }

    @Test
    void 범위와시간제약을강제한다() {
        assertThatThrownBy(
                        () ->
                                SupportAccessRequest.request(
                                        workspace, operator, "진단", Set.of(), 15, requestedAt))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () ->
                                SupportAccessRequest.request(
                                        workspace,
                                        operator,
                                        "진단",
                                        Set.of(SupportAccessScope.PROFILE_READ),
                                        61,
                                        requestedAt))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
