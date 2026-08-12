package com.selfintro.modules.identity.presentation.dto;

import com.selfintro.modules.identity.application.WorkspaceMembershipService.MemberView;

public record WorkspaceInvitationAcceptedResponse(String workspaceSlug, MemberView member) {}
