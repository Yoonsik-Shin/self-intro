package com.selfintro.modules.donation.domain.repository;

import com.selfintro.modules.donation.domain.entity.*;
import com.selfintro.modules.donation.domain.enums.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DonationEventRepository extends JpaRepository<DonationEvent, Long> {
    List<DonationEvent> findByDonationIdOrderByIdAsc(Long donationId);
}
