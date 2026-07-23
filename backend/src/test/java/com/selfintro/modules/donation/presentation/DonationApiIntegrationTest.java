package com.selfintro.modules.donation.presentation;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.selfintro.study.SelfIntroApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
        classes = SelfIntroApplication.class,
        properties = {
            "app.admin.username=test-admin",
            "app.admin.password=test-password",
            "spring.flyway.enabled=false",
            "spring.jpa.hibernate.ddl-auto=create-drop",
            "app.donation.kofi.page-url=https://ko-fi.com/test",
            "app.donation.kofi.verification-token=test-token"
        })
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DonationApiIntegrationTest {
    @Autowired private MockMvc mockMvc;

    @Test
    void donationConfigIsPubliclyReadable() throws Exception {
        mockMvc.perform(get("/api/donations/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.kofiPageUrl").value("https://ko-fi.com/test"));
    }

    @Test
    void adminDonationEndpointsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/donations")).andExpect(status().isUnauthorized());
    }

    @Test
    void settingsUpdateRequiresAdmin() throws Exception {
        mockMvc.perform(
                        put("/api/admin/donations/settings")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"enabled\":false}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminTogglesDonationButtonVisibility() throws Exception {
        mockMvc.perform(
                        put("/api/admin/donations/settings")
                                .with(user("test-admin").roles("ADMIN"))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));

        mockMvc.perform(get("/api/donations/config")).andExpect(jsonPath("$.enabled").value(false));

        mockMvc.perform(
                        put("/api/admin/donations/settings")
                                .with(user("test-admin").roles("ADMIN"))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"enabled\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));
    }

    @Test
    void kofiWebhookWithValidTokenIsAcceptedAndVisibleInAdminList() throws Exception {
        mockMvc.perform(
                        post("/api/donations/kofi/webhook")
                                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                                .param(
                                        "data",
                                        """
                                        {
                                            "message_id": "msg-e2e-1",
                                            "kofi_transaction_id": "tx-e2e-1",
                                            "amount": "5.00",
                                            "currency": "USD",
                                            "from_name": "테스터",
                                            "verification_token": "test-token"
                                        }
                                        """))
                .andExpect(status().isOk())
                .andExpect(content().string("SUCCESS"));

        mockMvc.perform(get("/api/admin/donations").with(user("test-admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paidTotals[0].currency").value("USD"))
                .andExpect(jsonPath("$.paidTotals[0].count").value(1))
                .andExpect(jsonPath("$.donations[0].amount").value(5))
                .andExpect(jsonPath("$.donations[0].currency").value("USD"));
    }

    @Test
    void kofiWebhookWithInvalidTokenIsRejected() throws Exception {
        mockMvc.perform(
                        post("/api/donations/kofi/webhook")
                                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                                .param(
                                        "data",
                                        """
                                        {
                                            "message_id": "msg-e2e-2",
                                            "kofi_transaction_id": "tx-e2e-2",
                                            "amount": "5.00",
                                            "verification_token": "wrong-token"
                                        }
                                        """))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("FAIL"));
    }
}
