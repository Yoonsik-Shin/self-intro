package com.selfintro.modules.visitor.presentation;

import com.selfintro.modules.visitor.application.VisitorService;
import com.selfintro.modules.visitor.presentation.dto.VisitorDailyResponse;
import com.selfintro.modules.visitor.presentation.dto.VisitorHourlyResponse;
import com.selfintro.modules.visitor.presentation.dto.VisitorSummaryResponse;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/visits")
@RequiredArgsConstructor
public class AdminVisitorController {
    private final VisitorService visitorService;
    private final Clock visitorClock;

    @GetMapping("/summary")
    public ResponseEntity<VisitorSummaryResponse> summary() {
        return ResponseEntity.ok(visitorService.getSummary());
    }

    @GetMapping("/daily")
    public ResponseEntity<List<VisitorDailyResponse>> daily(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to) {
        LocalDate resolvedTo = to != null ? to : LocalDate.now(visitorClock);
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(13);
        return ResponseEntity.ok(visitorService.getDaily(resolvedFrom, resolvedTo));
    }

    @GetMapping("/hourly")
    public ResponseEntity<List<VisitorHourlyResponse>> hourly(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate date) {
        LocalDate resolvedDate = date != null ? date : LocalDate.now(visitorClock);
        return ResponseEntity.ok(visitorService.getHourly(resolvedDate));
    }
}
