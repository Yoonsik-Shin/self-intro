package com.selfintro.global.messaging;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
class TransactionalOutboxStore {
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public List<OutboxMessage> claim(int batchSize, LocalDateTime staleBefore) {
        List<OutboxMessage> messages =
                jdbcTemplate.query(
                        """
                SELECT id, exchange_name, routing_key, event_type, payload, attempts
                  FROM message_outbox
                 WHERE (status IN ('PENDING', 'FAILED') AND next_attempt_at <= CURRENT_TIMESTAMP)
                    OR (status = 'PROCESSING' AND locked_at < ?)
                 ORDER BY created_at
                 LIMIT ? FOR UPDATE SKIP LOCKED
                """,
                        TransactionalOutboxStore::map,
                        staleBefore,
                        batchSize);
        messages.forEach(
                message ->
                        jdbcTemplate.update(
                                "UPDATE message_outbox SET status='PROCESSING', locked_at=CURRENT_TIMESTAMP WHERE id=?",
                                message.id()));
        return messages;
    }

    public void markPublished(String id) {
        jdbcTemplate.update(
                "UPDATE message_outbox SET status='PUBLISHED', published_at=CURRENT_TIMESTAMP, locked_at=NULL WHERE id=?",
                id);
    }

    public void markFailed(String id, int attempts, LocalDateTime nextAttemptAt, String error) {
        jdbcTemplate.update(
                "UPDATE message_outbox SET status='FAILED', attempts=?, next_attempt_at=?, last_error=?, locked_at=NULL WHERE id=?",
                attempts,
                nextAttemptAt,
                error == null ? null : error.substring(0, Math.min(error.length(), 1000)),
                id);
    }

    public void markDead(String id, int attempts, String error) {
        jdbcTemplate.update(
                "UPDATE message_outbox SET status='DEAD', attempts=?, dead_lettered_at=CURRENT_TIMESTAMP, "
                        + "last_error=?, locked_at=NULL WHERE id=?",
                attempts,
                error == null ? null : error.substring(0, Math.min(error.length(), 1000)),
                id);
    }

    public int deletePublishedBefore(LocalDateTime cutoff) {
        return jdbcTemplate.update(
                "DELETE FROM message_outbox WHERE status='PUBLISHED' AND published_at < ?", cutoff);
    }

    public int deleteDeadBefore(LocalDateTime cutoff) {
        return jdbcTemplate.update(
                "DELETE FROM message_outbox WHERE status='DEAD' AND dead_lettered_at < ?", cutoff);
    }

    private static OutboxMessage map(ResultSet rs, int rowNum) throws SQLException {
        return new OutboxMessage(
                rs.getString("id"),
                rs.getString("exchange_name"),
                rs.getString("routing_key"),
                rs.getString("event_type"),
                rs.getString("payload"),
                rs.getInt("attempts"));
    }

    record OutboxMessage(
            String id,
            String exchange,
            String routingKey,
            String eventType,
            String payload,
            int attempts) {}
}
