package com.selfintro.modules.aiusage.application;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AiProcessingConsentService {

    private final JdbcTemplate jdbcTemplate;

    @Value("${app.ai.usage.enforcement-enabled:false}")
    private boolean enforcementEnabled;

    @Value("${app.ai.usage.consent-policy-version:2026-08-21}")
    private String requiredPolicyVersion;

    @Transactional
    public AiProcessingRoute requireOrRecord(AiExecutionCommand command) {
        return requireOrRecord(command, enforcementEnabled);
    }

    @Transactional
    public AiProcessingRoute requireOrRecord(
            AiExecutionCommand command, boolean requireAcknowledgement) {
        AiProcessingRoute route = loadRoute(command.workspaceId());
        String acknowledged = command.acknowledgedConsentVersion();
        if (acknowledged == null || acknowledged.isBlank()) {
            if (requireAcknowledgement) {
                throw new ResponseStatusException(
                        HttpStatus.PRECONDITION_REQUIRED, "AI 처리 경로와 전송 범위를 확인하고 동의해 주세요.");
            }
            return route;
        }
        if (!requiredPolicyVersion.equals(acknowledged)) {
            throw new ResponseStatusException(
                    HttpStatus.PRECONDITION_REQUIRED, "AI 처리 정책이 변경되었습니다. 최신 내용을 다시 확인해 주세요.");
        }

        String categories = normalizeCategories(command.dataCategories());
        Integer existing =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*) FROM workspace_ai_processing_consent
                         WHERE workspace_id = ? AND user_id = ? AND purpose_code = ?
                           AND provider = ? AND region = ? AND credential_mode = ?
                           AND policy_version = ? AND granted = 1 AND revoked_at IS NULL
                        """,
                        Integer.class,
                        command.workspaceId(),
                        command.actorUserId(),
                        command.feature().name(),
                        route.provider(),
                        route.region(),
                        route.credentialMode(),
                        requiredPolicyVersion);
        if (existing == null || existing == 0) {
            jdbcTemplate.update(
                    """
                    INSERT INTO workspace_ai_processing_consent (
                      workspace_id, user_id, purpose_code, provider, region, credential_mode,
                      data_categories, policy_version, granted, recorded_at, revoked_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NULL)
                    """,
                    command.workspaceId(),
                    command.actorUserId(),
                    command.feature().name(),
                    route.provider(),
                    route.region(),
                    route.credentialMode(),
                    categories,
                    requiredPolicyVersion,
                    LocalDateTime.now());
        }
        return route;
    }

    private AiProcessingRoute loadRoute(Long workspaceId) {
        ensureDefaultPolicy(workspaceId);
        List<AiProcessingRoute> routes =
                jdbcTemplate.query(
                        """
                        SELECT provider, region, credential_mode
                          FROM workspace_ai_policy
                         WHERE workspace_id = ? AND allow_generation = 1
                        """,
                        (resultSet, rowNum) ->
                                new AiProcessingRoute(
                                        resultSet.getString(1),
                                        resultSet.getString(2),
                                        resultSet.getString(3)),
                        workspaceId);
        if (routes.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Workspace AI 처리 정책이 없거나 생성 기능이 비활성화되었습니다.");
        }
        return routes.get(0);
    }

    private void ensureDefaultPolicy(Long workspaceId) {
        Integer count =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM workspace_ai_policy WHERE workspace_id = ?",
                        Integer.class,
                        workspaceId);
        if (count != null && count > 0) {
            return;
        }
        try {
            jdbcTemplate.update(
                    """
                    INSERT INTO workspace_ai_policy (
                      workspace_id, credential_mode, provider, model_tier, region,
                      allow_generation, allow_embedding, policy_version, version,
                      created_at, updated_at
                    ) VALUES (?, 'PLATFORM_MANAGED', 'NVIDIA', 'STANDARD', 'PLATFORM_DEFAULT',
                              1, 1, ?, 0, ?, ?)
                    """,
                    workspaceId,
                    requiredPolicyVersion,
                    LocalDateTime.now(),
                    LocalDateTime.now());
        } catch (DuplicateKeyException ignored) {
            // 다른 요청이 같은 Workspace의 기본 AI 정책을 먼저 만들었다.
        }
    }

    private static String normalizeCategories(Set<String> categories) {
        String normalized =
                categories.stream()
                        .peek(AiProcessingConsentService::validateCategory)
                        .sorted(Comparator.naturalOrder())
                        .reduce((left, right) -> left + "," + right)
                        .orElse("NONE");
        if (normalized.length() > 500) {
            throw new IllegalArgumentException("AI 전송 데이터 범주가 너무 많습니다.");
        }
        return normalized;
    }

    private static void validateCategory(String category) {
        if (category == null
                || category.isBlank()
                || category.length() > 60
                || !category.matches("[A-Z][A-Z0-9_]*")) {
            throw new IllegalArgumentException("AI 전송 범주는 제한된 코드만 사용할 수 있습니다.");
        }
    }

    public record AiProcessingRoute(String provider, String region, String credentialMode) {}
}
