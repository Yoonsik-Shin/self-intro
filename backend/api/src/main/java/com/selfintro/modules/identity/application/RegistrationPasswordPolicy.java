package com.selfintro.modules.identity.application;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class RegistrationPasswordPolicy {

    private static final Set<String> BLOCKED_PASSWORDS =
            Set.of(
                    "password1!",
                    "password123!",
                    "qwerty123!",
                    "qwertyuiop1!",
                    "letmein123!",
                    "welcome123!",
                    "admin1234!",
                    "administrator1!",
                    "iloveyou1!",
                    "changeme1!",
                    "abc123456!",
                    "123456789a!",
                    "1q2w3e4r!",
                    "1qaz2wsx!",
                    "asdfghjkl1!",
                    "zxcvbnm123!",
                    "passw0rd1!",
                    "p@ssword1",
                    "p@ssw0rd1");

    public void validate(String password) {
        if (password == null || password.length() < 10 || password.length() > 32) {
            throw new IllegalArgumentException("비밀번호는 10~32자로 입력해 주세요.");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new IllegalArgumentException("비밀번호에는 영문 대문자가 필요합니다.");
        }
        if (!password.matches(".*[a-z].*")) {
            throw new IllegalArgumentException("비밀번호에는 영문 소문자가 필요합니다.");
        }
        if (!password.matches(".*[0-9].*")) {
            throw new IllegalArgumentException("비밀번호에는 숫자가 필요합니다.");
        }
        if (!password.matches(".*[^A-Za-z0-9\\s].*")) {
            throw new IllegalArgumentException("비밀번호에는 특수문자가 필요합니다.");
        }
        if (password.matches(".*\\s.*")) {
            throw new IllegalArgumentException("비밀번호에는 공백을 사용할 수 없습니다.");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("현재 비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.");
        }
        if (BLOCKED_PASSWORDS.contains(password.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("널리 사용되는 취약 비밀번호는 사용할 수 없습니다.");
        }
    }
}
