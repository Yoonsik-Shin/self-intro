package com.selfintro.modules.donation.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.selfintro.modules.donation.application.DonationService;
import com.selfintro.modules.donation.presentation.dto.KofiWebhookPayload;
import com.selfintro.study.SelfIntroApplication;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
        classes = SelfIntroApplication.class,
        properties = {
            "app.admin.username=test-admin",
            "app.admin.password=test-password",
            "spring.flyway.enabled=false",
            "spring.jpa.hibernate.ddl-auto=create-drop",
            "app.donation.payapp.user-id=test-seller",
            "app.donation.payapp.link-key=test-link-key",
            "app.donation.payapp.link-value=test-link-value",
            "app.donation.payapp.recv-phone=01000000000",
            "app.donation.kofi.page-url=https://ko-fi.com/test",
            "app.donation.kofi.verification-token=valid-token"
        })
@AutoConfigureMockMvc
@ActiveProfiles("test")
class KofiWebhookControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private DonationService donationService;

    @Test
    @DisplayName("Ko-fi Webhook 정상 수신 시 SUCCESS 반환")
    void handleKofiWebhook_success() throws Exception {
        when(donationService.handleKofiWebhook(any(KofiWebhookPayload.class))).thenReturn(true);

        String jsonPayload =
                """
                {
                    "message_id": "msg-123",
                    "timestamp": "2026-07-23T11:00:00Z",
                    "type": "Donation",
                    "from_name": "테스터",
                    "message": "응원합니다!",
                    "amount": "5.00",
                    "currency": "USD",
                    "url": "https://ko-fi.com",
                    "kofi_transaction_id": "tx-999",
                    "verification_token": "valid-token"
                }
                """;

        mockMvc.perform(
                        post("/api/donations/kofi/webhook")
                                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                                .param("data", jsonPayload))
                .andExpect(status().isOk())
                .andExpect(content().string("SUCCESS"));
    }

    @Test
    @DisplayName("Ko-fi Webhook 검증 실패 시 FAIL 반환")
    void handleKofiWebhook_failure() throws Exception {
        when(donationService.handleKofiWebhook(any(KofiWebhookPayload.class))).thenReturn(false);

        String jsonPayload =
                """
                {
                    "message_id": "msg-123",
                    "kofi_transaction_id": "tx-999",
                    "verification_token": "invalid-token"
                }
                """;

        mockMvc.perform(
                        post("/api/donations/kofi/webhook")
                                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                                .param("data", jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("FAIL"));
    }
}
