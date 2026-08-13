package com.selfintro.modules.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.selfintro.modules.identity.application.WorkspaceCacheStoragePort.WorkspaceCacheInventory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;

@EnabledIfSystemProperty(named = "workspaceCacheRedisIntegration", matches = "true")
class RedisWorkspaceCacheStorageAdapterIntegrationTest {

    private LettuceConnectionFactory connectionFactory;
    private StringRedisTemplate redis;
    private RedisWorkspaceCacheStorageAdapter adapter;

    @BeforeEach
    void setUp() {
        RedisStandaloneConfiguration configuration =
                new RedisStandaloneConfiguration("localhost", 6379);
        configuration.setDatabase(15);
        connectionFactory = new LettuceConnectionFactory(configuration);
        connectionFactory.afterPropertiesSet();
        redis = new StringRedisTemplate(connectionFactory);
        redis.afterPropertiesSet();
        flushFixtureDatabase();
        StaticListableBeanFactory beanFactory = new StaticListableBeanFactory();
        beanFactory.addBean("redisConnectionFactory", connectionFactory);
        adapter =
                new RedisWorkspaceCacheStorageAdapter(
                        beanFactory.getBeanProvider(RedisConnectionFactory.class));
        ReflectionTestUtils.setField(adapter, "cacheDeleteEnabled", true);
    }

    @AfterEach
    void tearDown() {
        flushFixtureDatabase();
        connectionFactory.destroy();
    }

    @Test
    void inspectsAndPurgesOnlyRegisteredCacheNamespaces() {
        put("workspace-visitor:summary::42");
        put("experience-tree:index::42:ALL:");
        put("experience-tree:detail::42:decision-key");
        put("experience-tree:studies::42:decision-key:false");
        put("print_template:public::42");
        put("bff:introduction::legacy");
        put("bff:learning::legacy");
        put("print_template:public::SimpleKey []");
        put("print_template:public::99");
        put("experience-tree:index::99:ALL:");
        put("spring:session:sessions:test");
        put("visitor:summary::2026-08-11");

        WorkspaceCacheInventory inventory = adapter.inspect(42L);

        assertThat(inventory.workspaceScopedKeyCount()).isEqualTo(5);
        assertThat(inventory.legacySharedNamespaceKeyCount()).isEqualTo(4);
        assertThat(adapter.purge(42L).evictedKeyCount()).isEqualTo(9);
        assertThat(adapter.inspect(42L).totalCandidateCount()).isZero();
        assertThat(redis.hasKey("experience-tree:index::99:ALL:")).isTrue();
        assertThat(redis.hasKey("spring:session:sessions:test")).isTrue();
        assertThat(redis.hasKey("visitor:summary::2026-08-11")).isTrue();
    }

    private void put(String key) {
        redis.opsForValue().set(key, "fixture");
    }

    private void flushFixtureDatabase() {
        try (RedisConnection connection = connectionFactory.getConnection()) {
            connection.serverCommands().flushDb();
        }
    }
}
