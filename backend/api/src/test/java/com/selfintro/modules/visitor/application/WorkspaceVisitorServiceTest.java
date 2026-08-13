package com.selfintro.modules.visitor.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.visitor.domain.entity.WorkspaceVisitorDailyVisit;
import com.selfintro.modules.visitor.domain.entity.WorkspaceVisitorHourlyVisit;
import com.selfintro.modules.visitor.domain.repository.WorkspaceVisitorDailyVisitRepository;
import com.selfintro.modules.visitor.domain.repository.WorkspaceVisitorHourlyVisitRepository;
import com.selfintro.modules.visitor.presentation.dto.VisitorSummaryResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WorkspaceVisitorServiceTest {
    private static final Long WORKSPACE_ID = 41L;
    private static final Long OTHER_WORKSPACE_ID = 42L;
    private static final String VISITOR_HASH = "b".repeat(64);
    private static final LocalDate TODAY = LocalDate.of(2026, 8, 11);

    @Mock private WorkspaceVisitorDailyVisitRepository dailyRepository;
    @Mock private WorkspaceVisitorHourlyVisitRepository hourlyRepository;
    @Mock private VisitorService platformVisitorService;

    private WorkspaceVisitorService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-08-11T03:00:00Z"), ZoneId.of("Asia/Seoul"));
        service =
                new WorkspaceVisitorService(
                        dailyRepository, hourlyRepository, platformVisitorService, clock);
    }

    @Test
    void recordsPlatformAggregateAndOnlyTheRequestedWorkspace() {
        when(dailyRepository.findByWorkspaceIdAndVisitorHashAndVisitedDate(
                        WORKSPACE_ID, VISITOR_HASH, TODAY))
                .thenReturn(Optional.empty());
        when(hourlyRepository.findByWorkspaceIdAndVisitorHashAndVisitedDateAndVisitedHour(
                        WORKSPACE_ID, VISITOR_HASH, TODAY, 12))
                .thenReturn(Optional.empty());
        when(dailyRepository.countByWorkspaceIdAndVisitedDateAndBotFalse(WORKSPACE_ID, TODAY))
                .thenReturn(1L);
        when(dailyRepository.countDistinctVisitors(WORKSPACE_ID)).thenReturn(1L);
        when(dailyRepository.sumPageViews(WORKSPACE_ID)).thenReturn(1L);

        VisitorSummaryResponse response =
                service.recordVisit(WORKSPACE_ID, VISITOR_HASH, "Mozilla/5.0");

        verify(platformVisitorService).recordVisit(VISITOR_HASH, "Mozilla/5.0");
        verify(dailyRepository).save(any(WorkspaceVisitorDailyVisit.class));
        verify(hourlyRepository).save(any(WorkspaceVisitorHourlyVisit.class));
        verify(dailyRepository, never()).countDistinctVisitors(OTHER_WORKSPACE_ID);
        assertThat(response).isEqualTo(new VisitorSummaryResponse(1, 1, 1, 0));
    }

    @Test
    void summaryQueriesAreAlwaysScopedByWorkspace() {
        when(dailyRepository.countByWorkspaceIdAndVisitedDateAndBotFalse(WORKSPACE_ID, TODAY))
                .thenReturn(2L);
        when(dailyRepository.countDistinctVisitors(WORKSPACE_ID)).thenReturn(7L);
        when(dailyRepository.sumPageViews(WORKSPACE_ID)).thenReturn(19L);
        when(dailyRepository.countByWorkspaceIdAndVisitedDateAndBotTrue(WORKSPACE_ID, TODAY))
                .thenReturn(1L);

        assertThat(service.getSummaryFor(WORKSPACE_ID, TODAY))
                .isEqualTo(new VisitorSummaryResponse(2, 7, 19, 1));
        verify(dailyRepository, never()).countDistinctVisitors(OTHER_WORKSPACE_ID);
    }

    @Test
    void botDoesNotCreateHourlyWorkspaceVisit() {
        when(dailyRepository.findByWorkspaceIdAndVisitorHashAndVisitedDate(
                        WORKSPACE_ID, VISITOR_HASH, TODAY))
                .thenReturn(Optional.empty());

        service.recordVisit(WORKSPACE_ID, VISITOR_HASH, "Googlebot");

        verify(platformVisitorService).recordVisit(VISITOR_HASH, "Googlebot");
        verify(hourlyRepository, never())
                .findByWorkspaceIdAndVisitorHashAndVisitedDateAndVisitedHour(
                        any(), any(), any(), any(Integer.class));
        verify(hourlyRepository, never()).save(any());
    }
}
