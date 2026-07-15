package com.selfintro.modules.visitor.domain;

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
@Table(name = "visitor_hourly_visit", uniqueConstraints = @UniqueConstraint(
        name = "uk_visitor_hourly_visit_hash_date_hour",
        columnNames = {"visitor_hash", "visited_date", "visited_hour"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VisitorHourlyVisit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "visitor_hash", nullable = false, length = 64)
    private String visitorHash;

    @Column(name = "visited_date", nullable = false)
    private LocalDate visitedDate;

    @Column(name = "visited_hour", nullable = false)
    private int visitedHour;

    @Column(name = "page_views", nullable = false)
    private long pageViews;

    private VisitorHourlyVisit(String visitorHash, LocalDate visitedDate, int visitedHour) {
        this.visitorHash = visitorHash;
        this.visitedDate = visitedDate;
        this.visitedHour = visitedHour;
        this.pageViews = 1;
    }

    public static VisitorHourlyVisit firstVisit(String visitorHash, LocalDate visitedDate, int visitedHour) {
        return new VisitorHourlyVisit(visitorHash, visitedDate, visitedHour);
    }

    public void recordPageView() {
        this.pageViews++;
    }
}
