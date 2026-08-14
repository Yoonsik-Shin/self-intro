package com.selfintro.modules.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class MfaSecretCipherTest {

    private static final String ENCODED_KEY =
            Base64.getEncoder().encodeToString(new byte[32]);

    @Test
    void ignoresTrailingNewlineFromSecretGenerationTools() {
        var cipher = new MfaSecretCipher(ENCODED_KEY + "\n");

        String encrypted = cipher.encrypt("totp-secret");

        assertThat(cipher.decrypt(encrypted)).isEqualTo("totp-secret");
    }

    @Test
    void hidesBase64DecoderDetailsWhenKeyIsMalformed() {
        var cipher = new MfaSecretCipher("not-a-base64-key");

        assertThatThrownBy(() -> cipher.encrypt("totp-secret"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("MFA 비밀키 암호화에 실패했습니다.")
                .hasCauseInstanceOf(IllegalArgumentException.class);
    }
}
