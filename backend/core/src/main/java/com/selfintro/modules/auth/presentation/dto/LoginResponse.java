package com.selfintro.modules.auth.presentation.dto;

public record LoginResponse(boolean authenticated, boolean mfaRequired) {

    public static LoginResponse authenticatedResult() {
        return new LoginResponse(true, false);
    }

    public static LoginResponse mfaRequiredResult() {
        return new LoginResponse(false, true);
    }
}
