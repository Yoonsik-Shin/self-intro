package com.selfintro.modules.donation.domain.repository;

import com.selfintro.modules.donation.domain.entity.*;
import com.selfintro.modules.donation.domain.enums.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DonationSettingRepository extends JpaRepository<DonationSetting, Long> {}
