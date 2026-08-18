package com.selfintro.modules.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class MySqlWorkspaceRelationalStorageAdapterTest {

    @Test
    void disabledDeleteFlagStopsBeforeDatabaseAccess() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        MySqlWorkspaceRelationalStorageAdapter adapter =
                new MySqlWorkspaceRelationalStorageAdapter(jdbcTemplate, false);

        assertThatThrownBy(() -> adapter.purge(42L, LocalDateTime.now()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("비활성화");
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void invalidWorkspaceIdIsRejectedBeforeInventoryQuery() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        MySqlWorkspaceRelationalStorageAdapter adapter =
                new MySqlWorkspaceRelationalStorageAdapter(jdbcTemplate, false);

        assertThatThrownBy(() -> adapter.inspect(0L, LocalDateTime.now()))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(jdbcTemplate);
    }
}
