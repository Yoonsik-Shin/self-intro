package com.selfintro.modules.profile.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;

public interface ProfileRepository extends JpaRepository<Profile, Long> {

    @Query("SELECT p FROM Profile p ORDER BY p.id ASC LIMIT 1")
    Optional<Profile> findFirstProfile();
}
