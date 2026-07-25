package com.selfintro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = "com.selfintro")
@EnableJpaRepositories(basePackages = "com.selfintro")
@EntityScan(basePackages = "com.selfintro")
@EnableScheduling
public class SelfIntroApplication {

    public static void main(String[] args) {
        SpringApplication.run(SelfIntroApplication.class, args);
    }
}
