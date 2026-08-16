package com.selfintro.modules.auth.application;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RequestFingerprintService {

    public static final String IP_HASH_ATTRIBUTE = "SELF_INTRO_LOGIN_IP_HASH";
    public static final String DEVICE_HASH_ATTRIBUTE = "SELF_INTRO_LOGIN_DEVICE_HASH";
    private final String pepper;

    public RequestFingerprintService(
            @Value("${app.security.fingerprint.pepper:local-development-only}") String pepper) {
        this.pepper = pepper;
    }

    public Fingerprint create(HttpServletRequest request) {
        String device =
                nullToEmpty(request.getHeader("User-Agent"))
                        + "|"
                        + nullToEmpty(request.getHeader("Accept-Language"));
        return new Fingerprint(hash(request.getRemoteAddr()), hash(device));
    }

    /** 인증 제한 키에 이메일/아이디 원문이 남지 않도록 동일한 HMAC 경계로 식별자를 변환한다. */
    public String hashIdentifier(String value) {
        return hash(nullToEmpty(value).trim().toLowerCase(java.util.Locale.ROOT));
    }

    private String hash(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of()
                    .formatHex(mac.doFinal(nullToEmpty(value).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("요청 fingerprint 생성에 실패했습니다.", exception);
        }
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    public record Fingerprint(String ipHash, String deviceHash) {}
}
