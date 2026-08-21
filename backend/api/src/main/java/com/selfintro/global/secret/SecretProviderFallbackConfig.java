package com.selfintro.global.secret;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SecretProviderFallbackConfig {

    @Bean
    @ConditionalOnMissingBean(SecretProvider.class)
    SecretProvider unavailableSecretProvider() {
        return new UnavailableSecretProvider();
    }
}
