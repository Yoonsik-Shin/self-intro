package com.selfintro.modules.jobposting.cqrs;

import com.selfintro.global.config.RabbitMqConfig;
import com.selfintro.modules.jobposting.event.JobPostingCollectedEvent;
import java.time.LocalDateTime;
import lombok.extern.slf4j.Slf4j;
import oracle.nosql.driver.NoSQLHandle;
import oracle.nosql.driver.ops.PutRequest;
import oracle.nosql.driver.ops.PutResult;
import oracle.nosql.driver.values.MapValue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * CQRS Read Model 투영 핸들러.
 *
 * <p>RabbitMQ에서 이벤트를 수신하여 Oracle Cloud NoSQL 테이블에 Read Model을 투영합니다. Oracle NoSQL이
 * 비활성화(oracle.nosql.enabled=false)된 경우 핸들이 주입되지 않으며, 이벤트 수신 시 ERROR 로그를 남기고 처리를 중단합니다.
 */
@Slf4j
@Component
public class JobPostingCqrsEventHandler {

    private final NoSQLHandle noSQLHandle;
    private final String tableName;

    public JobPostingCqrsEventHandler(
            @Autowired(required = false) NoSQLHandle noSQLHandle,
            @Value("${oracle.nosql.table-name:JobPostingCatalogReadModel}") String tableName) {
        this.noSQLHandle = noSQLHandle;
        this.tableName = tableName;
    }

    @RabbitListener(queues = RabbitMqConfig.QUEUE_JOB_POSTING_COLLECTED)
    public void handleJobPostingCollected(JobPostingCollectedEvent event) {
        if (noSQLHandle == null) {
            log.error(
                    "[CQRS FATAL] Oracle Cloud NoSQL 핸들이 주입되지 않았습니다! "
                            + "oracle.nosql.enabled=true 설정을 확인하세요. "
                            + "CQRS Read Model 투영 실패 - jobPostingId={}",
                    event.jobPostingId());
            return;
        }

        try {
            log.info(
                    "[CQRS Event] RabbitMQ 수신 - JobPostingCollected: id={}, company={}",
                    event.jobPostingId(),
                    event.companyName());

            MapValue row =
                    new MapValue()
                            .put("jobPostingId", event.jobPostingId())
                            .put(
                                    "companyName",
                                    event.companyName() != null ? event.companyName() : "")
                            .put("title", event.title() != null ? event.title() : "")
                            .put("status", event.status() != null ? event.status() : "NEW")
                            .put("applyUrl", event.applyUrl() != null ? event.applyUrl() : "")
                            .put("updatedAt", LocalDateTime.now().toString());

            PutRequest putReq = new PutRequest().setTableName(tableName).setValue(row);
            PutResult putResult = noSQLHandle.put(putReq);

            log.info(
                    "[CQRS Success] Oracle NoSQL Read Model 투영 완료 - jobPostingId={}, version={}",
                    event.jobPostingId(),
                    putResult.getVersion());
        } catch (Exception e) {
            log.error(
                    "[CQRS Error] Oracle NoSQL 처리 중 예외 발생! jobPostingId={}",
                    event.jobPostingId(),
                    e);
        }
    }
}
