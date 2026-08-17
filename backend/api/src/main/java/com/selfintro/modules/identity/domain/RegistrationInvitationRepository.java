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

public interface RegistrationInvitationRepository
        extends JpaRepository<RegistrationInvitation, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RegistrationInvitation> findByCodeHash(byte[] codeHash);

    List<RegistrationInvitation> findAllByOrderByCreatedAtDesc();

    @Query(
            """
            select invitation.id
            from RegistrationInvitation invitation
            where (invitation.status = 'ACTIVE' and invitation.expiresAt < :cutoff)
               or (invitation.status = 'USED' and invitation.usedAt < :cutoff)
               or (invitation.status = 'REVOKED' and invitation.revokedAt < :cutoff)
            order by invitation.id
            """)
    List<Long> findRetentionCandidateIds(@Param("cutoff") LocalDateTime cutoff, Pageable pageable);
}
