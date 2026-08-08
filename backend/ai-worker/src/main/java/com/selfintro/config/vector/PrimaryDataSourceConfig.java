package com.selfintro.config.vector;

import jakarta.persistence.EntityManagerFactory;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * api/ai-worker 공용 1차(MySQL) 데이터소스. 원래 {@code spring.datasource.*}/{@code spring.jpa.*}로
 * Boot가 자동 구성했지만, {@code com.selfintro.vectorsearch.config.VectorOracleDataSourceConfig}가
 * (worker에서) 2차(Oracle) DataSource 빈을 직접 정의하면서 Boot의 자동 구성이 전부 꺼졌다 — 그래서
 * 1차도 여기서 명시적으로 정의해야 한다. api는 vectorsearch 패키지를 스캔에서 제외하므로 이 클래스만
 * 필요하고(2026-08 job-posting CRUD/AI 분리 이후 api는 Oracle을 전혀 안 씀), worker는 이 클래스와
 * VectorOracleDataSourceConfig를 둘 다 스캔해서 1차+2차 모두 갖춘다.
 *
 * <p>주의: Spring은 타입이 같은 빈이 여러 개일 때 @Primary가 있으면 파라미터 이름 매칭보다 @Primary를
 * 무조건 먼저 채택한다(2026-08-04, 배포 직후 발견한 사고) — 그래서 모든 주입 지점에 @Qualifier를
 * 명시해 항상 의도한 빈이 연결되도록 한다.
 */
@Configuration
public class PrimaryDataSourceConfig {

    @Primary
    @Bean
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties dataSourceProperties() {
        return new DataSourceProperties();
    }

    @Primary
    @Bean
    public DataSource dataSource(@Qualifier("dataSourceProperties") DataSourceProperties dataSourceProperties) {
        return dataSourceProperties.initializeDataSourceBuilder().build();
    }

    @Primary
    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(
            EntityManagerFactoryBuilder builder, @Qualifier("dataSource") DataSource dataSource) {
        return builder.dataSource(dataSource)
                .packages(
                        "com.selfintro.modules",
                        "com.selfintro.jobposting",
                        "com.selfintro.portfolio",
                        "com.selfintro.studyplan"
                )
                .persistenceUnit("default")
                .build();
    }

    @Primary
    @Bean
    public PlatformTransactionManager transactionManager(
            @Qualifier("entityManagerFactory") EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }
}
