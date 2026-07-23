package com.selfintro.auth.config;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public UserDetailsService userDetailsService(
            @Value("${app.admin.username}") String username,
            @Value("${app.admin.password:}") String rawPassword,
            @Value("${app.admin.password-hash:}") String passwordHash,
            PasswordEncoder passwordEncoder) {
        String encodedPassword;
        if (!passwordHash.isBlank()) {
            encodedPassword = passwordHash;
        } else if (!rawPassword.isBlank()) {
            encodedPassword = passwordEncoder.encode(rawPassword);
        } else {
            throw new IllegalStateException(
                    "ADMIN_PASSWORD 또는 ADMIN_PASSWORD_HASH 환경변수 중 하나는 반드시 설정해야 합니다.");
        }

        UserDetails admin =
                User.withUsername(username).password(encodedPassword).roles("ADMIN").build();
        return new InMemoryUserDetailsManager(admin);
    }

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
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            CorsConfigurationSource corsConfigurationSource,
            @Value("${app.cookie-domain:}") String cookieDomain)
            throws Exception {
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
                                                new AntPathRequestMatcher("/api/visits", "POST"),
                                                // 페이앱/Ko-fi 서버가 보내는 외부 콜백/웹훅은 CSRF 토큰을 가질 수 없다
                                                new AntPathRequestMatcher(
                                                        "/api/donations/payapp/callback", "POST"),
                                                new AntPathRequestMatcher(
                                                        "/api/donations/kofi/webhook", "POST")))
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .authorizeHttpRequests(
                        auth ->
                                auth
                                        // 에러 디스패치(/error)까지 인가를 적용하면 익명 사용자의 4xx/5xx 응답이
                                        // 전부 401로 덮여버린다 (Spring Security 6는 ERROR 디스패치도 검사함)
                                        .dispatcherTypeMatchers(DispatcherType.ERROR)
                                        .permitAll()
                                        .requestMatchers("/api/admin/**")
                                        .hasRole("ADMIN")
                                        .requestMatchers(HttpMethod.GET, "/api/**")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, "/api/visits")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, "/api/donations")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.POST, "/api/donations/payapp/callback")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.POST, "/api/donations/kofi/webhook")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, "/api/auth/login")
                                        .permitAll()
                                        .requestMatchers("/actuator/health/**")
                                        .permitAll()
                                        .anyRequest()
                                        .hasRole("ADMIN"))
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

        return http.build();
    }
}
