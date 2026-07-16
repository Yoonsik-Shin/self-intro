package com.selfintro.modules.visitor.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.visitor.application.VisitorService;
import com.selfintro.modules.visitor.presentation.dto.VisitorSummaryResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

@ExtendWith(MockitoExtension.class)
class VisitorControllerTest {
    @Mock
    private VisitorService visitorService;

    private VisitorController controller;

    @BeforeEach
    void setUp() {
        controller = new VisitorController(visitorService);
        ReflectionTestUtils.setField(controller, "cookieDomain", "unbrdn.me");
        ReflectionTestUtils.setField(controller, "cookieSecure", true);
        ReflectionTestUtils.setField(controller, "excludedIps", "");
    }

    @Test
    void issuesHttpOnlyCookieAndStoresOnlyHashForNewVisitor() {
        VisitorSummaryResponse summary = new VisitorSummaryResponse(1, 1, 1, 0);
        when(visitorService.recordVisit(argThat(hash -> hash != null && hash.length() == 64), any()))
                .thenReturn(summary);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertThat(controller.recordVisit(null, request, null, response).getBody()).isEqualTo(summary);

        String cookie = response.getHeader("Set-Cookie");
        assertThat(cookie)
                .contains("portfolio_visitor=")
                .contains("Domain=unbrdn.me")
                .contains("Secure")
                .contains("HttpOnly")
                .contains("SameSite=Lax");
        verify(visitorService).recordVisit(argThat(hash -> hash.matches("[0-9a-f]{64}")), any());
    }

    @Test
    void doesNotRecordAdminVisit() {
        VisitorSummaryResponse summary = new VisitorSummaryResponse(3, 10, 20, 0);
        when(visitorService.getSummary()).thenReturn(summary);
        UsernamePasswordAuthenticationToken admin = new UsernamePasswordAuthenticationToken(
                "admin", "", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        assertThat(controller.recordVisit(
                null, new MockHttpServletRequest(), admin, new MockHttpServletResponse()).getBody())
                .isEqualTo(summary);

        verify(visitorService).getSummary();
    }

    @Test
    void doesNotRecordConfiguredForwardedIp() {
        ReflectionTestUtils.setField(controller, "excludedIps", "203.0.113.10, 2001:db8::10");
        VisitorSummaryResponse summary = new VisitorSummaryResponse(3, 10, 20, 0);
        when(visitorService.getSummary()).thenReturn(summary);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "203.0.113.10, 10.0.0.4");

        assertThat(controller.recordVisit(
                null, request, null, new MockHttpServletResponse()).getBody())
                .isEqualTo(summary);

        verify(visitorService).getSummary();
    }
}
