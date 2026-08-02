package com.selfintro.global.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "spring.flyway.enabled", havingValue = "true", matchIfMissing = true)
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            Flyway configuredFlyway =
                    Flyway.configure()
                            .configuration(flyway.getConfiguration())
                            .ignoreMigrationPatterns("*:ignored")
                            .placeholderReplacement(false)
                            .load();
            configuredFlyway.repair();
            configuredFlyway.migrate();
        };
    }
}
