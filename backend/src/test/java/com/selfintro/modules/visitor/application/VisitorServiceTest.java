package com.selfintro.modules.visitor.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.visitor.domain.VisitorDailyVisit;
import com.selfintro.modules.visitor.domain.VisitorDailyVisitRepository;
import com.selfintro.modules.visitor.domain.VisitorHourlyVisit;
import com.selfintro.modules.visitor.domain.VisitorHourlyVisitRepository;
import com.selfintro.modules.visitor.presentation.dto.VisitorHourlyResponse;
import com.selfintro.modules.visitor.presentation.dto.VisitorSummaryResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VisitorServiceTest {
    private static final String VISITOR_HASH = "a".repeat(64);
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Mock
    private VisitorDailyVisitRepository visitorRepository;

    @Mock
    private VisitorHourlyVisitRepository hourlyVisitorRepository;

    private VisitorService visitorService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-07-15T03:00:00Z"), SEOUL);
        visitorService = new VisitorService(visitorRepository, hourlyVisitorRepository, clock);
    }

    @Test
    void createsDailyVisitForNewVisitor() {
        LocalDate today = LocalDate.of(2026, 7, 15);
        when(visitorRepository.findByVisitorHashAndVisitedDate(VISITOR_HASH, today))
                .thenReturn(Optional.empty());
        when(hourlyVisitorRepository.findByVisitorHashAndVisitedDateAndVisitedHour(VISITOR_HASH, today, 12))
                .thenReturn(Optional.empty());
        when(visitorRepository.countByVisitedDate(today)).thenReturn(1L);
        when(visitorRepository.countDistinctVisitors()).thenReturn(1L);
        when(visitorRepository.sumPageViews()).thenReturn(1L);

        VisitorSummaryResponse response = visitorService.recordVisit(VISITOR_HASH, "Mozilla/5.0");

        verify(visitorRepository).save(any(VisitorDailyVisit.class));
        verify(hourlyVisitorRepository).save(any(VisitorHourlyVisit.class));
        verify(visitorRepository).flush();
        assertThat(response).isEqualTo(new VisitorSummaryResponse(1, 1, 1, 0));
    }

    @Test
    void incrementsPageViewsWithoutCreatingAnotherDailyVisitor() {
        LocalDate today = LocalDate.of(2026, 7, 15);
        VisitorDailyVisit existing = VisitorDailyVisit.firstVisit(
                VISITOR_HASH, today, LocalDateTime.of(2026, 7, 15, 9, 0), "Mozilla/5.0", false);
        VisitorHourlyVisit existingHourly = VisitorHourlyVisit.firstVisit(VISITOR_HASH, today, 12);
        when(visitorRepository.findByVisitorHashAndVisitedDate(VISITOR_HASH, today))
                .thenReturn(Optional.of(existing));
        when(hourlyVisitorRepository.findByVisitorHashAndVisitedDateAndVisitedHour(VISITOR_HASH, today, 12))
                .thenReturn(Optional.of(existingHourly));

        visitorService.recordVisit(VISITOR_HASH, "Mozilla/5.0");

        assertThat(existing.getPageViews()).isEqualTo(2);
        assertThat(existingHourly.getPageViews()).isEqualTo(2);
        verify(visitorRepository, never()).save(any(VisitorDailyVisit.class));
        verify(hourlyVisitorRepository, never()).save(any(VisitorHourlyVisit.class));
    }

    @Test
    void rejectsInvalidDailyRange() {
        assertThatThrownBy(() -> visitorService.getDaily(
                LocalDate.of(2026, 7, 15), LocalDate.of(2026, 7, 14)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void fillsDatesWithoutVisitsWithZero() {
        LocalDate from = LocalDate.of(2026, 7, 13);
        LocalDate to = LocalDate.of(2026, 7, 15);
        when(visitorRepository.aggregateDaily(from, to)).thenReturn(List.of());

        assertThat(visitorService.getDaily(from, to))
                .hasSize(3)
                .allSatisfy(day -> {
                    assertThat(day.visitors()).isZero();
                    assertThat(day.pageViews()).isZero();
                });
    }

    @Test
    void fillsHoursWithoutVisitsWithZero() {
        LocalDate today = LocalDate.of(2026, 7, 15);
        when(hourlyVisitorRepository.aggregateHourly(today)).thenReturn(List.of(
                hourlyAggregation(9, 2, 5)));

        List<VisitorHourlyResponse> hourly = visitorService.getHourly(today);

        assertThat(hourly).hasSize(24);
        assertThat(hourly.get(9)).isEqualTo(new VisitorHourlyResponse(9, 2, 5));
        assertThat(hourly.stream().filter(hour -> hour.hour() != 9))
                .allSatisfy(hour -> {
                    assertThat(hour.visitors()).isZero();
                    assertThat(hour.pageViews()).isZero();
                });
    }

    private VisitorHourlyVisitRepository.HourlyAggregation hourlyAggregation(
            int hour, long visitors, long pageViews) {
        return new VisitorHourlyVisitRepository.HourlyAggregation() {
            @Override
            public int getVisitedHour() {
                return hour;
            }

            @Override
            public long getVisitors() {
                return visitors;
            }

            @Override
            public long getPageViews() {
                return pageViews;
            }
        };
    }
}
