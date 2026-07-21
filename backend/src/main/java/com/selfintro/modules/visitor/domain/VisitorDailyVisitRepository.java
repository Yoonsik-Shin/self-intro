package com.selfintro.modules.visitor.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VisitorDailyVisitRepository extends JpaRepository<VisitorDailyVisit, Long> {
    Optional<VisitorDailyVisit> findByVisitorHashAndVisitedDate(
            String visitorHash, LocalDate visitedDate);

    long countByVisitedDate(LocalDate visitedDate);

    long countByVisitedDateAndBotTrue(LocalDate visitedDate);

    @Query("select count(distinct visit.visitorHash) from VisitorDailyVisit visit")
    long countDistinctVisitors();

    @Query("select coalesce(sum(visit.pageViews), 0) from VisitorDailyVisit visit")
    long sumPageViews();

    @Query(
            """
            select visit.visitedDate as visitedDate,
                   count(visit) as visitors,
                   sum(visit.pageViews) as pageViews
            from VisitorDailyVisit visit
            where visit.visitedDate between :from and :to
            group by visit.visitedDate
            order by visit.visitedDate asc
            """)
    List<DailyAggregation> aggregateDaily(@Param("from") LocalDate from, @Param("to") LocalDate to);

    interface DailyAggregation {
        LocalDate getVisitedDate();

        long getVisitors();

        long getPageViews();
    }
}
