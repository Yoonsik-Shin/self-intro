package com.selfintro.modules.donation.domain;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DonationRepository extends JpaRepository<Donation, Long> {
    Optional<Donation> findByClientToken(String clientToken);

    List<Donation> findTop200ByOrderByIdDesc();

    long countByStatus(DonationStatus status);

    @Query("select coalesce(sum(d.amount), 0) from Donation d where d.status = :status")
    long sumAmountByStatus(@Param("status") DonationStatus status);

    /** 상태 전이는 반드시 행 잠금 하에 수행한다 (중복 콜백·환불 동시 요청 직렬화). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Donation> findWithLockByMulNo(String mulNo);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Donation> findWithLockById(Long id);
}
