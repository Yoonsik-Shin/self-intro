package com.selfintro.modules.visitor.domain.repository;

import com.selfintro.modules.visitor.domain.entity.WorkspaceVisitorHourlyVisit;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspaceVisitorHourlyVisitRepository
        extends JpaRepository<WorkspaceVisitorHourlyVisit, Long> {
    Optional<WorkspaceVisitorHourlyVisit>
            findByWorkspaceIdAndVisitorHashAndVisitedDateAndVisitedHour(
                    Long workspaceId, String visitorHash, LocalDate visitedDate, int visitedHour);

    @Query(
            """
            select visit.visitedHour as visitedHour,
                   count(visit) as visitors,
                   sum(visit.pageViews) as pageViews
            from WorkspaceVisitorHourlyVisit visit
            where visit.workspaceId = :workspaceId and visit.visitedDate = :date
            group by visit.visitedHour
            order by visit.visitedHour asc
            """)
    List<HourlyAggregation> aggregateHourly(
            @Param("workspaceId") Long workspaceId, @Param("date") LocalDate date);

    interface HourlyAggregation {
        int getVisitedHour();

        long getVisitors();

        long getPageViews();
    }
}
