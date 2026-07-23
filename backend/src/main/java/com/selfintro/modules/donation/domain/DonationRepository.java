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

    /** 통화가 서로 다른 후원(예: 페이앱=KRW, Ko-fi=USD)을 하나의 합계로 섞지 않기 위해 통화별로 나눠 집계한다. */
    @Query(
            "select d.currency as currency, coalesce(sum(d.amount), 0) as total, count(d) as count "
                    + "from Donation d where d.status = :status group by d.currency")
    List<CurrencyTotalProjection> sumAndCountByStatusGroupedByCurrency(
            @Param("status") DonationStatus status);

    interface CurrencyTotalProjection {
        String getCurrency();

        long getTotal();

        long getCount();
    }

    /** 상태 전이는 반드시 행 잠금 하에 수행한다 (중복 콜백·환불 동시 요청 직렬화). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Donation> findWithLockByMulNo(String mulNo);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Donation> findWithLockById(Long id);
}
