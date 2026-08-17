package com.selfintro.vectorsearch.config;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

/**
 * ai-worker 부팅 시 {@code oracle-schema.sql}을 Oracle vector 2차 데이터소스에 직접 적용한다.
 *
 * <p>로컬 H2({@link VectorOracleDataSourceConfig})는 VECTOR 타입/PL-SQL을 이해하지 못해 건너뛴다. 로컬
 * docker-compose의 Oracle Free 컨테이너는 vector_memory_size=0이라 이 스크립트의 {@code CREATE VECTOR INDEX}가
 * 실패하므로 {@code oracle.vector.schema-init.enabled}를 false로 꺼서 건너뛴다(자체 startup 스크립트가 대신 처리). prod
 * Oracle ATP는 이 스크립트를 실행할 자동화된 경로가 이전엔 전혀 없어(사람이 수동으로 sqlplus를 붙여야 했다)
 * experience_vector/study_vector의 workspace_id 컬럼 추가가 두 번 다 누락된 채로 배포됐었다. 스크립트 자체가 {@code CREATE
 * TABLE IF NOT EXISTS}와 컬럼 존재 여부 확인 후 {@code ALTER}로 멱등하게 작성돼 있어 매 부팅마다 재실행해도 안전하다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OracleVectorSchemaInitializer implements ApplicationRunner {

    private static final String SCHEMA_RESOURCE = "oracle-schema.sql";

    @Qualifier("vectorDataSource")
    private final DataSource vectorDataSource;

    @Value("${oracle.vector.schema-init.enabled:true}")
    private final boolean enabled;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!enabled) {
            log.info("oracle.vector.schema-init.enabled=false, 스키마 초기화를 건너뜁니다.");
            return;
        }
        try (Connection connection = vectorDataSource.getConnection()) {
            if (!"Oracle".equals(connection.getMetaData().getDatabaseProductName())) {
                log.info("Vector 데이터소스가 Oracle이 아니라서 스키마 초기화를 건너뜁니다.");
                return;
            }

            String script =
                    StreamUtils.copyToString(
                            new ClassPathResource(SCHEMA_RESOURCE).getInputStream(),
                            StandardCharsets.UTF_8);
            List<String> statements = splitStatements(script);
            try (Statement statement = connection.createStatement()) {
                for (String sql : statements) {
                    statement.execute(sql);
                }
            }
            log.info("Oracle vector 스키마 초기화 완료 ({}개 statement 실행).", statements.size());
        }
    }

    /**
     * sqlplus 스타일 스크립트를 JDBC로 실행 가능한 statement 목록으로 나눈다. {@code DECLARE}로 시작해 단독 "/" 줄로 끝나는 PL/SQL
     * 익명 블록과, 줄 끝이 세미콜론인 일반 statement 두 형태를 지원한다 — 이 파일이 지금까지 그 두 형태로만 작성돼왔다.
     */
    List<String> splitStatements(String script) {
        List<String> statements = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inPlsqlBlock = false;
        for (String line : script.split("\n", -1)) {
            String trimmed = line.trim();
            if (!inPlsqlBlock
                    && current.isEmpty()
                    && (trimmed.isEmpty() || trimmed.startsWith("--"))) {
                continue;
            }
            if (!inPlsqlBlock && trimmed.equals("DECLARE")) {
                inPlsqlBlock = true;
            }
            if (inPlsqlBlock) {
                if (trimmed.equals("/")) {
                    addIfNotBlank(statements, current.toString());
                    current.setLength(0);
                    inPlsqlBlock = false;
                } else {
                    current.append(line).append('\n');
                }
                continue;
            }
            current.append(line).append('\n');
            if (trimmed.endsWith(";")) {
                String stmt = current.toString().trim();
                addIfNotBlank(statements, stmt.substring(0, stmt.length() - 1));
                current.setLength(0);
            }
        }
        addIfNotBlank(statements, current.toString());
        return statements;
    }

    private void addIfNotBlank(List<String> statements, String candidate) {
        String trimmed = candidate.trim();
        if (!trimmed.isEmpty()) {
            statements.add(trimmed);
        }
    }
}
