package com.selfintro.modules.donation.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.donation.application.PayAppClient;
import com.selfintro.modules.donation.application.PayAppPayRequestResult;
import com.selfintro.study.SelfIntroApplication;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(classes = SelfIntroApplication.class, properties = {
        "app.admin.username=test-admin",
        "app.admin.password=test-password",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.donation.payapp.user-id=test-seller",
        "app.donation.payapp.link-key=test-link-key",
        "app.donation.payapp.link-value=test-link-value",
        "app.donation.payapp.recv-phone=01000000000"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DonationApiIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PayAppClient payAppClient;

    @Test
    void createDonationWithCsrfReturnsTokenAndPayUrl() throws Exception {
        when(payAppClient.payRequest(anyInt(), anyString()))
                .thenReturn(PayAppPayRequestResult.ok("mul-create-1", "https://pay.example/1"));

        mockMvc.perform(post("/api/donations").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":5000,\"message\":\"응원합니다\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.donationToken").isNotEmpty())
                .andExpect(jsonPath("$.payUrl").value("https://pay.example/1"));
    }

    @Test
    void createDonationWithoutCsrfIsRejected() throws Exception {
        mockMvc.perform(post("/api/donations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":5000}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void createDonationRejectsOutOfRangeAmount() throws Exception {
        mockMvc.perform(post("/api/donations").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":500}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void callbackWithoutCsrfMarksDonationPaidAndStatusIsVisible() throws Exception {
        when(payAppClient.payRequest(anyInt(), anyString()))
                .thenReturn(PayAppPayRequestResult.ok("mul-paid-1", "https://pay.example/2"));
        String token = createDonation(3000);

        mockMvc.perform(get("/api/donations/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));

        mockMvc.perform(post("/api/donations/payapp/callback")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("mul_no", "mul-paid-1")
                        .param("pay_state", "4")
                        .param("price", "3000")
                        .param("linkval", "test-link-value"))
                .andExpect(status().isOk())
                .andExpect(content().string("SUCCESS"));

        mockMvc.perform(get("/api/donations/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"));
    }

    @Test
    void forgedCallbackIsRejected() throws Exception {
        when(payAppClient.payRequest(anyInt(), anyString()))
                .thenReturn(PayAppPayRequestResult.ok("mul-forged-1", "https://pay.example/3"));
        String token = createDonation(3000);

        mockMvc.perform(post("/api/donations/payapp/callback")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("mul_no", "mul-forged-1")
                        .param("pay_state", "4")
                        .param("price", "3000")
                        .param("linkval", "wrong-value"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("FAIL"));

        mockMvc.perform(get("/api/donations/" + token))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void unknownDonationTokenReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/donations/00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminDonationEndpointsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/donations"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void concurrentDuplicateCallbacksAreSerializedAndBothAccepted() throws Exception {
        when(payAppClient.payRequest(anyInt(), anyString()))
                .thenReturn(PayAppPayRequestResult.ok("mul-race-1", "https://pay.example/4"));
        String token = createDonation(3000);

        int threads = 2;
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        try {
            Future<Integer> first = executor.submit(() -> fireCallback(ready, start));
            Future<Integer> second = executor.submit(() -> fireCallback(ready, start));
            ready.await();
            start.countDown();

            assertThat(first.get()).isEqualTo(200);
            assertThat(second.get()).isEqualTo(200);
        } finally {
            executor.shutdownNow();
        }

        mockMvc.perform(get("/api/donations/" + token))
                .andExpect(jsonPath("$.status").value("PAID"));
    }

    private Integer fireCallback(CountDownLatch ready, CountDownLatch start) throws Exception {
        ready.countDown();
        start.await();
        MvcResult result = mockMvc.perform(post("/api/donations/payapp/callback")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("mul_no", "mul-race-1")
                        .param("pay_state", "4")
                        .param("price", "3000")
                        .param("linkval", "test-link-value"))
                .andReturn();
        return result.getResponse().getStatus();
    }

    @Test
    void donationConfigIsPubliclyReadable() throws Exception {
        mockMvc.perform(get("/api/donations/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));
    }

    @Test
    void settingsUpdateRequiresAdmin() throws Exception {
        mockMvc.perform(put("/api/admin/donations/settings").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminToggleDisablesButtonAndBlocksCreate() throws Exception {
        mockMvc.perform(put("/api/admin/donations/settings")
                        .with(user("test-admin").roles("ADMIN")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));

        mockMvc.perform(get("/api/donations/config"))
                .andExpect(jsonPath("$.enabled").value(false));

        mockMvc.perform(post("/api/donations").with(csrf())
                        .header("X-Forwarded-For", "10.1.0." + IP_SEQUENCE.incrementAndGet())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":3000}"))
                .andExpect(status().isServiceUnavailable());

        mockMvc.perform(put("/api/admin/donations/settings")
                        .with(user("test-admin").roles("ADMIN")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));
    }

    @Test
    void createDonationIsRateLimitedPerIp() throws Exception {
        when(payAppClient.payRequest(anyInt(), anyString()))
                .thenAnswer(invocation -> PayAppPayRequestResult.ok(
                        "mul-limit-" + IP_SEQUENCE.incrementAndGet(), "https://pay.example/5"));

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/donations").with(csrf())
                            .header("X-Forwarded-For", "9.9.9.9")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"amount\":3000}"))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(post("/api/donations").with(csrf())
                        .header("X-Forwarded-For", "9.9.9.9")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":3000}"))
                .andExpect(status().isTooManyRequests());
    }

    /** 테스트 간 공유되는 rate limiter에 걸리지 않도록 호출마다 서로 다른 IP를 쓴다. */
    private String createDonation(int amount) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/donations").with(csrf())
                        .header("X-Forwarded-For", "10.0.0." + IP_SEQUENCE.incrementAndGet())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":" + amount + "}"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("donationToken").asText();
    }

    private static final java.util.concurrent.atomic.AtomicInteger IP_SEQUENCE =
            new java.util.concurrent.atomic.AtomicInteger();
}
