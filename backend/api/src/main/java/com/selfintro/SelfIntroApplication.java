package com.selfintro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
// com.selfintro.jobposting(job-posting URL 파싱/크롤링/AI 매칭/백필)와 com.selfintro.studyplan(AI
// 학습 계획)은 worker 전용이다 — worker가 자체 ingress로 직접 서빙한다(2026-08 CRUD/AI 분리 작업).
// com.selfintro.vectorsearch(job_posting_vector 등 Oracle 26ai 전용 테이블)는 VectorOracleDataSourceConfig의
// 2차 데이터소스가 전담한다 — 2026-08-04 사고 참고. 이 셋을 api에서 스캔하면 같은 부류의 사고가 재발한다.
@ComponentScan(
        basePackages = "com.selfintro",
        excludeFilters =
                @ComponentScan.Filter(
                        type = FilterType.REGEX,
                        pattern = {
                            "com\\.selfintro\\.AiWorkerApplication",
                            "com\\.selfintro\\.jobposting\\..*",
                            "com\\.selfintro\\.studyplan\\..*",
                            "com\\.selfintro\\.vectorsearch\\..*"
                        }))
@EnableJpaRepositories(
        basePackages = "com.selfintro",
        excludeFilters =
                @ComponentScan.Filter(
                        type = FilterType.REGEX,
                        pattern = {
                            "com\\.selfintro\\.jobposting\\..*",
                            "com\\.selfintro\\.studyplan\\..*",
                            "com\\.selfintro\\.vectorsearch\\..*"
                        }))
@EntityScan(basePackages = "com.selfintro")
@EnableScheduling
@EnableAsync
public class SelfIntroApplication {

    public static void main(String[] args) {
        SpringApplication.run(SelfIntroApplication.class, args);
    }
}
