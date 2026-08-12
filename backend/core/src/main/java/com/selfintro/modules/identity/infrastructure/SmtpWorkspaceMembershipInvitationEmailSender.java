package com.selfintro.modules.identity.infrastructure;

import com.selfintro.modules.identity.application.WorkspaceMembershipInvitationEmailSender;
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
public class SmtpWorkspaceMembershipInvitationEmailSender
        implements WorkspaceMembershipInvitationEmailSender {

    private final JavaMailSender mailSender;

    @Value("${app.registration.email.from:no-reply@self-intro.local}")
    private String from;

    @Override
    public void send(
            String email,
            String workspaceName,
            String inviterDisplayName,
            String invitationUrl,
            LocalDateTime expiresAt) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("Self-Intro Workspace 참여 초대");
        message.setText(
                inviterDisplayName
                        + " 님이 '"
                        + workspaceName
                        + "' Workspace에 초대했습니다.\n\n"
                        + "로그인한 뒤 아래 링크에서 참여 여부를 확인해 주세요.\n"
                        + invitationUrl
                        + "\n\n유효기간: "
                        + expiresAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                        + "\n본인이 예상하지 않은 초대라면 수락하지 마세요.");
        mailSender.send(message);
    }
}
