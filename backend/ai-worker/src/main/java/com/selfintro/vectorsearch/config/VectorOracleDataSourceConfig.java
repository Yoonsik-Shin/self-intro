package com.selfintro.vectorsearch.config;

import jakarta.persistence.EntityManagerFactory;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * job_posting_vector/experience_vector/study_vector 3개 테이블은 Oracle 26ai 전용이라 기본(1차) 데이터소스
 * (MySQL, {@code PrimaryDataSourceConfig})로는 접근할 수 없다 — 별도 2차 데이터소스로 분리 연결한다.
 *
 * <p>이 클래스가 {@code com.selfintro.vectorsearch} 패키지 안에 있는 건 의도적이다 — api의
 * {@code SelfIntroApplication}이 이 패키지 전체를 @ComponentScan에서 제외하므로, api pod는 이 설정도
 * Oracle 접속도 아예 필요 없다(2026-08 job-posting CRUD/AI 분리 이후 api는 벡터 검색을 쓰지 않는다).
 * worker만 이 클래스를 스캔해서 vectorsearch 리포지토리를 2차 데이터소스로 연결한다.
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.selfintro.vectorsearch",
        entityManagerFactoryRef = "vectorEntityManagerFactory",
        transactionManagerRef = "vectorTransactionManager")
public class VectorOracleDataSourceConfig {

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
