package com.selfintro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ComponentScan(
        basePackages = "com.selfintro",
        excludeFilters =
                @ComponentScan.Filter(
                        type = FilterType.REGEX,
                        pattern = "com\\.selfintro\\.SelfIntroApplication"))
@EnableJpaRepositories(basePackages = "com.selfintro")
@EntityScan(basePackages = "com.selfintro")
@EnableScheduling
public class AiWorkerApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiWorkerApplication.class, args);
    }
}
