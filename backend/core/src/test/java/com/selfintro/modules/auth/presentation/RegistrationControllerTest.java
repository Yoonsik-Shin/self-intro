package com.selfintro.modules.auth.presentation;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.selfintro.modules.auth.application.AuthenticationRateLimitService;
import com.selfintro.modules.auth.presentation.dto.PasswordResetConfirmRequest;
import com.selfintro.modules.identity.application.PasswordResetService;
import com.selfintro.modules.identity.application.RegistrationService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;

class RegistrationControllerTest {

    private final RegistrationService registrationService = mock(RegistrationService.class);
    private final PasswordResetService passwordResetService = mock(PasswordResetService.class);
    private final AuthenticationRateLimitService authenticationRateLimitService =
            mock(AuthenticationRateLimitService.class);
    private final RegistrationController controller =
            new RegistrationController(
                    registrationService, passwordResetService, authenticationRateLimitService);

    @Test
    void confirmingPasswordResetInvalidatesCurrentSession() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpSession session = (MockHttpSession) request.getSession(true);

        controller.confirmPasswordReset(
                new PasswordResetConfirmRequest("reset-token", "New-password-123!"), request);

        verify(passwordResetService).confirm("reset-token", "New-password-123!");
        assertThatThrownBy(() -> session.setAttribute("afterReset", true))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void confirmingPasswordResetWithoutSessionStillSucceeds() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        controller.confirmPasswordReset(
                new PasswordResetConfirmRequest("reset-token", "New-password-123!"), request);

        verify(passwordResetService).confirm("reset-token", "New-password-123!");
    }
}
