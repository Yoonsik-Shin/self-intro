package com.selfintro.global.config;

import lombok.extern.slf4j.Slf4j;
import oracle.nosql.driver.NoSQLHandle;
import oracle.nosql.driver.NoSQLHandleConfig;
import oracle.nosql.driver.NoSQLHandleFactory;
import oracle.nosql.driver.iam.SignatureProvider;
import oracle.nosql.driver.kv.StoreAccessTokenProvider;
import oracle.nosql.driver.ops.ListTablesRequest;
import oracle.nosql.driver.ops.ListTablesResult;
import oracle.nosql.driver.ops.TableRequest;
import oracle.nosql.driver.ops.TableResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;

/**
 * Oracle NoSQL Database 연결 설정.
 * <p>
 * oracle.nosql.enabled=true 일 때만 활성화됩니다.
 * <ul>
 *   <li>mode=cloud: OCI Cloud Service 연결 (SignatureProvider 인증)</li>
 *   <li>mode=local: 로컬 KVLite 에뮬레이터 연결 (무인증 StoreAccessTokenProvider)</li>
 * </ul>
 * 서버 기동 시 연결 검증과 CQRS Read Model 테이블 자동 생성(DDL)을 수행합니다.
 * 연결 실패 시 서버 기동을 즉시 중단(Fail-Fast)합니다.
 */
@Slf4j
@Configuration
@ConditionalOnProperty(name = "oracle.nosql.enabled", havingValue = "true")
public class OracleNoSqlConfig {

    @Value("${oracle.nosql.endpoint:https://nosql.ap-chuncheon-1.oci.oraclecloud.com}")
    private String endpoint;

    @Value("${oracle.nosql.mode:cloud}")
    private String mode;

    @Value("${oracle.nosql.compartment-id:}")
    private String compartmentId;

    @Value("${oracle.nosql.oci-config-file:~/.oci/config}")
    private String ociConfigFile;

    @Value("${oracle.nosql.profile-name:self-intro-api-key}")
    private String profileName;

    @Value("${oracle.nosql.table-name:JobPostingReadModel}")
    private String tableName;

    @Bean
    public NoSQLHandle noSQLHandle() {
        log.info("[Oracle NoSQL] 핸들 생성 시작 (Mode: {}, Endpoint: {})", mode, endpoint);

        NoSQLHandle handle = createHandle();
        verifyConnection(handle);
        ensureTableExists(handle);

        log.info("[Oracle NoSQL] 초기화 완료 - 테이블({})이 준비되었습니다.", tableName);
        return handle;
    }

    private NoSQLHandle createHandle() {
        try {
            NoSQLHandleConfig config = new NoSQLHandleConfig(endpoint);

            if ("local".equalsIgnoreCase(mode)) {
                configureLocalMode(config);
            } else {
                configureCloudMode(config);
            }

            return NoSQLHandleFactory.createNoSQLHandle(config);
        } catch (Exception e) {
            log.error("[Oracle NoSQL FATAL] 핸들 생성 실패! (Mode: {}, Endpoint: {})", mode, endpoint, e);
            throw new IllegalStateException("Oracle NoSQL 핸들 생성 실패 - 서버 기동 중단", e);
        }
    }

    /**
     * 로컬 KVLite 에뮬레이터 모드 - 인증 없이 StoreAccessTokenProvider 사용
     */
    private void configureLocalMode(NoSQLHandleConfig config) {
        log.info("[Oracle NoSQL] 로컬 KVLite 에뮬레이터 모드 (무인증)");
        config.setAuthorizationProvider(new StoreAccessTokenProvider());
    }

    /**
     * OCI Cloud Service 모드 - OCI Config 파일 기반 SignatureProvider 인증
     */
    private void configureCloudMode(NoSQLHandleConfig config) throws Exception {
        String expandedPath = ociConfigFile.replace("~", System.getProperty("user.home"));
        File configFile = new File(expandedPath);

        if (!configFile.exists()) {
            log.error("[Oracle NoSQL FATAL] OCI Config 파일이 존재하지 않습니다: {}", expandedPath);
            throw new IllegalStateException("OCI Config 파일 미존재: " + expandedPath);
        }

        log.info("[Oracle NoSQL] OCI Cloud 모드 - Config({}) 기반 SignatureProvider 인증", expandedPath);
        SignatureProvider provider = new SignatureProvider(expandedPath, profileName);
        config.setAuthorizationProvider(provider);

        if (compartmentId != null && !compartmentId.isBlank()) {
            config.setDefaultCompartment(compartmentId);
            log.info("[Oracle NoSQL] Compartment OCID: {}", compartmentId);
        }
    }

    private void verifyConnection(NoSQLHandle handle) {
        try {
            ListTablesResult result = handle.listTables(new ListTablesRequest().setLimit(10));
            log.info("[Oracle NoSQL] 연결 검증 성공 - 기존 테이블 수: {}", result.getTables().length);
        } catch (Exception e) {
            log.error("[Oracle NoSQL FATAL] 연결 검증 실패! 서버를 기동할 수 없습니다.", e);
            throw new IllegalStateException("Oracle NoSQL 연결 실패 - 서버 기동 중단 (Fail-Fast)", e);
        }
    }

    private void ensureTableExists(NoSQLHandle handle) {
        String ddl = String.format(
                "CREATE TABLE IF NOT EXISTS %s ("
                        + "jobPostingId LONG, "
                        + "companyName STRING, "
                        + "title STRING, "
                        + "status STRING, "
                        + "applyUrl STRING, "
                        + "matchScore INTEGER, "
                        + "matchSummary STRING, "
                        + "updatedAt STRING, "
                        + "PRIMARY KEY(jobPostingId))", tableName);

        try {
            log.info("[Oracle NoSQL] CQRS Read Model 테이블 DDL: CREATE TABLE IF NOT EXISTS {}", tableName);
            TableRequest tableReq = new TableRequest().setStatement(ddl);
            TableResult tableResult = handle.tableRequest(tableReq);
            log.info("[Oracle NoSQL] 테이블({}) DDL 완료 - 상태: {}", tableName, tableResult.getTableState());
        } catch (Exception e) {
            log.error("[Oracle NoSQL FATAL] 테이블({}) 생성/검증 실패!", tableName, e);
            throw new IllegalStateException("Oracle NoSQL 테이블 초기화 실패 - 서버 기동 중단", e);
        }
    }
}
