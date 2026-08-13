package com.selfintro.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.selfintro.AiWorkerApplication;
import com.selfintro.modules.identity.application.WorkspaceCacheStoragePort;
import com.selfintro.modules.identity.application.WorkspacePurgeExecutor;
import com.selfintro.modules.identity.application.WorkspacePurgeService;
import com.selfintro.modules.identity.application.WorkspaceRelationalStoragePort;
import com.selfintro.modules.identity.application.WorkspaceRestoreReconciliationService;
import com.selfintro.modules.identity.application.WorkspaceVectorStoragePort;
import com.selfintro.modules.storage.application.ObjectStoragePort;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.BucketVersioningStatus;
import software.amazon.awssdk.services.s3.model.ObjectIdentifier;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.VersioningConfiguration;

@SpringBootTest(
        classes = AiWorkerApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
            "app.workspace-purge.execution-enabled=false",
            "app.workspace-purge.object-storage-delete-enabled=true",
            "app.workspace-purge.vector-delete-enabled=true",
            "app.workspace-purge.cache-delete-enabled=true",
            "app.workspace-purge.mysql-delete-enabled=true",
            "app.job-posting.scheduler-enabled=false",
            "spring.task.scheduling.enabled=false",
            "spring.rabbitmq.listener.simple.auto-startup=false",
            "spring.data.redis.database=15"
        })
@EnabledIfEnvironmentVariable(named = "RUN_WORKSPACE_PURGE_REHEARSAL", matches = "true")
class WorkspacePurgeFullRehearsalIntegrationTest {

    private final JdbcTemplate mysql;
    private final JdbcTemplate vector;
    private final WorkspacePurgeService inspectionService;
    private final WorkspaceRestoreReconciliationService reconciliationService;
    private final WorkspacePurgeExecutor executor;
    private final WorkspaceRelationalStoragePort relationalStorage;
    private final WorkspaceVectorStoragePort vectorStorage;
    private final WorkspaceCacheStoragePort cacheStorage;
    private final ObjectStoragePort objectStorage;
    private final StringRedisTemplate redis;
    private final S3Client s3;

    @Value("${app.storage.bucket}")
    private String publicBucket;

    @Value("${app.storage.private-bucket}")
    private String privateBucket;

    private Long workspaceId;
    private Long userId;
    private Long purgeJobId;
    private String auditEventType;
    private String sentinelKey;
    private boolean publicBucketCreated;
    private boolean privateBucketCreated;

    @Autowired
    WorkspacePurgeFullRehearsalIntegrationTest(
            @Qualifier("dataSource") DataSource dataSource,
            @Qualifier("vectorDataSource") DataSource vectorDataSource,
            WorkspacePurgeService inspectionService,
            WorkspaceRestoreReconciliationService reconciliationService,
            WorkspacePurgeExecutor executor,
            WorkspaceRelationalStoragePort relationalStorage,
            WorkspaceVectorStoragePort vectorStorage,
            WorkspaceCacheStoragePort cacheStorage,
            ObjectStoragePort objectStorage,
            StringRedisTemplate redis,
            S3Client s3) {
        this.mysql = new JdbcTemplate(dataSource);
        this.vector = new JdbcTemplate(vectorDataSource);
        this.inspectionService = inspectionService;
        this.reconciliationService = reconciliationService;
        this.executor = executor;
        this.relationalStorage = relationalStorage;
        this.vectorStorage = vectorStorage;
        this.cacheStorage = cacheStorage;
        this.objectStorage = objectStorage;
        this.redis = redis;
        this.s3 = s3;
    }

    @Test
    void restoredClonePurgesAllWorkspaceStoresAndRetainsControlEvidence() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        createBuckets();
        createRelationalFixture(suffix);
        createObjectFixture();
        createVectorFixture();
        createCacheFixture();

        WorkspaceRestoreReconciliationService.ReconciliationReport reconciliation =
                reconciliationService.reconcileControlPlane(LocalDateTime.now());
        assertThat(reconciliation.blockerCodes()).isEmpty();
        assertThat(reconciliation.inspectionJobIds()).contains(purgeJobId);

        WorkspacePurgeService.PurgeJobView dryRun = inspectionService.dryRun(purgeJobId);
        assertThat(dryRun.status()).isEqualTo("READY");
        assertThat(dryRun.blockerCount()).isZero();
        assertThat(dryRun.checkpoints()).hasSize(5).allMatch(view -> view.status().equals("READY"));

        LocalDateTime now = LocalDateTime.now();
        assertThat(executor.execute(purgeJobId, now, now.minusHours(2))).isTrue();

        assertThat(mysqlCount("SELECT COUNT(*) FROM workspace WHERE id = ?", workspaceId)).isZero();
        assertThat(
                        mysqlCount(
                                "SELECT COUNT(*) FROM workspace_member WHERE workspace_id = ?",
                                workspaceId))
                .isZero();
        assertThat(
                        mysqlCount(
                                "SELECT COUNT(*) FROM workspace_membership_invitation WHERE workspace_id = ?",
                                workspaceId))
                .isZero();
        assertThat(
                        mysqlCount(
                                """
                                SELECT COUNT(*) FROM security_audit_event
                                WHERE event_type = ? AND actor_user_id IS NULL
                                  AND workspace_id IS NULL AND target_id IS NULL
                                  AND request_id IS NULL AND ip_hash IS NULL
                                """,
                                auditEventType))
                .isEqualTo(1);
        assertThat(
                        mysql.queryForObject(
                                "SELECT status FROM workspace_purge_job WHERE id = ?",
                                String.class,
                                purgeJobId))
                .isEqualTo("COMPLETED");
        assertThat(
                        mysqlCount(
                                "SELECT COUNT(*) FROM workspace_purge_checkpoint WHERE purge_job_id = ? AND status = 'COMPLETED'",
                                purgeJobId))
                .isEqualTo(5);
        assertThat(relationalStorage.inspect(workspaceId, LocalDateTime.now()).workspaceExists())
                .isFalse();
        assertThat(objectStorage.inspectPrefix(prefix()).totalPurgeCandidateCount()).isZero();
        assertThat(vectorStorage.inspect(workspaceId).totalCandidateCount()).isZero();
        assertThat(cacheStorage.inspect(workspaceId).totalCandidateCount()).isZero();
        assertThat(redis.hasKey(sentinelKey)).isTrue();
        assertThat(executor.execute(purgeJobId, LocalDateTime.now(), now.minusHours(2))).isFalse();
    }

    private void createRelationalFixture(String suffix) {
        String loginId = "purge-rehearsal-" + suffix;
        mysql.update(
                """
                INSERT INTO app_user
                  (login_id, email, password_hash, display_name, status, created_at, updated_at)
                VALUES (?, NULL, 'fixture-hash', 'Purge Rehearsal', 'ACTIVE', NOW(6), NOW(6))
                """,
                loginId);
        userId =
                mysql.queryForObject(
                        "SELECT id FROM app_user WHERE login_id = ?", Long.class, loginId);
        String slug = "w-purge-rehearsal-" + suffix.substring(0, 16);
        mysql.update(
                """
                INSERT INTO workspace
                  (public_key, name, slug, workspace_type, status, publication_status,
                   created_at, updated_at, deleted_at, deletion_requested_by_user_id, purge_after)
                VALUES (UUID_TO_BIN(?), 'Purge Rehearsal', ?, 'PERSONAL', 'DELETED', 'PRIVATE',
                        NOW(6), NOW(6), DATE_SUB(NOW(6), INTERVAL 31 DAY), ?,
                        DATE_SUB(NOW(6), INTERVAL 1 DAY))
                """,
                UUID.randomUUID().toString(),
                slug,
                userId);
        workspaceId =
                mysql.queryForObject("SELECT id FROM workspace WHERE slug = ?", Long.class, slug);
        mysql.update(
                """
                INSERT INTO workspace_member
                  (workspace_id, user_id, workspace_role, status, joined_at)
                VALUES (?, ?, 'OWNER', 'SUSPENDED', NOW(6))
                """,
                workspaceId,
                userId);
        mysql.update(
                """
                INSERT INTO workspace_membership_invitation
                  (workspace_id, invited_by_user_id, recipient_email_canonical, workspace_role,
                   token_hash, status, expires_at, created_at)
                VALUES (?, ?, ?, 'EDITOR', UNHEX(SHA2(?, 256)), 'REVOKED',
                        DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6))
                """,
                workspaceId,
                userId,
                "rehearsal-" + suffix + "@example.invalid",
                suffix);
        auditEventType = "WORKSPACE_PURGE_REHEARSAL_" + suffix.substring(0, 12);
        mysql.update(
                """
                INSERT INTO security_audit_event
                  (event_type, actor_user_id, workspace_id, target_type, target_id, result,
                   reason_code, request_id, ip_hash, created_at)
                VALUES (?, ?, ?, 'WORKSPACE', ?, 'SUCCESS', NULL, ?, ?, NOW(6))
                """,
                auditEventType,
                userId,
                workspaceId,
                workspaceId.toString(),
                "rehearsal-request-" + suffix,
                "rehearsal-ip-" + suffix);
        mysql.update(
                """
                INSERT INTO workspace_purge_job
                  (workspace_id, workspace_public_key, requested_by_user_id, status, eligible_at,
                   attempt_count, blocker_count, inventory_version, created_at, updated_at)
                SELECT id, public_key, ?, 'PENDING_GRACE', purge_after,
                       0, 0, 'workspace-purge-v1', NOW(6), NOW(6)
                FROM workspace WHERE id = ?
                """,
                userId,
                workspaceId);
        purgeJobId =
                mysql.queryForObject(
                        "SELECT id FROM workspace_purge_job WHERE workspace_id = ?",
                        Long.class,
                        workspaceId);
        for (String store :
                List.of(
                        "MYSQL_PRIMARY",
                        "OBJECT_STORAGE",
                        "ORACLE_VECTOR",
                        "ORACLE_NOSQL",
                        "REDIS_CACHE")) {
            mysql.update(
                    """
                    INSERT INTO workspace_purge_checkpoint
                      (purge_job_id, store_type, status, candidate_count, created_at, updated_at)
                    VALUES (?, ?, 'PENDING', 0, NOW(6), NOW(6))
                    """,
                    purgeJobId,
                    store);
        }
    }

    private void createObjectFixture() {
        enableVersioning(publicBucket);
        enableVersioning(privateBucket);
        String removedKey = prefix() + "experience/versioned.txt";
        put(publicBucket, removedKey, "version-one");
        put(publicBucket, removedKey, "version-two");
        s3.deleteObject(builder -> builder.bucket(publicBucket).key(removedKey));
        put(publicBucket, prefix() + "study/current.txt", "current-study");
        put(privateBucket, prefix() + "print-template/final-pdf/result.pdf", "private-pdf");
        String multipartKey = prefix() + "portfolio/pending.bin";
        String uploadId =
                s3.createMultipartUpload(builder -> builder.bucket(publicBucket).key(multipartKey))
                        .uploadId();
        s3.uploadPart(
                builder ->
                        builder.bucket(publicBucket)
                                .key(multipartKey)
                                .uploadId(uploadId)
                                .partNumber(1),
                RequestBody.fromBytes(new byte[6 * 1024 * 1024]));
        assertThat(objectStorage.inspectPrefix(prefix()).totalPurgeCandidateCount()).isEqualTo(6);
    }

    private void createVectorFixture() {
        String vectorLiteral = "[" + String.join(",", Collections.nCopies(2048, "0")) + "]";
        vector.update(
                """
                INSERT INTO experience_vector
                  (workspace_id, experience_id, chunk_content, embedding_vector, created_at)
                VALUES (?, ?, ?, TO_VECTOR(?), SYSTIMESTAMP)
                """,
                workspaceId,
                workspaceId * 10,
                "rehearsal experience",
                vectorLiteral);
        vector.update(
                """
                INSERT INTO study_vector
                  (workspace_id, study_id, chunk_content, embedding_vector, created_at)
                VALUES (?, ?, ?, TO_VECTOR(?), SYSTIMESTAMP)
                """,
                workspaceId,
                workspaceId * 10,
                "rehearsal study",
                vectorLiteral);
        assertThat(vectorStorage.inspect(workspaceId).totalCandidateCount()).isEqualTo(2);
    }

    private void createCacheFixture() {
        redis.opsForValue().set("workspace-visitor:summary::" + workspaceId, "fixture");
        redis.opsForValue().set("experience-tree:index::" + workspaceId + ":ALL", "fixture");
        redis.opsForValue().set("bff:introduction::purge-rehearsal", "fixture");
        sentinelKey = "purge-rehearsal:sentinel:" + workspaceId;
        redis.opsForValue().set(sentinelKey, "keep");
        assertThat(cacheStorage.inspect(workspaceId).totalCandidateCount()).isEqualTo(3);
    }

    private void createBuckets() {
        s3.createBucket(builder -> builder.bucket(publicBucket));
        publicBucketCreated = true;
        s3.createBucket(builder -> builder.bucket(privateBucket));
        privateBucketCreated = true;
    }

    private void enableVersioning(String bucket) {
        s3.putBucketVersioning(
                builder ->
                        builder.bucket(bucket)
                                .versioningConfiguration(
                                        VersioningConfiguration.builder()
                                                .status(BucketVersioningStatus.ENABLED)
                                                .build()));
    }

    private void put(String bucket, String key, String content) {
        s3.putObject(
                PutObjectRequest.builder().bucket(bucket).key(key).build(),
                RequestBody.fromString(content, StandardCharsets.UTF_8));
    }

    private String prefix() {
        return "workspaces/" + workspaceId + "/";
    }

    private long mysqlCount(String sql, Object... arguments) {
        return mysql.queryForObject(sql, Long.class, arguments);
    }

    @AfterEach
    void cleanupExternalFixtures() {
        if (workspaceId != null) {
            vector.update("DELETE FROM experience_vector WHERE workspace_id = ?", workspaceId);
            vector.update("DELETE FROM study_vector WHERE workspace_id = ?", workspaceId);
        }
        if (sentinelKey != null) redis.delete(sentinelKey);
        cleanupBucket(publicBucket, publicBucketCreated);
        cleanupBucket(privateBucket, privateBucketCreated);
    }

    private void cleanupBucket(String bucket, boolean created) {
        if (!created) return;
        try {
            for (var uploadPage :
                    s3.listMultipartUploadsPaginator(builder -> builder.bucket(bucket))) {
                uploadPage
                        .uploads()
                        .forEach(
                                upload ->
                                        s3.abortMultipartUpload(
                                                builder ->
                                                        builder.bucket(bucket)
                                                                .key(upload.key())
                                                                .uploadId(upload.uploadId())));
            }
            List<ObjectIdentifier> identifiers = new ArrayList<>();
            for (var page : s3.listObjectVersionsPaginator(builder -> builder.bucket(bucket))) {
                page.versions()
                        .forEach(
                                version ->
                                        identifiers.add(
                                                ObjectIdentifier.builder()
                                                        .key(version.key())
                                                        .versionId(version.versionId())
                                                        .build()));
                page.deleteMarkers()
                        .forEach(
                                marker ->
                                        identifiers.add(
                                                ObjectIdentifier.builder()
                                                        .key(marker.key())
                                                        .versionId(marker.versionId())
                                                        .build()));
            }
            for (ObjectIdentifier identifier : identifiers) {
                s3.deleteObject(
                        builder ->
                                builder.bucket(bucket)
                                        .key(identifier.key())
                                        .versionId(identifier.versionId()));
            }
        } finally {
            s3.deleteBucket(builder -> builder.bucket(bucket));
        }
    }
}
