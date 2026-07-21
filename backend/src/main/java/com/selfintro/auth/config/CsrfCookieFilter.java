package com.selfintro.auth.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * CookieCsrfTokenRepository의 토큰은 기본적으로 지연 로딩되어, 무언가 실제로 값을 읽어가기 전까지는 XSRF-TOKEN 쿠키가 응답에 실리지 않는다. 뷰
 * 템플릿이 없는 REST API라 그 "읽어가는 주체"가 없으므로, 매 요청마다 강제로 토큰을 로드해 쿠키가 발급되게 한다.
 */
public class CsrfCookieFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken != null) {
            csrfToken.getToken();
        }
        filterChain.doFilter(request, response);
    }
}
