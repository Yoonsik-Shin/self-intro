package com.selfintro.modules.auth.application;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MfaSecretCipher {

    private static final int NONCE_LENGTH = 12;
    private static final int GCM_TAG_BITS = 128;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String encodedKey;

    public MfaSecretCipher(@Value("${app.security.mfa.encryption-key:}") String encodedKey) {
        this.encodedKey = encodedKey;
    }

    public String encrypt(String plaintext) {
        try {
            byte[] nonce = new byte[NONCE_LENGTH];
            secureRandom.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(GCM_TAG_BITS, nonce));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(nonce)
                    + "."
                    + Base64.getUrlEncoder().withoutPadding().encodeToString(ciphertext);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("MFA 비밀키 암호화에 실패했습니다.", exception);
        }
    }

    public String decrypt(String value) {
        try {
            String[] parts = value.split("\\.", 2);
            if (parts.length != 2) {
                throw new IllegalArgumentException("잘못된 MFA 암호문입니다.");
            }
            byte[] nonce = Base64.getUrlDecoder().decode(parts[0]);
            byte[] ciphertext = Base64.getUrlDecoder().decode(parts[1]);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(GCM_TAG_BITS, nonce));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new IllegalStateException("MFA 비밀키 복호화에 실패했습니다.", exception);
        }
    }

    private SecretKeySpec key() {
        if (encodedKey == null || encodedKey.isBlank()) {
            throw new IllegalStateException("MFA_ENCRYPTION_KEY가 설정되지 않았습니다.");
        }
        byte[] decoded = Base64.getDecoder().decode(encodedKey);
        if (decoded.length != 32) {
            throw new IllegalStateException("MFA_ENCRYPTION_KEY는 Base64 인코딩된 32바이트 키여야 합니다.");
        }
        return new SecretKeySpec(decoded, "AES");
    }
}
