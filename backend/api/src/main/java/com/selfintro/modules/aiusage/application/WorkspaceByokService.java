package com.selfintro.modules.aiusage.application;

import com.selfintro.global.secret.SecretProvider;
import com.selfintro.modules.aiusage.presentation.dto.WorkspaceByokStatusResponse;
import com.selfintro.modules.identity.application.PlatformOwnerPreviewPolicy;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WorkspaceByokService {

    private final JdbcTemplate jdbcTemplate;
    private final SecretProvider secretProvider;
    private final SecurityAuditService auditService;
    private final PlatformOwnerPreviewPolicy previewPolicy;

    @Value("${app.ai.byok-enabled:false}")
    private boolean byokEnabled;

    public WorkspaceByokStatusResponse status(Long workspaceId) {
        List<WorkspaceByokStatusResponse> rows =
                jdbcTemplate.query(
                        """
                        SELECT p.credential_mode, p.provider, p.allow_generation,
                               c.masked_fingerprint, c.status, c.key_version,
                               c.last_validated_at, c.rotated_at
                          FROM workspace_ai_policy p
                          LEFT JOIN workspace_ai_provider_credential c
                            ON c.workspace_id = p.workspace_id AND c.provider = p.provider
                         WHERE p.workspace_id = ?
                        """,
                        (resultSet, rowNum) ->
                                new WorkspaceByokStatusResponse(
                                        resultSet.getString(1),
                                        resultSet.getString(2),
                                        resultSet.getBoolean(3),
                                        resultSet.getString(4),
                                        resultSet.getString(5),
                                        resultSet.getString(6),
                                        nullable(resultSet.getTimestamp(7)),
                                        nullable(resultSet.getTimestamp(8))),
                        workspaceId);
        return rows.stream()
                .findFirst()
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.CONFLICT, "Workspace AI 정책을 찾을 수 없습니다."));
    }

    @Transactional
    public WorkspaceByokStatusResponse configure(
            WorkspaceMember actor, String rawProvider, String apiKey) {
        requireEnabled(actor);
        requireOwnerAndMfa(actor);
        String provider = normalizeProvider(rawProvider);
        if (apiKey == null || apiKey.isBlank() || apiKey.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효한 API key를 입력해 주세요.");
        }
        Long workspaceId = actor.getWorkspace().getId();
        String reference =
                secretProvider.store(
                        "ai/workspaces/" + workspaceId + "/" + provider.toLowerCase(Locale.ROOT),
                        apiKey.trim());
        try {
            List<String> oldReferences =
                    jdbcTemplate.queryForList(
                            """
                            SELECT secret_reference
                              FROM workspace_ai_provider_credential
                             WHERE workspace_id = ?
                             FOR UPDATE
                            """,
                            String.class,
                            workspaceId);
            LocalDateTime now = LocalDateTime.now();
            String keyVersion = UUID.randomUUID().toString();
            jdbcTemplate.update(
                    """
                    INSERT INTO workspace_ai_provider_credential
                      (workspace_id, provider, secret_reference, masked_fingerprint, status,
                       key_version, last_validated_at, rotated_at, revoked_at, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 'ACTIVE', ?, NULL, ?, NULL, ?, ?)
                    ON DUPLICATE KEY UPDATE
                      secret_reference = VALUES(secret_reference),
                      masked_fingerprint = VALUES(masked_fingerprint), status = 'ACTIVE',
                      key_version = VALUES(key_version), last_validated_at = NULL,
                      rotated_at = VALUES(rotated_at), revoked_at = NULL,
                      updated_at = VALUES(updated_at)
                    """,
                    workspaceId,
                    provider,
                    reference,
                    fingerprint(apiKey),
                    keyVersion,
                    now,
                    now,
                    now);
            jdbcTemplate.update(
                    """
                    UPDATE workspace_ai_provider_credential
                       SET status = 'REVOKED', revoked_at = ?, updated_at = ?
                     WHERE workspace_id = ? AND provider <> ?
                       AND status IN ('ACTIVE', 'SUSPENDED')
                    """,
                    now,
                    now,
                    workspaceId,
                    provider);
            jdbcTemplate.update(
                    """
                    UPDATE workspace_ai_policy
                       SET credential_mode = 'BYOK', provider = ?, allow_generation = 1,
                           allow_embedding = 0, policy_version = '2026-08-21',
                           version = version + 1, updated_at = ?
                     WHERE workspace_id = ?
                    """,
                    provider,
                    now,
                    workspaceId);
            afterCommit(
                    () ->
                            oldReferences.stream()
                                    .filter(old -> !old.equals(reference))
                                    .forEach(this::safeRevoke));
            auditService.recordWorkspaceAction(
                    "WORKSPACE_BYOK_CONFIGURED",
                    actor.getUser().getId(),
                    actor.getWorkspace().getId());
            return status(workspaceId);
        } catch (RuntimeException exception) {
            safeRevoke(reference);
            throw exception;
        }
    }

    @Transactional
    public WorkspaceByokStatusResponse revoke(WorkspaceMember actor) {
        requireEnabled(actor);
        requireOwnerAndMfa(actor);
        Long workspaceId = actor.getWorkspace().getId();
        List<String> references =
                jdbcTemplate.queryForList(
                        """
                        SELECT secret_reference
                          FROM workspace_ai_provider_credential
                         WHERE workspace_id = ? AND status = 'ACTIVE'
                         FOR UPDATE
                        """,
                        String.class,
                        workspaceId);
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                """
                UPDATE workspace_ai_provider_credential
                   SET status = 'REVOKED', revoked_at = ?, updated_at = ?
                 WHERE workspace_id = ? AND status = 'ACTIVE'
                """,
                now,
                now,
                workspaceId);
        // Revocation never silently falls back to a platform key. AI stays disabled until the
        // OWNER explicitly selects a new route.
        jdbcTemplate.update(
                """
                UPDATE workspace_ai_policy
                   SET allow_generation = 0, allow_embedding = 0,
                       version = version + 1, updated_at = ?
                 WHERE workspace_id = ?
                """,
                now,
                workspaceId);
        afterCommit(() -> references.forEach(this::safeRevoke));
        auditService.recordWorkspaceAction(
                "WORKSPACE_BYOK_REVOKED", actor.getUser().getId(), actor.getWorkspace().getId());
        return status(workspaceId);
    }

    @Transactional
    public WorkspaceByokStatusResponse usePlatformManaged(WorkspaceMember actor) {
        requireEnabled(actor);
        requireOwnerAndMfa(actor);
        Long workspaceId = actor.getWorkspace().getId();
        jdbcTemplate.update(
                """
                UPDATE workspace_ai_policy
                   SET credential_mode = 'PLATFORM_MANAGED', provider = 'NVIDIA',
                       allow_generation = 1, allow_embedding = 1,
                       version = version + 1, updated_at = CURRENT_TIMESTAMP(6)
                 WHERE workspace_id = ?
                """,
                workspaceId);
        auditService.recordWorkspaceAction(
                "WORKSPACE_AI_PLATFORM_ROUTE_SELECTED",
                actor.getUser().getId(),
                actor.getWorkspace().getId());
        return status(workspaceId);
    }

    private static void requireOwnerAndMfa(WorkspaceMember actor) {
        if (actor.getRole() != WorkspaceRole.OWNER) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "리소스를 찾을 수 없습니다.");
        }
        if (!actor.getUser().isMfaEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.PRECONDITION_REQUIRED, "내 AI API 키를 연결하기 전에 MFA를 등록해 주세요.");
        }
    }

    private void requireEnabled(WorkspaceMember actor) {
        if (!byokEnabled
                && !previewPolicy.isAllowed(
                        actor.getUser().getId(), actor.getWorkspace().getId())) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "비공개 베타에서는 내 AI API 키 연결 기능을 제공하지 않습니다.");
        }
    }

    private static String normalizeProvider(String provider) {
        String normalized = provider == null ? "" : provider.toUpperCase(Locale.ROOT);
        if (!normalized.equals("OPENAI")
                && !normalized.equals("ANTHROPIC")
                && !normalized.equals("GEMINI")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 Provider입니다.");
        }
        return normalized;
    }

    private static String fingerprint(String apiKey) {
        try {
            String hash =
                    HexFormat.of()
                            .formatHex(
                                    MessageDigest.getInstance("SHA-256")
                                            .digest(apiKey.getBytes(StandardCharsets.UTF_8)));
            return "sha256:" + hash.substring(0, 12);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private void safeRevoke(String reference) {
        try {
            secretProvider.revoke(reference);
        } catch (RuntimeException ignored) {
            // Keep the application result deterministic without exposing secret metadata.
        }
    }

    private static void afterCommit(Runnable action) {
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        action.run();
                    }
                });
    }

    private static LocalDateTime nullable(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
