package com.selfintro.config.vector;

import jakarta.persistence.EntityManagerFactory;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * job_posting_vector/experience_vector/study_vector 3개 테이블은 Oracle 26ai 전용이라 api/ai-worker 두 앱의
 * 기본(1차) 데이터소스(MySQL)로는 접근할 수 없다. 그런데 두 앱 모두 com.selfintro 전체를 스캔하다 보니 이 3개
 * 리포지토리가 기본 데이터소스에 잘못 바인딩돼 "Table 'job_posting_vector' doesn't exist" 오류로 이어진 사고가
 * 있었다(2026-08-04). com.selfintro.vectorsearch 패키지(엔티티/리포지토리)만 별도 2차 데이터소스로 분리 연결하고,
 * 각 Application 클래스의 기본 @EnableJpaRepositories는 이 패키지를 제외하도록 했다.
 *
 * <p>Spring Boot는 DataSource/EntityManagerFactory 빈이 하나라도 직접 정의되면 자동 구성(DataSourceAutoConfiguration,
 * JpaBaseConfiguration)을 통째로 비활성화한다 — 그래서 2차(Oracle) 것만 추가하는 게 아니라 1차(MySQL, 기존
 * spring.datasource / spring.jpa 설정값과 동일)도 여기서 Primary로 함께 정의해야 한다.
 *
 * <p>주의: Spring은 타입이 같은 빈이 여러 개일 때 @Primary가 있으면 파라미터 이름 매칭보다 @Primary를
 * 무조건 먼저 채택한다 — 그래서 파라미터 이름만 vectorXxx로 맞춰 놓으면 실제로는 조용히 1차(Primary,
 * MySQL) 빈이 주입되는 사고가 났다(2026-08-04, 배포 직후 발견). 모든 주입 지점에 @Qualifier를 명시해
 * @Primary 존재 여부와 무관하게 항상 의도한 빈이 연결되도록 한다.
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.selfintro.vectorsearch",
        entityManagerFactoryRef = "vectorEntityManagerFactory",
        transactionManagerRef = "vectorTransactionManager")
public class VectorOracleDataSourceConfig {

    // ---- 1차: MySQL (기존 spring.datasource.* / spring.jpa.* 그대로 재사용) ----

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
        return builder.dataSource(dataSource).packages("com.selfintro").persistenceUnit("default").build();
    }

    @Primary
    @Bean
    public PlatformTransactionManager transactionManager(
            @Qualifier("entityManagerFactory") EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }

    // ---- 2차: Oracle 26ai (vectorsearch 전용) ----

    @Bean
    @ConfigurationProperties("oracle.vector.datasource")
    public DataSourceProperties vectorDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource vectorDataSource(
            @Qualifier("vectorDataSourceProperties") DataSourceProperties vectorDataSourceProperties) {
        return vectorDataSourceProperties.initializeDataSourceBuilder().build();
    }

    @Bean
    public LocalContainerEntityManagerFactoryBean vectorEntityManagerFactory(
            EntityManagerFactoryBuilder builder, @Qualifier("vectorDataSource") DataSource vectorDataSource) {
        // ddl-auto는 환경(spring.jpa.hibernate.ddl-auto)과 무관하게 항상 none으로 고정한다 — 로컬 H2는
        // VECTOR 컬럼 타입을 이해하지 못해 자동 DDL 시도 자체가 실패하고, 운영 Oracle 스키마는 별도로 관리한다.
        return builder.dataSource(vectorDataSource)
                .properties(Map.of("hibernate.hbm2ddl.auto", "none"))
                .packages("com.selfintro.vectorsearch")
                .persistenceUnit("vector")
                .build();
    }

    @Bean
    public PlatformTransactionManager vectorTransactionManager(
            @Qualifier("vectorEntityManagerFactory") EntityManagerFactory vectorEntityManagerFactory) {
        return new JpaTransactionManager(vectorEntityManagerFactory);
    }
}
