package com.selfintro.modules.identity.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record WorkspaceInvitationAcceptRequest(@NotBlank String token) {}
