package com.selfintro.modules.auth.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.auth.application.MfaService;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class MfaRecoveryReenrollmentFilterTest {

    private final MfaService mfaService = mock(MfaService.class);
    private final MfaRecoveryReenrollmentFilter filter =
            new MfaRecoveryReenrollmentFilter(mfaService);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void blocksWorkspaceApiUntilRecoveryReenrollmentCompletes() throws Exception {
        AppUserPrincipal principal = platformPrincipal();
        authenticate(principal);
        MockHttpServletRequest request =
                new MockHttpServletRequest("GET", "/api/workspaces/demo/profile");
        request.getSession(true);
        when(mfaService.requiresRecoveryReenrollment(principal, request.getSession(false)))
                .thenReturn(true);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    void allowsRecoveryEnrollmentEndpoint() throws Exception {
        AppUserPrincipal principal = platformPrincipal();
        authenticate(principal);
        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/api/auth/mfa/recovery-enrollment");
        request.getSession(true);
        when(mfaService.requiresRecoveryReenrollment(principal, request.getSession(false)))
                .thenReturn(true);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isSameAs(request);
    }

    private void authenticate(AppUserPrincipal principal) {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        UsernamePasswordAuthenticationToken.authenticated(
                                principal, principal.password(), principal.authorities()));
    }

    private AppUserPrincipal platformPrincipal() {
        return new AppUserPrincipal(
                42L,
                "owner@example.com",
                "password-hash",
                true,
                true,
                Set.of("PLATFORM_OWNER"),
                List.of());
    }
}
