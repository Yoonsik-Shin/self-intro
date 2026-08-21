package com.selfintro.modules.aiusage.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.aiusage.application.WorkspaceByokService;
import com.selfintro.modules.aiusage.presentation.dto.WorkspaceByokConfigureRequest;
import com.selfintro.modules.aiusage.presentation.dto.WorkspaceByokStatusResponse;
import com.selfintro.modules.auth.application.RecentReauthenticationPolicy;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/ai-provider")
@RequiredArgsConstructor
public class WorkspaceByokController {

    private final WorkspaceByokService byokService;
    private final RecentReauthenticationPolicy reauthenticationPolicy;

    @GetMapping
    public WorkspaceByokStatusResponse status(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) WorkspaceMember member) {
        return byokService.status(member.getWorkspace().getId());
    }

    @PutMapping("/byok")
    public WorkspaceByokStatusResponse configure(
            @CurrentWorkspace(WorkspaceAccessLevel.OWNER) WorkspaceMember member,
            HttpSession session,
            @Valid @RequestBody WorkspaceByokConfigureRequest request) {
        reauthenticationPolicy.requireRecent(session);
        return byokService.configure(member, request.provider(), request.apiKey());
    }

    @DeleteMapping("/byok")
    public WorkspaceByokStatusResponse revoke(
            @CurrentWorkspace(WorkspaceAccessLevel.OWNER) WorkspaceMember member,
            HttpSession session) {
        reauthenticationPolicy.requireRecent(session);
        return byokService.revoke(member);
    }

    @PostMapping("/platform-managed")
    public WorkspaceByokStatusResponse usePlatformManaged(
            @CurrentWorkspace(WorkspaceAccessLevel.OWNER) WorkspaceMember member,
            HttpSession session) {
        reauthenticationPolicy.requireRecent(session);
        return byokService.usePlatformManaged(member);
    }
}
