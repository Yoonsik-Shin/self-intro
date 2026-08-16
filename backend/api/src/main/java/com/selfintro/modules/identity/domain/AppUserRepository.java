package com.selfintro.modules.identity.domain;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    long countByStatus(UserStatus status);

    Optional<AppUser> findByLoginId(String loginId);

    Optional<AppUser> findByEmailCanonical(String emailCanonical);

    boolean existsByEmailCanonical(String emailCanonical);

    boolean existsByEmailCanonicalAndIdNot(String emailCanonical, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from AppUser user where user.id = :userId")
    Optional<AppUser> findByIdForUpdate(@Param("userId") Long userId);
}
