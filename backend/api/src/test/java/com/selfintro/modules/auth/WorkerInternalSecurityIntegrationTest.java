package com.selfintro.modules.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.selfintro.SelfIntroApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest(
        classes = SelfIntroApplication.class,
        properties = {
            "app.runtime-role=worker",
            "app.worker.internal-token=test-worker-token",
            "app.admin.username=test-owner",
            "app.admin.password=test-password",
            "spring.flyway.enabled=false",
            "spring.jpa.hibernate.ddl-auto=create-drop"
        })
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(WorkerInternalSecurityIntegrationTest.InternalEndpointConfig.class)
class WorkerInternalSecurityIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void rejectsInternalRouteWithoutServiceToken() throws Exception {
        mockMvc.perform(get("/internal/security-test")).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsInternalRouteWithWrongServiceToken() throws Exception {
        mockMvc.perform(
                        get("/internal/security-test")
                                .header("X-Internal-Worker-Token", "wrong-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void allowsInternalRouteWithMatchingServiceToken() throws Exception {
        mockMvc.perform(
                        get("/internal/security-test")
                                .header("X-Internal-Worker-Token", "test-worker-token"))
                .andExpect(status().isOk())
                .andExpect(content().string("ok"));
    }

    @TestConfiguration
    static class InternalEndpointConfig {

        @Bean
        InternalEndpoint internalEndpoint() {
            return new InternalEndpoint();
        }
    }

    @RestController
    static class InternalEndpoint {

        @GetMapping("/internal/security-test")
        String ping() {
            return "ok";
        }
    }
}
