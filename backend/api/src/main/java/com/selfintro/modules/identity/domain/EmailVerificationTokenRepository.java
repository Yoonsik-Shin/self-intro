package com.selfintro.modules.identity.domain;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationTokenRepository
        extends JpaRepository<EmailVerificationToken, Long> {

    void deleteAllByUserId(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<EmailVerificationToken> findByTokenHash(byte[] tokenHash);

    @Query(
            """
            select token.id
            from EmailVerificationToken token
            where (token.usedAt is not null and token.usedAt < :cutoff)
               or (token.usedAt is null and token.expiresAt < :cutoff)
            order by token.id
            """)
    List<Long> findRetentionCandidateIds(@Param("cutoff") LocalDateTime cutoff, Pageable pageable);
}
