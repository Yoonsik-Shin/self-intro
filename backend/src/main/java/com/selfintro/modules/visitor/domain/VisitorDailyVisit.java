package com.selfintro.modules.visitor.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "visitor_daily_visit", uniqueConstraints = @UniqueConstraint(
        name = "uk_visitor_daily_visit_hash_date", columnNames = {"visitor_hash", "visited_date"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VisitorDailyVisit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "visitor_hash", nullable = false, length = 64)
    private String visitorHash;

    @Column(name = "visited_date", nullable = false)
    private LocalDate visitedDate;

    @Column(name = "first_visited_at", nullable = false, updatable = false)
    private LocalDateTime firstVisitedAt;

    @Column(name = "last_visited_at", nullable = false)
    private LocalDateTime lastVisitedAt;

    @Column(name = "page_views", nullable = false)
    private long pageViews;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "is_bot", nullable = false)
    private boolean bot;

    private VisitorDailyVisit(
            String visitorHash, LocalDate visitedDate, LocalDateTime visitedAt, String userAgent, boolean bot) {
        this.visitorHash = visitorHash;
        this.visitedDate = visitedDate;
        this.firstVisitedAt = visitedAt;
        this.lastVisitedAt = visitedAt;
        this.pageViews = 1;
        this.userAgent = userAgent;
        this.bot = bot;
    }

    public static VisitorDailyVisit firstVisit(
            String visitorHash, LocalDate visitedDate, LocalDateTime visitedAt, String userAgent, boolean bot) {
        return new VisitorDailyVisit(visitorHash, visitedDate, visitedAt, userAgent, bot);
    }

    public void recordPageView(LocalDateTime visitedAt, String userAgent, boolean bot) {
        this.lastVisitedAt = visitedAt;
        this.pageViews++;
        this.userAgent = userAgent;
        this.bot = bot;
    }
}
