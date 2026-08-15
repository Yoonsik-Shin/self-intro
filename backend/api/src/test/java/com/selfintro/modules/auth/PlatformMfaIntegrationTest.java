package com.selfintro.modules.auth.application;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.SelfIntroApplication;
import com.selfintro.modules.securityaudit.domain.SecurityAuditEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
        classes = SelfIntroApplication.class,
        properties = {
            "app.admin.username=mfa-owner",
            "app.admin.password=mfa-password",
            "app.security.bootstrap-admin.enabled=true",
            "app.security.mfa.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "spring.flyway.enabled=false",
            "spring.jpa.hibernate.ddl-auto=create-drop"
        })
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PlatformMfaIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private TotpService totpService;
    @Autowired private SecurityAuditEventRepository auditEventRepository;

    @Test
    void platformOwnerMustEnrollThenUseTotpOnEveryNewLogin() throws Exception {
        MockHttpSession limitedSession = login(null);
        mockMvc.perform(get("/api/auth/me").session(limitedSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mfaEnrollmentRequired").value(true));
        mockMvc.perform(get("/api/admin/visits/summary").session(limitedSession))
                .andExpect(status().isForbidden());

        limitedSession.setAttribute("SELF_INTRO_REAUTHENTICATED_AT", 0L);
        mockMvc.perform(post("/api/auth/mfa/enrollment").session(limitedSession).with(csrf()))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(
                        post("/api/auth/reauthenticate")
                                .session(limitedSession)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"password\":\"mfa-password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expiresAtEpochMillis").isNumber())
                .andExpect(jsonPath("$.explicitExpiresAtEpochMillis").isNumber());

        String enrollmentJson =
                mockMvc.perform(
                                post("/api/auth/mfa/enrollment")
                                        .session(limitedSession)
                                        .with(csrf()))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        String secret = objectMapper.readTree(enrollmentJson).path("secret").asText();
        String code = currentCode(secret);

        mockMvc.perform(
                        post("/api/auth/mfa/enrollment/confirm")
                                .session(limitedSession)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codes").isArray())
                .andExpect(jsonPath("$.codes").isNotEmpty());
        org.assertj.core.api.Assertions.assertThat(auditEventRepository.findAll())
                .anyMatch(event -> "MFA_ENROLLMENT_STARTED".equals(event.getEventType()))
                .anyMatch(event -> "MFA_ENROLLMENT_COMPLETED".equals(event.getEventType()))
                .anyMatch(event -> "REAUTHENTICATION_SUCCESS".equals(event.getEventType()));

        long successfulLoginsBeforeRejectedMfa =
                auditEventRepository.findAll().stream()
                        .filter(event -> "LOGIN_SUCCESS".equals(event.getEventType()))
                        .count();
        MockHttpSession mfaPendingSession =
                (MockHttpSession)
                        mockMvc.perform(
                                        post("/api/auth/login")
                                                .with(csrf())
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        "{\"username\":\"mfa-owner\",\"password\":\"mfa-password\"}"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.authenticated").value(false))
                                .andExpect(jsonPath("$.mfaRequired").value(true))
                                .andReturn()
                                .getRequest()
                                .getSession(false);
        org.assertj.core.api.Assertions.assertThat(mfaPendingSession).isNull();
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        assertThatSuccessfulLoginCount(successfulLoginsBeforeRejectedMfa);
        org.assertj.core.api.Assertions.assertThat(auditEventRepository.findAll())
                .anyMatch(
                        event ->
                                "LOGIN_MFA_REQUIRED".equals(event.getEventType())
                                        && "SUCCESS".equals(event.getResult()));

        MockHttpSession verifiedSession = login(currentCode(secret));
        assertThatSuccessfulLoginCount(successfulLoginsBeforeRejectedMfa + 1);
        mockMvc.perform(get("/api/auth/me").session(verifiedSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mfaEnabled").value(true))
                .andExpect(jsonPath("$.mfaEnrollmentRequired").value(false));

        mockMvc.perform(post("/api/auth/mfa/enrollment").session(verifiedSession).with(csrf()))
                .andExpect(status().isForbidden());
    }

    private MockHttpSession login(String code) throws Exception {
        String codeProperty = code == null ? "null" : "\"" + code + "\"";
        return (MockHttpSession)
                mockMvc.perform(
                                post("/api/auth/login")
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"username\":\"mfa-owner\",\"password\":\"mfa-password\",\"totpCode\":"
                                                        + codeProperty
                                                        + "}"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.authenticated").value(true))
                        .andExpect(jsonPath("$.mfaRequired").value(false))
                        .andReturn()
                        .getRequest()
                        .getSession(false);
    }

    private String currentCode(String secret) {
        return totpService.currentCode(secret);
    }

    private void assertThatSuccessfulLoginCount(long expected) {
        org.assertj.core.api.Assertions.assertThat(
                        auditEventRepository.findAll().stream()
                                .filter(event -> "LOGIN_SUCCESS".equals(event.getEventType()))
                                .count())
                .isEqualTo(expected);
    }
}
