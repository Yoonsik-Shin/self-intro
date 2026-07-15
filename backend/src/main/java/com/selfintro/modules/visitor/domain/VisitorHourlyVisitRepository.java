package com.selfintro.modules.visitor.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VisitorHourlyVisitRepository extends JpaRepository<VisitorHourlyVisit, Long> {
    Optional<VisitorHourlyVisit> findByVisitorHashAndVisitedDateAndVisitedHour(
            String visitorHash, LocalDate visitedDate, int visitedHour);

    @Query("""
            select visit.visitedHour as visitedHour,
                   count(visit) as visitors,
                   sum(visit.pageViews) as pageViews
            from VisitorHourlyVisit visit
            where visit.visitedDate = :date
            group by visit.visitedHour
            order by visit.visitedHour asc
            """)
    List<HourlyAggregation> aggregateHourly(@Param("date") LocalDate date);

    interface HourlyAggregation {
        int getVisitedHour();
        long getVisitors();
        long getPageViews();
    }
}
