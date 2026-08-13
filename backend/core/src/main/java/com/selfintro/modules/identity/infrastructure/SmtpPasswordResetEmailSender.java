package com.selfintro.modules.identity.infrastructure;

import com.selfintro.modules.identity.application.PasswordResetEmailSender;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.account-recovery.email.enabled", havingValue = "true")
public class SmtpPasswordResetEmailSender implements PasswordResetEmailSender {

    private final JavaMailSender mailSender;

    @Value("${app.account-recovery.email.from:no-reply@self-intro.local}")
    private String from;

    @Value("${app.account-recovery.password-reset.base-url:http://localhost:3000/password-reset}")
    private String baseUrl;

    @Override
    public void send(String email, String rawToken) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("Self-Intro 비밀번호 재설정");
        message.setText(
                "아래 주소에서 30분 안에 비밀번호를 재설정해 주세요.\n\n"
                        + baseUrl
                        + "#token="
                        + rawToken
                        + "\n\n본인이 요청하지 않았다면 이 메일을 무시하세요.");
        mailSender.send(message);
    }
}
