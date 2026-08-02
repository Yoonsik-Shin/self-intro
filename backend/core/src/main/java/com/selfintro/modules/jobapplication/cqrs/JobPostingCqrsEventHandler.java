package com.selfintro.modules.jobapplication.cqrs;

import com.selfintro.global.config.RabbitMqConfig;
import com.selfintro.modules.jobapplication.event.JobMatchingCompletedEvent;
import com.selfintro.modules.jobapplication.event.JobPostingCollectedEvent;
import java.time.LocalDateTime;
import lombok.extern.slf4j.Slf4j;
import oracle.nosql.driver.NoSQLHandle;
import oracle.nosql.driver.ops.GetRequest;
import oracle.nosql.driver.ops.GetResult;
import oracle.nosql.driver.ops.PutRequest;
import oracle.nosql.driver.ops.PutResult;
import oracle.nosql.driver.values.MapValue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * CQRS Read Model 투영 핸들러.
 * <p>
 * RabbitMQ에서 이벤트를 수신하여 Oracle Cloud NoSQL 테이블에 Read Model을 투영합니다.
 * Oracle NoSQL이 비활성화(oracle.nosql.enabled=false)된 경우 핸들이 주입되지 않으며,
 * 이벤트 수신 시 ERROR 로그를 남기고 처리를 중단합니다.
 */
@Slf4j
@Component
public class JobPostingCqrsEventHandler {

    private final NoSQLHandle noSQLHandle;
    private final String tableName;

    public JobPostingCqrsEventHandler(
            @Autowired(required = false) NoSQLHandle noSQLHandle,
            @Value("${oracle.nosql.table-name:JobPostingReadModel}") String tableName) {
        this.noSQLHandle = noSQLHandle;
        this.tableName = tableName;
    }

    @RabbitListener(queues = RabbitMqConfig.QUEUE_JOB_POSTING_COLLECTED)
    public void handleJobPostingCollected(JobPostingCollectedEvent event) {
        if (noSQLHandle == null) {
            log.error("[CQRS FATAL] Oracle Cloud NoSQL 핸들이 주입되지 않았습니다! "
                    + "oracle.nosql.enabled=true 설정을 확인하세요. "
                    + "CQRS Read Model 투영 실패 - jobPostingId={}", event.jobPostingId());
            return;
        }

        try {
            log.info("[CQRS Event] RabbitMQ 수신 - JobPostingCollected: id={}, company={}",
                    event.jobPostingId(), event.companyName());

            // 기존 데이터 조회 (매칭 결과가 있으면 보존)
            MapValue existingRow = getExistingRow(event.jobPostingId());
            Integer matchScore = existingRow != null && existingRow.get("matchScore") != null
                    ? existingRow.get("matchScore").asInteger().getValue() : null;
            String matchSummary = existingRow != null && existingRow.get("matchSummary") != null
                    ? existingRow.get("matchSummary").asString().getValue() : null;

            MapValue row = new MapValue()
                    .put("jobPostingId", event.jobPostingId())
                    .put("companyName", event.companyName() != null ? event.companyName() : "")
                    .put("title", event.title() != null ? event.title() : "")
                    .put("status", event.status() != null ? event.status() : "NEW")
                    .put("applyUrl", event.applyUrl() != null ? event.applyUrl() : "")
                    .put("updatedAt", LocalDateTime.now().toString());

            if (matchScore != null) {
                row.put("matchScore", matchScore);
            }
            if (matchSummary != null) {
                row.put("matchSummary", matchSummary);
            }

            PutRequest putReq = new PutRequest().setTableName(tableName).setValue(row);
            PutResult putResult = noSQLHandle.put(putReq);

            log.info("[CQRS Success] Oracle NoSQL Read Model 투영 완료 - jobPostingId={}, version={}",
                    event.jobPostingId(), putResult.getVersion());
        } catch (Exception e) {
            log.error("[CQRS Error] Oracle NoSQL 처리 중 예외 발생! jobPostingId={}",
                    event.jobPostingId(), e);
        }
    }

    @RabbitListener(queues = RabbitMqConfig.QUEUE_JOB_MATCHING_COMPLETED)
    public void handleJobMatchingCompleted(JobMatchingCompletedEvent event) {
        if (noSQLHandle == null) {
            log.error("[CQRS FATAL] Oracle Cloud NoSQL 핸들이 주입되지 않았습니다! "
                    + "oracle.nosql.enabled=true 설정을 확인하세요. "
                    + "CQRS Read Model 투영 실패 - jobPostingId={}", event.jobPostingId());
            return;
        }

        try {
            log.info("[CQRS Event] RabbitMQ 수신 - JobMatchingCompleted: id={}, score={}",
                    event.jobPostingId(), event.score());

            // 기존 데이터 조회 (공고 정보 보존)
            MapValue existingRow = getExistingRow(event.jobPostingId());

            MapValue row = new MapValue()
                    .put("jobPostingId", event.jobPostingId())
                    .put("companyName", existingRow != null && existingRow.get("companyName") != null
                            ? existingRow.get("companyName").asString().getValue() : "")
                    .put("title", existingRow != null && existingRow.get("title") != null
                            ? existingRow.get("title").asString().getValue() : "")
                    .put("status", existingRow != null && existingRow.get("status") != null
                            ? existingRow.get("status").asString().getValue() : "NEW")
                    .put("applyUrl", existingRow != null && existingRow.get("applyUrl") != null
                            ? existingRow.get("applyUrl").asString().getValue() : "")
                    .put("matchScore", event.score())
                    .put("matchSummary", event.summary() != null ? event.summary() : "")
                    .put("updatedAt", LocalDateTime.now().toString());

            PutRequest putReq = new PutRequest().setTableName(tableName).setValue(row);
            PutResult putResult = noSQLHandle.put(putReq);

            log.info("[CQRS Success] Oracle NoSQL Read Model 투영 완료 - jobPostingId={}, matchScore={}, version={}",
                    event.jobPostingId(), event.score(), putResult.getVersion());
        } catch (Exception e) {
            log.error("[CQRS Error] Oracle NoSQL 처리 중 예외 발생! jobPostingId={}",
                    event.jobPostingId(), e);
        }
    }

    /**
     * Oracle NoSQL에서 기존 Row를 조회합니다.
     * 존재하지 않으면 null 반환.
     */
    private MapValue getExistingRow(Long jobPostingId) {
        try {
            MapValue key = new MapValue().put("jobPostingId", jobPostingId);
            GetRequest getReq = new GetRequest().setTableName(tableName).setKey(key);
            GetResult getResult = noSQLHandle.get(getReq);
            return getResult.getValue();
        } catch (Exception e) {
            log.warn("[CQRS Warn] Oracle NoSQL 기존 데이터 조회 실패 - jobPostingId={}", jobPostingId, e);
            return null;
        }
    }
}
