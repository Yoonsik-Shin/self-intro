package com.selfintro.modules.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SmtpEmailVerificationSenderTest {

    @Mock private JavaMailSender mailSender;

    @Test
    void keepsVerificationSecretOutOfHttpRequestUrl() {
        SmtpEmailVerificationSender sender = new SmtpEmailVerificationSender(mailSender);
        ReflectionTestUtils.setField(sender, "from", "no-reply@example.com");
        ReflectionTestUtils.setField(
                sender, "verificationBaseUrl", "https://example.com/signup/verify");

        sender.send("recipient@example.com", "raw-verification-secret");

        ArgumentCaptor<SimpleMailMessage> messageCaptor =
                ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        assertThat(messageCaptor.getValue().getText())
                .contains("https://example.com/signup/verify#token=raw-verification-secret")
                .doesNotContain("?token=raw-verification-secret");
    }
}
