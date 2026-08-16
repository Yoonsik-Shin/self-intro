package com.selfintro.modules.identity.infrastructure;

import com.selfintro.modules.identity.application.EmailChangeSender;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.account-recovery.email.enabled", havingValue = "true")
public class SmtpEmailChangeSender implements EmailChangeSender {

    private final JavaMailSender mailSender;

    @Value("${app.account-recovery.email.from:no-reply@self-intro.local}")
    private String from;

    @Value(
            "${app.account-recovery.email-change.base-url:http://localhost:3000/account/email-change}")
    private String baseUrl;

    @Override
    public void send(String email, String rawToken) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("Self-Intro 로그인 이메일 변경 확인");
        message.setText(
                "아래 주소에서 30분 안에 새 로그인 이메일을 확인해 주세요.\n\n"
                        + baseUrl
                        + "#token="
                        + rawToken
                        + "\n\n본인이 요청하지 않았다면 이 메일을 무시하세요. 기존 이메일은 변경되지 않습니다.");
        mailSender.send(message);
    }
}
