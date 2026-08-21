package com.selfintro.global.secret;

import com.oracle.bmc.secrets.Secrets;
import com.oracle.bmc.secrets.model.Base64SecretBundleContentDetails;
import com.oracle.bmc.secrets.model.SecretBundleContentDetails;
import com.oracle.bmc.secrets.requests.GetSecretBundleRequest;
import com.oracle.bmc.vault.Vaults;
import com.oracle.bmc.vault.model.Base64SecretContentDetails;
import com.oracle.bmc.vault.model.CreateSecretDetails;
import com.oracle.bmc.vault.model.ScheduleSecretDeletionDetails;
import com.oracle.bmc.vault.requests.CreateSecretRequest;
import com.oracle.bmc.vault.requests.ScheduleSecretDeletionRequest;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.secrets.provider", havingValue = "oci-vault")
public class OciVaultSecretProvider implements SecretProvider {

    private static final String OCI_SECRET_OCID_PREFIX = "ocid1.vaultsecret.";

    private final Vaults vaults;
    private final Secrets secrets;
    private final String compartmentId;
    private final String vaultId;
    private final String keyId;
    private final String namePrefix;
    private final int recoveryDays;

    public OciVaultSecretProvider(
            Vaults vaults,
            Secrets secrets,
            @Value("${app.secrets.oci.compartment-id}") String compartmentId,
            @Value("${app.secrets.oci.vault-id}") String vaultId,
            @Value("${app.secrets.oci.key-id}") String keyId,
            @Value("${app.secrets.name-prefix:self-intro}") String namePrefix,
            @Value("${app.secrets.oci.recovery-days:7}") int recoveryDays) {
        this.vaults = vaults;
        this.secrets = secrets;
        this.compartmentId = requireSetting(compartmentId, "compartment-id");
        this.vaultId = requireSetting(vaultId, "vault-id");
        this.keyId = requireSetting(keyId, "key-id");
        this.namePrefix = sanitize(namePrefix);
        this.recoveryDays = Math.max(1, Math.min(recoveryDays, 30));
    }

    @Override
    public String store(String namespace, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("빈 비밀 값은 저장할 수 없습니다.");
        }
        String secretName = namePrefix + "-" + sanitize(namespace) + "-" + UUID.randomUUID();
        String content = Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
        CreateSecretDetails details =
                CreateSecretDetails.builder()
                        .compartmentId(compartmentId)
                        .vaultId(vaultId)
                        .keyId(keyId)
                        .secretName(secretName)
                        .secretContent(
                                Base64SecretContentDetails.builder().content(content).build())
                        .build();
        return vaults.createSecret(
                        CreateSecretRequest.builder().createSecretDetails(details).build())
                .getSecret()
                .getId();
    }

    @Override
    public String resolve(String reference) {
        validateReference(reference);
        SecretBundleContentDetails content =
                secrets.getSecretBundle(
                                GetSecretBundleRequest.builder().secretId(reference).build())
                        .getSecretBundle()
                        .getSecretBundleContent();
        if (!(content instanceof Base64SecretBundleContentDetails base64Content)
                || base64Content.getContent() == null) {
            throw new IllegalStateException("OCI Vault 비밀 형식을 해석할 수 없습니다.");
        }
        return new String(
                Base64.getDecoder().decode(base64Content.getContent()), StandardCharsets.UTF_8);
    }

    @Override
    public void revoke(String reference) {
        validateReference(reference);
        ScheduleSecretDeletionDetails details =
                ScheduleSecretDeletionDetails.builder()
                        .timeOfDeletion(
                                Date.from(Instant.now().plus(recoveryDays, ChronoUnit.DAYS)))
                        .build();
        vaults.scheduleSecretDeletion(
                ScheduleSecretDeletionRequest.builder()
                        .secretId(reference)
                        .scheduleSecretDeletionDetails(details)
                        .build());
    }

    private static void validateReference(String reference) {
        if (reference == null || !reference.startsWith(OCI_SECRET_OCID_PREFIX)) {
            throw new IllegalArgumentException("올바른 OCI Vault Secret OCID가 아닙니다.");
        }
    }

    private static String requireSetting(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("OCI Vault 설정이 비어 있습니다: " + name);
        }
        return value;
    }

    private static String sanitize(String value) {
        String sanitized = value == null ? "secret" : value.replaceAll("[^A-Za-z0-9_.-]", "-");
        sanitized = sanitized.replaceAll("-+", "-");
        return sanitized.isBlank()
                ? "secret"
                : sanitized.substring(0, Math.min(80, sanitized.length()));
    }
}
