package com.selfintro.modules.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.test.util.ReflectionTestUtils;

class RedisWorkspaceCacheStorageAdapterTest {

    @Test
    void registrySeparatesWorkspacePatternsFromLegacySharedNamespaces() {
        assertThat(RedisWorkspaceCacheStorageAdapter.workspacePatterns(42L))
                .containsExactly(
                        "workspace-visitor:summary::42",
                        "experience-tree:index::42:*",
                        "experience-tree:detail::42:*",
                        "experience-tree:studies::42:*",
                        "print_template:public::42");
        assertThat(RedisWorkspaceCacheStorageAdapter.legacySharedPatterns())
                .containsExactly(
                        "bff:introduction::*", "bff:learning::*", "print_template:public::*");
    }

    @Test
    void purgeFailsBeforeRedisCallWhileDeleteFlagIsDisabled() {
        @SuppressWarnings("unchecked")
        ObjectProvider<RedisConnectionFactory> provider = Mockito.mock(ObjectProvider.class);
        RedisWorkspaceCacheStorageAdapter adapter = new RedisWorkspaceCacheStorageAdapter(provider);
        ReflectionTestUtils.setField(adapter, "cacheDeleteEnabled", false);

        assertThatThrownBy(() -> adapter.purge(42L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("비활성화");
        Mockito.verifyNoInteractions(provider);
    }

    @Test
    void rejectsNonPositiveWorkspaceId() {
        @SuppressWarnings("unchecked")
        ObjectProvider<RedisConnectionFactory> provider = Mockito.mock(ObjectProvider.class);
        RedisWorkspaceCacheStorageAdapter adapter = new RedisWorkspaceCacheStorageAdapter(provider);

        assertThatThrownBy(() -> adapter.inspect(0L)).isInstanceOf(IllegalArgumentException.class);
    }
}
