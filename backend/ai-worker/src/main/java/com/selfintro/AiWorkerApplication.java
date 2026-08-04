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
@EnableJpaRepositories(
        basePackages = "com.selfintro",
        // com.selfintro.vectorsearch(job_posting_vector 등 Oracle 26ai 전용 테이블)는
        // VectorOracleDataSourceConfig의 2차 데이터소스가 전담한다 — 2026-08-04 사고 참고.
        excludeFilters =
                @ComponentScan.Filter(
                        type = FilterType.REGEX,
                        pattern = "com\\.selfintro\\.vectorsearch\\..*"))
@EntityScan(basePackages = "com.selfintro")
@EnableScheduling
public class AiWorkerApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiWorkerApplication.class, args);
    }
}
