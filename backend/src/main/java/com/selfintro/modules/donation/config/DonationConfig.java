package com.selfintro.modules.donation.config;

import java.time.Clock;
import java.time.Duration;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(DonationProperties.class)
public class DonationConfig {

    @Bean
    public Clock donationClock(@Value("${app.donation.time-zone:Asia/Seoul}") String timeZone) {
        return Clock.system(ZoneId.of(timeZone));
    }

    @Bean
    public RestClient payAppRestClient(DonationProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        return RestClient.builder()
                .baseUrl(properties.payapp().apiUrl())
                .requestFactory(requestFactory)
                .build();
    }
}
