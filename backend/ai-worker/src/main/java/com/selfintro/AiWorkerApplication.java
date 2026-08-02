package com.selfintro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {
    "com.selfintro.modules.jobapplication",
    "com.selfintro.modules.studyplan"
})
@EnableJpaRepositories(basePackages = {
    "com.selfintro.modules.jobapplication",
    "com.selfintro.modules.studyplan"
})
@EntityScan(basePackages = {
    "com.selfintro.modules.jobapplication",
    "com.selfintro.modules.studyplan"
})
@EnableScheduling
public class AiWorkerApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiWorkerApplication.class, args);
    }
}
