package com.selfintro.auth.controller;

import com.selfintro.auth.dto.LoginRequest;
import com.selfintro.auth.dto.MeResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
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

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;

    @PostMapping("/login")
    public ResponseEntity<Void> login(@Valid @RequestBody LoginRequest request,
                                       HttpServletRequest httpRequest,
                                       HttpServletResponse httpResponse) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public MeResponse me(Authentication authentication) {
        return new MeResponse(authentication.getName());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Void> handleAuthenticationException() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
