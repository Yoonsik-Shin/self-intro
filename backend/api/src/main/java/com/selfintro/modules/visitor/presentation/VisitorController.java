package com.selfintro.modules.visitor.presentation;

import com.selfintro.modules.visitor.application.VisitorService;
import com.selfintro.modules.visitor.presentation.dto.VisitorSummaryResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/visits")
@RequiredArgsConstructor
public class VisitorController {
    private final VisitorService visitorService;
    private final VisitorRequestIdentity visitorRequestIdentity;

    @PostMapping
    public ResponseEntity<VisitorSummaryResponse> recordVisit(
            @CookieValue(name = VisitorRequestIdentity.VISITOR_COOKIE, required = false)
                    String visitorId,
            HttpServletRequest request,
            Authentication authentication,
            HttpServletResponse response) {
        if (visitorRequestIdentity.shouldSkip(authentication, request)) {
            return ResponseEntity.ok(visitorService.getSummary());
        }
        return ResponseEntity.ok(
                visitorService.recordVisit(
                        visitorRequestIdentity.resolveHash(visitorId, response),
                        request.getHeader("User-Agent")));
    }
}
