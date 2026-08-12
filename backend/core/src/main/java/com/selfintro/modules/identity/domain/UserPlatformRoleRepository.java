package com.selfintro.modules.identity.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPlatformRoleRepository extends JpaRepository<UserPlatformRole, Long> {
    List<UserPlatformRole> findAllByUserId(Long userId);
}
