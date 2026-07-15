package com.selfintro.modules.visitor.presentation;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.selfintro.study.SelfIntroApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = SelfIntroApplication.class, properties = {
        "app.admin.username=test-admin",
        "app.admin.password=test-password",
        "app.visitor.cookie-secure=false",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VisitorApiIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void anonymousVisitorCanBeRecordedWithoutCsrfToken() throws Exception {
        mockMvc.perform(post("/api/visits"))
                .andExpect(status().isOk())
                .andExpect(cookie().httpOnly("portfolio_visitor", true))
                .andExpect(jsonPath("$.todayVisitors").value(1))
                .andExpect(jsonPath("$.totalVisitors").value(1))
                .andExpect(jsonPath("$.totalPageViews").value(1));
    }

    @Test
    void visitorAnalyticsRequiresAdminAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/visits/summary"))
                .andExpect(status().isUnauthorized());
    }
}
