package com.selfintro.modules.visitor.domain.repository;

import com.selfintro.modules.visitor.domain.entity.WorkspaceVisitorDailyVisit;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspaceVisitorDailyVisitRepository
        extends JpaRepository<WorkspaceVisitorDailyVisit, Long> {
    Optional<WorkspaceVisitorDailyVisit> findByWorkspaceIdAndVisitorHashAndVisitedDate(
            Long workspaceId, String visitorHash, LocalDate visitedDate);

    long countByWorkspaceIdAndVisitedDateAndBotFalse(Long workspaceId, LocalDate visitedDate);

    long countByWorkspaceIdAndVisitedDateAndBotTrue(Long workspaceId, LocalDate visitedDate);

    @Query(
            """
            select count(distinct visit.visitorHash)
            from WorkspaceVisitorDailyVisit visit
            where visit.workspaceId = :workspaceId and visit.bot = false
            """)
    long countDistinctVisitors(@Param("workspaceId") Long workspaceId);

    @Query(
            """
            select coalesce(sum(visit.pageViews), 0)
            from WorkspaceVisitorDailyVisit visit
            where visit.workspaceId = :workspaceId and visit.bot = false
            """)
    long sumPageViews(@Param("workspaceId") Long workspaceId);

    @Query(
            """
            select visit.visitedDate as visitedDate,
                   count(visit) as visitors,
                   sum(visit.pageViews) as pageViews
            from WorkspaceVisitorDailyVisit visit
            where visit.workspaceId = :workspaceId
              and visit.visitedDate between :from and :to
              and visit.bot = false
            group by visit.visitedDate
            order by visit.visitedDate asc
            """)
    List<DailyAggregation> aggregateDaily(
            @Param("workspaceId") Long workspaceId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    interface DailyAggregation {
        LocalDate getVisitedDate();

        long getVisitors();

        long getPageViews();
    }
}
