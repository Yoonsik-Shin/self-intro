package com.selfintro.modules.identity.infrastructure;

import com.selfintro.modules.identity.application.InvitationEmailSender;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.registration.email.enabled", havingValue = "true")
public class SmtpInvitationEmailSender implements InvitationEmailSender {

    private final JavaMailSender mailSender;

    @Value("${app.registration.email.from:no-reply@self-intro.local}")
    private String from;

    @Override
    public void send(String email, String invitationUrl, LocalDateTime expiresAt) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("Self-Intro 비공개 베타 초대");
        message.setText(
                "Self-Intro 비공개 베타에 초대되었습니다.\n\n"
                        + "아래 링크에서 가입을 시작해 주세요.\n"
                        + invitationUrl
                        + "\n\n유효기간: "
                        + expiresAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                        + "\n본인이 요청하지 않았다면 이 메일을 무시하세요.");
        mailSender.send(message);
    }
}
