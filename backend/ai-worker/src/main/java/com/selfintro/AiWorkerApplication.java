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
@ComponentScan(
        basePackages = "com.selfintro",
        excludeFilters = {
            @ComponentScan.Filter(
                    type = FilterType.REGEX,
                    pattern = "com\\.selfintro\\.SelfIntroApplication"),
            // api 프로세스가 워커에게 위임할 때만 쓰는 gRPC 클라이언트 어댑터다. worker 자신은
            // WorkspaceVectorPurgeService가 WorkspaceVectorStoragePort의 실제 구현이므로, 이 클래스까지
            // 함께 스캔되면 같은 포트에 빈이 2개 잡혀 부팅이 실패한다(2026-08-18 prod 장애).
            @ComponentScan.Filter(
                    type = FilterType.REGEX,
                    pattern =
                            "com\\.selfintro\\.modules\\.identity\\.infrastructure\\.GrpcWorkspaceVectorStorageAdapter")
        })
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
@EnableAsync
public class AiWorkerApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiWorkerApplication.class, args);
    }
}
