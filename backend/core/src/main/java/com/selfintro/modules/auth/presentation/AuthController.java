package com.selfintro.modules.auth.presentation;

import com.selfintro.modules.auth.application.AuthService;
import com.selfintro.modules.auth.presentation.dto.LoginRequest;
import com.selfintro.modules.auth.presentation.dto.MeResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<Void> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        authService.login(request.username(), request.password(), httpRequest, httpResponse);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public MeResponse me(Authentication authentication) {
        // 익명 사용자는 서블릿 스펙상 principal이 null로 전달된다 (인증된 사용자만 getUserPrincipal()에 값이 참).
        if (authentication == null) {
            throw new InsufficientAuthenticationException("로그인이 필요합니다.");
        }
        return new MeResponse(authentication.getName());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Void> handleAuthenticationException() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
