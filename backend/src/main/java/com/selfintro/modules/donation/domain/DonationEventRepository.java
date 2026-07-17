package com.selfintro.modules.donation.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DonationEventRepository extends JpaRepository<DonationEvent, Long> {
    List<DonationEvent> findByDonationIdOrderByIdAsc(Long donationId);
}
