package com.selfintro.modules.auth.config;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)
            throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public FilterRegistrationBean<MfaRecoveryReenrollmentFilter>
            mfaRecoveryReenrollmentFilterRegistration(MfaRecoveryReenrollmentFilter filter) {
        FilterRegistrationBean<MfaRecoveryReenrollmentFilter> registration =
                new FilterRegistrationBean<>(filter);
        // SecurityContext가 복원된 뒤 SecurityFilterChain 안에서만 실행해야 한다.
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            @Qualifier("corsConfigurationSource") CorsConfigurationSource corsConfigurationSource,
            LoginContextAnomalyFilter loginContextAnomalyFilter,
            MfaRecoveryReenrollmentFilter mfaRecoveryReenrollmentFilter,
            @Value("${app.runtime-role:api}") String runtimeRole,
            @Value("${app.worker.internal-token:}") String internalWorkerToken,
            @Value("${app.cookie-domain:}") String cookieDomain)
            throws Exception {
        boolean workerRuntime = "worker".equalsIgnoreCase(runtimeRole);
        CookieCsrfTokenRepository csrfTokenRepository =
                CookieCsrfTokenRepository.withHttpOnlyFalse();
        if (!cookieDomain.isBlank()) {
            csrfTokenRepository.setCookieCustomizer(cookie -> cookie.domain(cookieDomain));
        }

        http.csrf(
                        csrf ->
                                csrf.csrfTokenRepository(csrfTokenRepository)
                                        .csrfTokenRequestHandler(
                                                new CsrfTokenRequestAttributeHandler())
                                        .ignoringRequestMatchers(
                                                "/api/visits",
                                                "/api/workspaces/*/visits",
                                                // Ko-fi 서버가 보내는 외부 webhook은 CSRF 토큰을 가질 수 없다
                                                "/api/donations/kofi/webhook",
                                                "/api/billing/webhooks/toss",
                                                // Worker HTTP 포트는 API가 서버 간 호출에만 사용한다.
                                                "/internal/**"))
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(
                        session ->
                                session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                                        .sessionFixation(fixation -> fixation.changeSessionId()))
                .authorizeHttpRequests(
                        auth ->
                                auth
                                        // 에러 디스패치(/error)까지 인가를 적용하면 익명 사용자의 4xx/5xx 응답이
                                        // 전부 401로 덮여버린다 (Spring Security 6는 ERROR 디스패치도 검사함)
                                        .dispatcherTypeMatchers(DispatcherType.ERROR)
                                        .permitAll()
                                        // 같은 SecurityConfig를 공유하므로 Worker 런타임에서만 내부 위임
                                        // 경로를 허용한다. API 런타임에서는 해당 경로를 명시적으로 거부한다.
                                        .requestMatchers("/internal/**")
                                        .access(
                                                (authentication, context) ->
                                                        new AuthorizationDecision(
                                                                workerRuntime
                                                                        && internalTokenMatches(
                                                                                internalWorkerToken,
                                                                                context.getRequest()
                                                                                        .getHeader(
                                                                                                "X-Internal-Worker-Token"))))
                                        .requestMatchers("/api/admin/**")
                                        .hasAnyRole("ADMIN", "PLATFORM_OWNER", "PLATFORM_OPERATOR")
                                        // 수동 vector 동기화는 request의 workspaceId를 직접 처리하는
                                        // 내부 운영 도구다. 일반 Workspace 사용자가 임의 ID로 재색인하지
                                        // 못하도록 Worker 운영 권한과 같은 플랫폼 경계를 적용한다.
                                        .requestMatchers("/api/v1/vector-sync/**")
                                        .hasAnyRole("PLATFORM_OWNER", "PLATFORM_OPERATOR")
                                        .requestMatchers("/api/ops/support-access/**")
                                        .hasAnyRole(
                                                "PLATFORM_OWNER", "PLATFORM_OPERATOR", "SUPPORT")
                                        .requestMatchers("/api/ops/**")
                                        .hasAnyRole("PLATFORM_OWNER", "PLATFORM_OPERATOR")
                                        // 기존 /api/skills는 단일 사용자 시절의 Workspace 표현값까지
                                        // 포함한다. Workspace Skill API 이관 전에는 플랫폼 운영자에게만
                                        // 허용하고 공개 페이지는 BFF의 Workspace overlay를 사용한다.
                                        .requestMatchers("/api/skills/**")
                                        .hasRole("ADMIN")
                                        .requestMatchers("/api/workspaces/*/profile")
                                        .authenticated()
                                        .requestMatchers(
                                                "/api/workspaces/*/skills",
                                                "/api/workspaces/*/skills/**",
                                                "/api/workspaces/*/skill-proposals",
                                                "/api/workspaces/*/skill-proposals/**",
                                                "/api/workspaces/*/competencies",
                                                "/api/workspaces/*/competencies/**",
                                                "/api/workspaces/*/experiences/manage",
                                                "/api/workspaces/*/experiences/manage/**",
                                                "/api/workspaces/*/experience-placements/**",
                                                "/api/workspaces/*/images/presigned-upload",
                                                "/api/workspaces/*/portfolio/case-studies/manage",
                                                "/api/workspaces/*/portfolio/case-studies/manage/**",
                                                "/api/workspaces/*/portfolio-documents/manage",
                                                "/api/workspaces/*/portfolio-documents/manage/**",
                                                "/api/workspaces/*/print-templates/manage",
                                                "/api/workspaces/*/print-templates/manage/**",
                                                "/api/workspaces/*/learning-resources/manage",
                                                "/api/workspaces/*/learning-resources/manage/**",
                                                "/api/workspaces/*/job-applications/manage",
                                                "/api/workspaces/*/job-applications/manage/**",
                                                "/api/workspaces/*/studies/manage",
                                                "/api/workspaces/*/studies/manage/**",
                                                "/api/workspaces/*/experience-tree/manage",
                                                "/api/workspaces/*/experience-tree/manage/**",
                                                "/api/workspaces/*/publication/manage",
                                                "/api/workspaces/*/publication/manage/**",
                                                "/api/workspaces/*/public-page/draft",
                                                "/api/workspaces/*/public-page/draft/**",
                                                "/api/workspaces/*/taxonomy-schemes",
                                                "/api/workspaces/*/taxonomy-schemes/**",
                                                "/api/workspaces/*/slug-resolution",
                                                "/api/workspaces/*/settings/slug",
                                                "/api/workspaces/*/settings/name",
                                                "/api/workspaces/*/settings/type",
                                                "/api/workspaces/*/lifecycle",
                                                "/api/workspaces/*/members/manage",
                                                "/api/workspaces/*/members/manage/**",
                                                "/api/workspaces/*/billing/**",
                                                "/api/workspaces/*/ai-provider/**",
                                                "/api/workspaces/*/ai-provider",
                                                "/api/workspaces/*/members/leave",
                                                "/api/workspaces/*/visits/manage",
                                                "/api/workspaces/*/visits/manage/**")
                                        .authenticated()
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/bff/**",
                                                "/api/public/workspaces/*/resolution",
                                                "/api/workspaces/*/studies/**",
                                                "/api/workspaces/*/study-taxonomy",
                                                "/api/workspaces/*/tags",
                                                "/api/workspaces/*/experiences/*/related",
                                                "/api/workspaces/*/portfolio/case-studies",
                                                "/api/workspaces/*/portfolio/case-studies/**",
                                                "/api/workspaces/*/print-templates",
                                                "/api/workspaces/*/experience-tree",
                                                "/api/workspaces/*/experience-tree/**",
                                                "/api/studies/**",
                                                "/api/study-taxonomy",
                                                "/api/skill-catalog",
                                                "/api/tags",
                                                "/api/experiences/**",
                                                "/api/architecture/**",
                                                "/api/portfolio/case-studies/**",
                                                "/api/print-templates",
                                                "/api/taxonomy-nodes",
                                                "/api/experience-tree/**",
                                                "/api/donations/config")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, "/api/visits")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.POST, "/api/workspaces/*/visits")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.POST, "/api/donations/kofi/webhook")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.POST, "/api/billing/webhooks/toss")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, "/api/auth/login")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.GET, "/api/auth/csrf")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.POST,
                                                "/api/auth/registrations",
                                                "/api/auth/email-verifications",
                                                "/api/auth/password-resets",
                                                "/api/auth/password-resets/confirm",
                                                "/api/account/email-change/confirm")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.POST, "/api/workspaces/onboarding")
                                        .authenticated()
                                        .requestMatchers(
                                                HttpMethod.POST,
                                                "/api/auth/logout",
                                                "/api/auth/reauthenticate",
                                                "/api/auth/sessions/logout-all",
                                                "/api/auth/mfa/**")
                                        .authenticated()
                                        .requestMatchers(
                                                HttpMethod.DELETE, "/api/auth/reauthentication")
                                        .authenticated()
                                        // 계정 자기관리 API는 플랫폼 운영 권한이 아니라 현재 로그인한
                                        // 본인의 AppUserPrincipal로만 동작한다. 아래 전역 ADMIN 쓰기
                                        // 경계보다 먼저 명시해 일반 사용자가 자기 계정을 관리하게 한다.
                                        .requestMatchers(
                                                HttpMethod.POST, "/api/account/email-change")
                                        .authenticated()
                                        .requestMatchers(HttpMethod.PUT, "/api/account/password")
                                        .authenticated()
                                        .requestMatchers(
                                                HttpMethod.PATCH, "/api/account/display-name")
                                        .authenticated()
                                        // Support Access의 승인·거절·철회는 플랫폼 ADMIN 권한이 아니라
                                        // 대상 Workspace OWNER가 수행한다. 경로는 인증 사용자에게 통과시키고
                                        // WorkspaceSupportAccessController의 WorkspaceAccessPolicy가
                                        // 최종 OWNER 권한을 검증한다.
                                        .requestMatchers(
                                                HttpMethod.POST,
                                                "/api/workspaces/*/support-access/**")
                                        .authenticated()
                                        .requestMatchers(HttpMethod.DELETE, "/api/account")
                                        .authenticated()
                                        .requestMatchers(
                                                HttpMethod.POST,
                                                "/api/workspace-membership-invitations/accept",
                                                "/api/workspace-membership-invitations/decline")
                                        .authenticated()
                                        // Workspace별 mutation API 이관 전까지 기존 쓰기 API를 일반
                                        // Membership에 개방하지 않는다. 공개 GET과 위의 명시적 가입 흐름만
                                        // 예외이며, WorkspaceAccessPolicy가 적용된 API부터 개별적으로 앞에
                                        // allowlist 한다.
                                        .requestMatchers(HttpMethod.POST, "/api/**")
                                        .hasRole("ADMIN")
                                        .requestMatchers(HttpMethod.PUT, "/api/**")
                                        .hasRole("ADMIN")
                                        .requestMatchers(HttpMethod.PATCH, "/api/**")
                                        .hasRole("ADMIN")
                                        .requestMatchers(HttpMethod.DELETE, "/api/**")
                                        .hasRole("ADMIN")
                                        .requestMatchers("/actuator/health/**")
                                        .permitAll()
                                        .anyRequest()
                                        .authenticated())
                .exceptionHandling(
                        exceptionHandling ->
                                exceptionHandling.authenticationEntryPoint(
                                        (request, response, authException) ->
                                                response.sendError(
                                                        HttpServletResponse.SC_UNAUTHORIZED)))
                .logout(
                        logout ->
                                logout.logoutUrl("/api/auth/logout")
                                        .invalidateHttpSession(true)
                                        .deleteCookies("JSESSIONID")
                                        .logoutSuccessHandler(
                                                (request, response, authentication) ->
                                                        response.setStatus(
                                                                HttpServletResponse.SC_NO_CONTENT)))
                .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class);

        http.addFilterAfter(loginContextAnomalyFilter, BasicAuthenticationFilter.class);
        http.addFilterAfter(mfaRecoveryReenrollmentFilter, LoginContextAnomalyFilter.class);

        return http.build();
    }

    private boolean internalTokenMatches(String expected, String actual) {
        if (!StringUtils.hasText(expected) || !StringUtils.hasText(actual)) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }
}
