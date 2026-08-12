package com.selfintro.modules.identity.infrastructure;

import com.selfintro.modules.identity.application.WorkspaceCacheStoragePort;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RedisWorkspaceCacheStorageAdapter implements WorkspaceCacheStoragePort {

    private static final long SCAN_COUNT = 200;

    private final ObjectProvider<RedisConnectionFactory> connectionFactoryProvider;

    @Value("${app.workspace-purge.cache-delete-enabled:false}")
    private boolean cacheDeleteEnabled;

    @Override
    public WorkspaceCacheInventory inspect(Long workspaceId) {
        validateWorkspaceId(workspaceId);
        try (RedisConnection connection = requiredConnectionFactory().getConnection()) {
            Set<String> scoped = scan(connection, workspacePatterns(workspaceId));
            Set<String> legacy = scan(connection, legacySharedPatterns());
            legacy.removeAll(scoped);
            return new WorkspaceCacheInventory(scoped.size(), legacy.size());
        }
    }

    @Override
    public WorkspaceCachePurgeResult purge(Long workspaceId) {
        validateWorkspaceId(workspaceId);
        if (!cacheDeleteEnabled) {
            throw new IllegalStateException("Workspace cache purge 삭제 기능이 비활성화되어 있습니다.");
        }
        long evicted;
        try (RedisConnection connection = requiredConnectionFactory().getConnection()) {
            Set<String> candidates = scan(connection, workspacePatterns(workspaceId));
            candidates.addAll(scan(connection, legacySharedPatterns()));
            byte[][] keys =
                    candidates.stream()
                            .map(key -> key.getBytes(StandardCharsets.UTF_8))
                            .toArray(byte[][]::new);
            evicted = keys.length == 0 ? 0 : connection.keyCommands().unlink(keys);
        }
        WorkspaceCacheInventory remaining = inspect(workspaceId);
        if (remaining.totalCandidateCount() != 0) {
            throw new IllegalStateException("Workspace cache purge 후 잔여 key가 감지되었습니다.");
        }
        return new WorkspaceCachePurgeResult(evicted);
    }

    static List<String> workspacePatterns(Long workspaceId) {
        String id = String.valueOf(workspaceId);
        return List.of(
                "workspace-visitor:summary::" + id,
                "experience-tree:index::" + id + ":*",
                "experience-tree:detail::" + id + ":*",
                "experience-tree:studies::" + id + ":*",
                "print_template:public::" + id);
    }

    static List<String> legacySharedPatterns() {
        // These derived caches historically had no Workspace segment. Broad eviction is safe and
        // prevents a closed default Workspace from surviving under an ambiguous key.
        return List.of("bff:introduction::*", "bff:learning::*", "print_template:public::*");
    }

    private Set<String> scan(RedisConnection connection, List<String> patterns) {
        Set<String> keys = new LinkedHashSet<>();
        for (String pattern : patterns) {
            ScanOptions options =
                    ScanOptions.scanOptions().match(pattern).count(SCAN_COUNT).build();
            try (Cursor<byte[]> cursor = connection.keyCommands().scan(options)) {
                cursor.forEachRemaining(key -> keys.add(new String(key, StandardCharsets.UTF_8)));
            }
        }
        return keys;
    }

    private RedisConnectionFactory requiredConnectionFactory() {
        RedisConnectionFactory connectionFactory = connectionFactoryProvider.getIfAvailable();
        if (connectionFactory == null) {
            throw new IllegalStateException("Redis connection factory가 준비되지 않았습니다.");
        }
        return connectionFactory;
    }

    private void validateWorkspaceId(Long workspaceId) {
        if (workspaceId == null || workspaceId <= 0) {
            throw new IllegalArgumentException("workspaceId가 올바르지 않습니다.");
        }
    }
}
