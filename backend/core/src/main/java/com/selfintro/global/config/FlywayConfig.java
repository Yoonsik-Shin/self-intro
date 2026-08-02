package com.selfintro.global.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
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
