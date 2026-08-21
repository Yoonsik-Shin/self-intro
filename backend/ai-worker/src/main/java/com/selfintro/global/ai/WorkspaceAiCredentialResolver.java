package com.selfintro.global.ai;

import com.selfintro.global.secret.SecretProvider;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorkspaceAiCredentialResolver {

    private final JdbcTemplate jdbcTemplate;
    private final SecretProvider secretProvider;

    public Optional<Credential> current() {
        return AiRequestWorkspaceContext.workspaceId().flatMap(this::resolve);
    }

    private Optional<Credential> resolve(Long workspaceId) {
        List<CredentialReference> rows =
                jdbcTemplate.query(
                        """
                        SELECT p.credential_mode, p.provider, c.secret_reference
                          FROM workspace_ai_policy p
                          LEFT JOIN workspace_ai_provider_credential c
                            ON c.workspace_id = p.workspace_id
                           AND c.provider = p.provider AND c.status = 'ACTIVE'
                         WHERE p.workspace_id = ?
                        """,
                        (resultSet, rowNum) ->
                                new CredentialReference(
                                        resultSet.getString(1),
                                        resultSet.getString(2),
                                        resultSet.getString(3)),
                        workspaceId);
        if (rows.isEmpty() || !rows.get(0).credentialMode().equals("BYOK")) {
            return Optional.empty();
        }
        CredentialReference reference = rows.get(0);
        if (reference.secretReference() == null || reference.secretReference().isBlank()) {
            throw new AiPolicyViolationException("선택한 BYOK 자격 증명을 사용할 수 없습니다.");
        }
        return Optional.of(
                new Credential(
                        reference.provider(), secretProvider.resolve(reference.secretReference())));
    }

    public record Credential(String provider, String apiKey) {}

    private record CredentialReference(
            String credentialMode, String provider, String secretReference) {}
}
