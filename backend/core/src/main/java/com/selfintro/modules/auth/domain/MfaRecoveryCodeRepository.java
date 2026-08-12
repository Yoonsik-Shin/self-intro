package com.selfintro.modules.auth.domain;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface MfaRecoveryCodeRepository extends JpaRepository<MfaRecoveryCode, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<MfaRecoveryCode> findByUserIdAndCodeHashAndConsumedAtIsNull(
            Long userId, byte[] codeHash);

    void deleteAllByUserId(Long userId);
}
