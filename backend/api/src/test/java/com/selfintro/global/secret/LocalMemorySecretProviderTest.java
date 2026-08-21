package com.selfintro.global.secret;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class LocalMemorySecretProviderTest {

    private final LocalMemorySecretProvider provider = new LocalMemorySecretProvider();

    @Test
    void storesResolvesAndRevokesWithoutExposingTheSecretInTheReference() {
        String secret = "test-billing-key";

        String reference = provider.store("billing/workspaces/1/methods", secret);

        assertThat(reference).startsWith("local-memory://").doesNotContain(secret);
        assertThat(provider.resolve(reference)).isEqualTo(secret);

        provider.revoke(reference);

        assertThatThrownBy(() -> provider.resolve(reference))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("결제수단을 다시 등록");
    }

    @Test
    void rejectsBlankSecrets() {
        assertThatThrownBy(() -> provider.store("billing", " "))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
