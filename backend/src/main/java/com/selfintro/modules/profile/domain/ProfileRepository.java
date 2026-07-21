package com.selfintro.modules.profile.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProfileRepository extends JpaRepository<Profile, Long> {

    @Query("SELECT p FROM Profile p ORDER BY p.id ASC LIMIT 1")
    Optional<Profile> findFirstProfile();
}
