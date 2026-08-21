package com.selfintro.global.secret;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.oracle.bmc.secrets.Secrets;
import com.oracle.bmc.secrets.model.Base64SecretBundleContentDetails;
import com.oracle.bmc.secrets.model.SecretBundle;
import com.oracle.bmc.secrets.responses.GetSecretBundleResponse;
import com.oracle.bmc.vault.Vaults;
import com.oracle.bmc.vault.model.Base64SecretContentDetails;
import com.oracle.bmc.vault.model.Secret;
import com.oracle.bmc.vault.requests.CreateSecretRequest;
import com.oracle.bmc.vault.requests.ScheduleSecretDeletionRequest;
import com.oracle.bmc.vault.responses.CreateSecretResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class OciVaultSecretProviderTest {

    private Vaults vaults;
    private Secrets secrets;
    private OciVaultSecretProvider provider;

    @BeforeEach
    void setUp() {
        vaults = mock(Vaults.class);
        secrets = mock(Secrets.class);
        provider =
                new OciVaultSecretProvider(
                        vaults,
                        secrets,
                        "ocid1.compartment.test",
                        "ocid1.vault.test",
                        "ocid1.key.test",
                        "self-intro",
                        7);
    }

    @Test
    void storesBase64EncodedSecretAndReturnsOcid() {
        CreateSecretResponse response = mock(CreateSecretResponse.class);
        Secret created = mock(Secret.class);
        when(created.getId()).thenReturn("ocid1.vaultsecret.test-secret");
        when(response.getSecret()).thenReturn(created);
        when(vaults.createSecret(any())).thenReturn(response);

        String reference = provider.store("workspace/12/byok", "sensitive-key");

        assertThat(reference).isEqualTo("ocid1.vaultsecret.test-secret");
        ArgumentCaptor<CreateSecretRequest> captor =
                ArgumentCaptor.forClass(CreateSecretRequest.class);
        verify(vaults).createSecret(captor.capture());
        var details = captor.getValue().getCreateSecretDetails();
        assertThat(details.getCompartmentId()).isEqualTo("ocid1.compartment.test");
        assertThat(details.getVaultId()).isEqualTo("ocid1.vault.test");
        assertThat(details.getKeyId()).isEqualTo("ocid1.key.test");
        assertThat(details.getSecretName()).startsWith("self-intro-workspace-12-byok-");
        String encoded = ((Base64SecretContentDetails) details.getSecretContent()).getContent();
        assertThat(new String(Base64.getDecoder().decode(encoded), StandardCharsets.UTF_8))
                .isEqualTo("sensitive-key");
    }

    @Test
    void resolvesCurrentBase64Secret() {
        String encoded =
                Base64.getEncoder()
                        .encodeToString("sensitive-key".getBytes(StandardCharsets.UTF_8));
        SecretBundle bundle =
                SecretBundle.builder()
                        .secretBundleContent(
                                Base64SecretBundleContentDetails.builder().content(encoded).build())
                        .build();
        GetSecretBundleResponse response = mock(GetSecretBundleResponse.class);
        when(response.getSecretBundle()).thenReturn(bundle);
        when(secrets.getSecretBundle(any())).thenReturn(response);

        assertThat(provider.resolve("ocid1.vaultsecret.test-secret")).isEqualTo("sensitive-key");
    }

    @Test
    void schedulesRecoverableDeletion() {
        provider.revoke("ocid1.vaultsecret.test-secret");

        ArgumentCaptor<ScheduleSecretDeletionRequest> captor =
                ArgumentCaptor.forClass(ScheduleSecretDeletionRequest.class);
        verify(vaults).scheduleSecretDeletion(captor.capture());
        Instant deletionTime =
                captor.getValue()
                        .getScheduleSecretDeletionDetails()
                        .getTimeOfDeletion()
                        .toInstant();
        assertThat(Duration.between(Instant.now(), deletionTime).toDays()).isBetween(6L, 7L);
    }

    @Test
    void rejectsNonOciReference() {
        assertThatThrownBy(() -> provider.resolve("not-an-ocid"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
