package com.selfintro.modules.identity.infrastructure;

import com.selfintro.modules.identity.application.EmailVerificationSender;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.registration.email.enabled", havingValue = "true")
public class SmtpEmailVerificationSender implements EmailVerificationSender {

    private final JavaMailSender mailSender;

    @Value("${app.registration.email.from:no-reply@self-intro.local}")
    private String from;

    @Value("${app.registration.email.verification-base-url:http://localhost:3000/signup/verify}")
    private String verificationBaseUrl;

    @Override
    public void send(String email, String rawToken) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("Self-Intro 이메일 확인");
        message.setText(
                "아래 주소에서 이메일을 확인해 주세요.\n\n"
                        + verificationBaseUrl
                        + "#token="
                        + rawToken
                        + "\n\n본인이 요청하지 않았다면 이 메일을 무시하세요.");
        mailSender.send(message);
    }
}
