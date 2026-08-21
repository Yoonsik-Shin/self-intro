package com.selfintro.modules.billing.application;

import com.selfintro.modules.aiusage.application.AiUsageLedgerService;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WorkspacePlanEntitlementService {

    private final JdbcTemplate jdbcTemplate;
    private final AiUsageLedgerService usageLedgerService;

    public void requireInvitationCapacity(Long workspaceId, LocalDateTime now) {
        SeatState state = seatState(workspaceId, now);
        if (state.activeMembers() + state.pendingInvitations() >= state.totalSeats()) {
            throw new ResponseStatusException(
                    HttpStatus.PAYMENT_REQUIRED, "현재 플랜의 좌석을 모두 사용 중입니다. 초대 전에 좌석을 추가해 주세요.");
        }
    }

    public void requireAcceptanceCapacity(Long workspaceId, LocalDateTime now) {
        SeatState state = seatState(workspaceId, now);
        if (state.activeMembers() >= state.totalSeats()) {
            throw new ResponseStatusException(
                    HttpStatus.PAYMENT_REQUIRED,
                    "현재 플랜의 좌석을 모두 사용 중입니다. Workspace OWNER에게 문의해 주세요.");
        }
    }

    private SeatState seatState(Long workspaceId, LocalDateTime now) {
        usageLedgerService.ensureWorkspaceDefaults(workspaceId);
        return jdbcTemplate
                .query(
                        """
                        SELECT p.included_members + COALESCE(sa.quantity, 0) AS total_seats,
                               (SELECT COUNT(*) FROM workspace_member wm
                                 WHERE wm.workspace_id = s.workspace_id AND wm.status = 'ACTIVE') AS active_members,
                               (SELECT COUNT(*) FROM workspace_membership_invitation wi
                                 WHERE wi.workspace_id = s.workspace_id AND wi.status = 'PENDING'
                                   AND wi.expires_at > ?) AS pending_invitations
                          FROM workspace_subscription s
                          JOIN billing_plan p ON p.code = s.plan_code
                          LEFT JOIN subscription_seat_addon sa ON sa.subscription_id = s.id
                         WHERE s.workspace_id = ?
                        """,
                        (resultSet, rowNum) ->
                                new SeatState(
                                        resultSet.getInt(1),
                                        resultSet.getInt(2),
                                        resultSet.getInt(3)),
                        now,
                        workspaceId)
                .stream()
                .findFirst()
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.CONFLICT, "Workspace 구독 기준선을 찾을 수 없습니다."));
    }

    private record SeatState(int totalSeats, int activeMembers, int pendingInvitations) {}
}
