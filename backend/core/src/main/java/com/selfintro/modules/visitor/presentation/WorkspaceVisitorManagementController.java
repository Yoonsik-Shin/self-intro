package com.selfintro.modules.visitor.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.visitor.application.WorkspaceVisitorService;
import com.selfintro.modules.visitor.presentation.dto.VisitorDailyResponse;
import com.selfintro.modules.visitor.presentation.dto.VisitorHourlyResponse;
import com.selfintro.modules.visitor.presentation.dto.VisitorSummaryResponse;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/visits/manage")
@RequiredArgsConstructor
public class WorkspaceVisitorManagementController {
    private final WorkspaceVisitorService workspaceVisitorService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @Qualifier("visitorClock")
    private final Clock visitorClock;

    @GetMapping("/summary")
    public ResponseEntity<VisitorSummaryResponse> summary(
            @PathVariable String workspaceSlug, Authentication authentication) {
        Long workspaceId = requireManager(authentication, workspaceSlug);
        return ResponseEntity.ok(workspaceVisitorService.getSummary(workspaceId));
    }

    @GetMapping("/daily")
    public ResponseEntity<List<VisitorDailyResponse>> daily(
            @PathVariable String workspaceSlug,
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to) {
        Long workspaceId = requireManager(authentication, workspaceSlug);
        LocalDate resolvedTo = to != null ? to : LocalDate.now(visitorClock);
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(13);
        return ResponseEntity.ok(
                workspaceVisitorService.getDaily(workspaceId, resolvedFrom, resolvedTo));
    }

    @GetMapping("/hourly")
    public ResponseEntity<List<VisitorHourlyResponse>> hourly(
            @PathVariable String workspaceSlug,
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate date) {
        Long workspaceId = requireManager(authentication, workspaceSlug);
        LocalDate resolvedDate = date != null ? date : LocalDate.now(visitorClock);
        return ResponseEntity.ok(workspaceVisitorService.getHourly(workspaceId, resolvedDate));
    }

    private Long requireManager(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy
                .requireAnyRole(
                        authentication, workspaceSlug, WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
                .getWorkspace()
                .getId();
    }
}
