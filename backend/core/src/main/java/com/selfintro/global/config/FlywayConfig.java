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
            // 운영 시작 시 checksum 불일치나 실패 이력을 자동으로 덮어쓰지 않는다.
            // repair는 원인을 확인한 운영자가 별도 절차로 실행해야 한다.
            configuredFlyway.migrate();
            configuredFlyway.validate();
        };
    }
}
