package com.selfintro.global.ai;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class AiRequestWorkspaceContextFilter extends OncePerRequestFilter {

    private static final Pattern WORKSPACE_PATH =
            Pattern.compile("^/internal/workspaces/(\\d+)(?:/|$)");

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Matcher matcher = WORKSPACE_PATH.matcher(request.getRequestURI());
        try {
            if (matcher.find()) {
                AiRequestWorkspaceContext.set(Long.parseLong(matcher.group(1)));
            }
            filterChain.doFilter(request, response);
        } finally {
            AiRequestWorkspaceContext.clear();
            ProviderUsageContext.clear();
            EvidencePacketContext.clear();
        }
    }
}
