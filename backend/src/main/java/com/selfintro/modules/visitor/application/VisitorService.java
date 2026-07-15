package com.selfintro.modules.visitor.application;

import com.selfintro.modules.visitor.domain.VisitorDailyVisit;
import com.selfintro.modules.visitor.domain.VisitorDailyVisitRepository;
import com.selfintro.modules.visitor.presentation.dto.VisitorDailyResponse;
import com.selfintro.modules.visitor.presentation.dto.VisitorSummaryResponse;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VisitorService {
    private final VisitorDailyVisitRepository visitorRepository;
    private final Clock visitorClock;

    @Transactional
    public synchronized VisitorSummaryResponse recordVisit(String visitorHash) {
        LocalDate visitedDate = LocalDate.now(visitorClock);
        LocalDateTime visitedAt = LocalDateTime.now(visitorClock);

        visitorRepository.findByVisitorHashAndVisitedDate(visitorHash, visitedDate)
                .ifPresentOrElse(
                        visit -> visit.recordPageView(visitedAt),
                        () -> visitorRepository.save(VisitorDailyVisit.firstVisit(
                                visitorHash, visitedDate, visitedAt)));
        visitorRepository.flush();
        return getSummaryFor(visitedDate);
    }

    @Transactional(readOnly = true)
    public VisitorSummaryResponse getSummary() {
        return getSummaryFor(LocalDate.now(visitorClock));
    }

    @Transactional(readOnly = true)
    public List<VisitorDailyResponse> getDaily(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("조회 시작일은 종료일보다 늦을 수 없습니다.");
        }
        if (from.plusDays(366).isBefore(to)) {
            throw new IllegalArgumentException("방문자 통계는 최대 366일까지 조회할 수 있습니다.");
        }
        Map<LocalDate, VisitorDailyVisitRepository.DailyAggregation> aggregations =
                visitorRepository.aggregateDaily(from, to).stream()
                        .collect(Collectors.toMap(
                                VisitorDailyVisitRepository.DailyAggregation::getVisitedDate,
                                Function.identity()));

        return from.datesUntil(to.plusDays(1))
                .map(date -> {
                    VisitorDailyVisitRepository.DailyAggregation value = aggregations.get(date);
                    return value == null
                            ? new VisitorDailyResponse(date, 0, 0)
                            : new VisitorDailyResponse(date, value.getVisitors(), value.getPageViews());
                })
                .toList();
    }

    private VisitorSummaryResponse getSummaryFor(LocalDate date) {
        return new VisitorSummaryResponse(
                visitorRepository.countByVisitedDate(date),
                visitorRepository.countDistinctVisitors(),
                visitorRepository.sumPageViews());
    }
}
