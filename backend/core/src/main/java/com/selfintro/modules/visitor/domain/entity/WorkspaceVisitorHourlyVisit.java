package com.selfintro.modules.visitor.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "workspace_visitor_hourly_visit",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_workspace_visitor_hourly_scope",
                        columnNames = {
                            "workspace_id",
                            "visitor_hash",
                            "visited_date",
                            "visited_hour"
                        }))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceVisitorHourlyVisit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private Long workspaceId;

    @Column(name = "visitor_hash", nullable = false, length = 64)
    private String visitorHash;

    @Column(name = "visited_date", nullable = false)
    private LocalDate visitedDate;

    @Column(name = "visited_hour", nullable = false)
    private int visitedHour;

    @Column(name = "page_views", nullable = false)
    private long pageViews;

    private WorkspaceVisitorHourlyVisit(
            Long workspaceId, String visitorHash, LocalDate visitedDate, int visitedHour) {
        this.workspaceId = workspaceId;
        this.visitorHash = visitorHash;
        this.visitedDate = visitedDate;
        this.visitedHour = visitedHour;
        this.pageViews = 1;
    }

    public static WorkspaceVisitorHourlyVisit firstVisit(
            Long workspaceId, String visitorHash, LocalDate visitedDate, int visitedHour) {
        return new WorkspaceVisitorHourlyVisit(workspaceId, visitorHash, visitedDate, visitedHour);
    }

    public void recordPageView() {
        this.pageViews++;
    }
}
