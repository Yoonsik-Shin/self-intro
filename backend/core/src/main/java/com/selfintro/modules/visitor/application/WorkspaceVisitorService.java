package com.selfintro.modules.visitor.application;

import com.selfintro.modules.visitor.domain.entity.WorkspaceVisitorDailyVisit;
import com.selfintro.modules.visitor.domain.entity.WorkspaceVisitorHourlyVisit;
import com.selfintro.modules.visitor.domain.repository.WorkspaceVisitorDailyVisitRepository;
import com.selfintro.modules.visitor.domain.repository.WorkspaceVisitorHourlyVisitRepository;
import com.selfintro.modules.visitor.presentation.dto.VisitorDailyResponse;
import com.selfintro.modules.visitor.presentation.dto.VisitorHourlyResponse;
import com.selfintro.modules.visitor.presentation.dto.VisitorSummaryResponse;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkspaceVisitorService {
    private final WorkspaceVisitorDailyVisitRepository dailyRepository;
    private final WorkspaceVisitorHourlyVisitRepository hourlyRepository;
    private final VisitorService platformVisitorService;

    @Qualifier("visitorClock")
    private final Clock visitorClock;

    @Transactional
    @CacheEvict(value = "workspace-visitor:summary", key = "#workspaceId")
    public VisitorSummaryResponse recordVisit(
            Long workspaceId, String visitorHash, String userAgent) {
        platformVisitorService.recordVisit(visitorHash, userAgent);

        LocalDate visitedDate = LocalDate.now(visitorClock);
        LocalDateTime visitedAt = LocalDateTime.now(visitorClock);
        boolean bot = BotDetector.isLikelyBot(userAgent);
        String truncatedUserAgent = truncate(userAgent);

        dailyRepository
                .findByWorkspaceIdAndVisitorHashAndVisitedDate(
                        workspaceId, visitorHash, visitedDate)
                .ifPresentOrElse(
                        visit -> visit.recordPageView(visitedAt, truncatedUserAgent, bot),
                        () ->
                                dailyRepository.save(
                                        WorkspaceVisitorDailyVisit.firstVisit(
                                                workspaceId,
                                                visitorHash,
                                                visitedDate,
                                                visitedAt,
                                                truncatedUserAgent,
                                                bot)));
        if (!bot) {
            hourlyRepository
                    .findByWorkspaceIdAndVisitorHashAndVisitedDateAndVisitedHour(
                            workspaceId, visitorHash, visitedDate, visitedAt.getHour())
                    .ifPresentOrElse(
                            WorkspaceVisitorHourlyVisit::recordPageView,
                            () ->
                                    hourlyRepository.save(
                                            WorkspaceVisitorHourlyVisit.firstVisit(
                                                    workspaceId,
                                                    visitorHash,
                                                    visitedDate,
                                                    visitedAt.getHour())));
        }
        dailyRepository.flush();
        return getSummaryFor(workspaceId, visitedDate);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "workspace-visitor:summary", key = "#workspaceId")
    public VisitorSummaryResponse getSummary(Long workspaceId) {
        return getSummaryFor(workspaceId, LocalDate.now(visitorClock));
    }

    public VisitorSummaryResponse getSummaryFor(Long workspaceId, LocalDate date) {
        return new VisitorSummaryResponse(
                dailyRepository.countByWorkspaceIdAndVisitedDateAndBotFalse(workspaceId, date),
                dailyRepository.countDistinctVisitors(workspaceId),
                dailyRepository.sumPageViews(workspaceId),
                dailyRepository.countByWorkspaceIdAndVisitedDateAndBotTrue(workspaceId, date));
    }

    @Transactional(readOnly = true)
    public List<VisitorDailyResponse> getDaily(Long workspaceId, LocalDate from, LocalDate to) {
        validateRange(from, to);
        Map<LocalDate, WorkspaceVisitorDailyVisitRepository.DailyAggregation> aggregations =
                dailyRepository.aggregateDaily(workspaceId, from, to).stream()
                        .collect(
                                Collectors.toMap(
                                        WorkspaceVisitorDailyVisitRepository.DailyAggregation
                                                ::getVisitedDate,
                                        Function.identity()));
        return from.datesUntil(to.plusDays(1))
                .map(
                        date -> {
                            WorkspaceVisitorDailyVisitRepository.DailyAggregation value =
                                    aggregations.get(date);
                            return value == null
                                    ? new VisitorDailyResponse(date, 0, 0)
                                    : new VisitorDailyResponse(
                                            date, value.getVisitors(), value.getPageViews());
                        })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<VisitorHourlyResponse> getHourly(Long workspaceId, LocalDate date) {
        Map<Integer, WorkspaceVisitorHourlyVisitRepository.HourlyAggregation> aggregations =
                hourlyRepository.aggregateHourly(workspaceId, date).stream()
                        .collect(
                                Collectors.toMap(
                                        WorkspaceVisitorHourlyVisitRepository.HourlyAggregation
                                                ::getVisitedHour,
                                        Function.identity()));
        return IntStream.rangeClosed(0, 23)
                .mapToObj(
                        hour -> {
                            WorkspaceVisitorHourlyVisitRepository.HourlyAggregation value =
                                    aggregations.get(hour);
                            return value == null
                                    ? new VisitorHourlyResponse(hour, 0, 0)
                                    : new VisitorHourlyResponse(
                                            hour, value.getVisitors(), value.getPageViews());
                        })
                .toList();
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("조회 시작일은 종료일보다 늦을 수 없습니다.");
        }
        if (from.plusDays(366).isBefore(to)) {
            throw new IllegalArgumentException("방문자 통계는 최대 366일까지 조회할 수 있습니다.");
        }
    }

    private String truncate(String value) {
        if (value == null) return null;
        return value.length() > 255 ? value.substring(0, 255) : value;
    }
}
