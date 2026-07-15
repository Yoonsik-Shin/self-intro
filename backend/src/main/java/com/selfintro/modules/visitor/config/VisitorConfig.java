package com.selfintro.modules.visitor.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class VisitorConfig {
    @Bean
    public Clock visitorClock(@Value("${app.visitor.time-zone:Asia/Seoul}") String timeZone) {
        return Clock.system(ZoneId.of(timeZone));
    }
}
