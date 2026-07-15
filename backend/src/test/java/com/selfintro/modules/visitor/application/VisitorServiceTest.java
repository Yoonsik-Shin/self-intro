package com.selfintro.modules.visitor.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.visitor.domain.VisitorDailyVisit;
import com.selfintro.modules.visitor.domain.VisitorDailyVisitRepository;
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

    private VisitorService visitorService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-07-15T03:00:00Z"), SEOUL);
        visitorService = new VisitorService(visitorRepository, clock);
    }

    @Test
    void createsDailyVisitForNewVisitor() {
        LocalDate today = LocalDate.of(2026, 7, 15);
        when(visitorRepository.findByVisitorHashAndVisitedDate(VISITOR_HASH, today))
                .thenReturn(Optional.empty());
        when(visitorRepository.countByVisitedDate(today)).thenReturn(1L);
        when(visitorRepository.countDistinctVisitors()).thenReturn(1L);
        when(visitorRepository.sumPageViews()).thenReturn(1L);

        VisitorSummaryResponse response = visitorService.recordVisit(VISITOR_HASH);

        verify(visitorRepository).save(any(VisitorDailyVisit.class));
        verify(visitorRepository).flush();
        assertThat(response).isEqualTo(new VisitorSummaryResponse(1, 1, 1));
    }

    @Test
    void incrementsPageViewsWithoutCreatingAnotherDailyVisitor() {
        LocalDate today = LocalDate.of(2026, 7, 15);
        VisitorDailyVisit existing = VisitorDailyVisit.firstVisit(
                VISITOR_HASH, today, LocalDateTime.of(2026, 7, 15, 9, 0));
        when(visitorRepository.findByVisitorHashAndVisitedDate(VISITOR_HASH, today))
                .thenReturn(Optional.of(existing));

        visitorService.recordVisit(VISITOR_HASH);

        assertThat(existing.getPageViews()).isEqualTo(2);
        verify(visitorRepository, never()).save(any(VisitorDailyVisit.class));
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
}
