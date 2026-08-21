package com.selfintro.global.secret;

import com.oracle.bmc.Region;
import com.oracle.bmc.auth.AbstractAuthenticationDetailsProvider;
import com.oracle.bmc.auth.ConfigFileAuthenticationDetailsProvider;
import com.oracle.bmc.auth.InstancePrincipalsAuthenticationDetailsProvider;
import com.oracle.bmc.auth.okeworkloadidentity.OkeWorkloadIdentityAuthenticationDetailsProvider;
import com.oracle.bmc.secrets.SecretsClient;
import com.oracle.bmc.vault.VaultsClient;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "app.secrets.provider", havingValue = "oci-vault")
public class OciVaultSecretProviderConfig {

    @Bean
    AbstractAuthenticationDetailsProvider ociAuthenticationDetailsProvider(
            @Value("${app.secrets.oci.auth-mode:oke-workload-identity}") String authMode,
            @Value("${app.secrets.oci.config-file:}") String configFile,
            @Value("${app.secrets.oci.profile:DEFAULT}") String profile)
            throws IOException {
        return switch (authMode) {
            case "oke-workload-identity" ->
                    new OkeWorkloadIdentityAuthenticationDetailsProvider
                                    .OkeWorkloadIdentityAuthenticationDetailsProviderBuilder()
                            .build();
            case "instance-principal" ->
                    InstancePrincipalsAuthenticationDetailsProvider.builder().build();
            case "config-file" ->
                    configFile.isBlank()
                            ? new ConfigFileAuthenticationDetailsProvider(profile)
                            : new ConfigFileAuthenticationDetailsProvider(configFile, profile);
            default -> throw new IllegalArgumentException("지원하지 않는 OCI 인증 방식입니다: " + authMode);
        };
    }

    @Bean(destroyMethod = "close")
    VaultsClient ociVaultsClient(
            AbstractAuthenticationDetailsProvider authenticationDetailsProvider,
            @Value("${app.secrets.oci.region}") String region) {
        VaultsClient client = VaultsClient.builder().build(authenticationDetailsProvider);
        client.setRegion(Region.fromRegionId(region));
        return client;
    }

    @Bean(destroyMethod = "close")
    SecretsClient ociSecretsClient(
            AbstractAuthenticationDetailsProvider authenticationDetailsProvider,
            @Value("${app.secrets.oci.region}") String region) {
        SecretsClient client = SecretsClient.builder().build(authenticationDetailsProvider);
        client.setRegion(Region.fromRegionId(region));
        return client;
    }
}
