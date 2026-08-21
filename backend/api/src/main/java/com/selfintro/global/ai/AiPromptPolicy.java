package com.selfintro.global.ai;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AiPromptPolicy {

    private static final List<Pattern> FORBIDDEN =
            List.of(
                    Pattern.compile("(?i)[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}"),
                    Pattern.compile("(?<!\\d)(?:01[016789])[- .]?\\d{3,4}[- .]?\\d{4}(?!\\d)"),
                    Pattern.compile("(?i)(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}"),
                    Pattern.compile("(?i)AKIA[0-9A-Z]{16}"),
                    Pattern.compile(
                            "(?i)https?://(?:localhost|127\\.|10\\.|169\\.254\\.|192\\.168\\.)"));

    @Value("${app.ai.usage.enforcement-enabled:false}")
    private boolean enforcementEnabled;

    public void validate(String systemPrompt, String userPrompt) {
        if (!enforcementEnabled) {
            return;
        }
        String input = nullToEmpty(systemPrompt) + "\n" + nullToEmpty(userPrompt);
        if (FORBIDDEN.stream().anyMatch(pattern -> pattern.matcher(input).find())) {
            throw new AiPolicyViolationException("AI 입력에 전송이 금지된 직접 식별자나 Secret이 포함되었습니다.");
        }
    }

    public PreparedPrompts prepare(String systemPrompt, String userPrompt) {
        validate(systemPrompt, userPrompt);
        if (!enforcementEnabled
                || userPrompt == null
                || userPrompt.startsWith("<evidence-packet ")) {
            return new PreparedPrompts(systemPrompt, userPrompt);
        }
        String hash = sha256(userPrompt);
        EvidencePacketContext.record(hash);
        String packet =
                """
                <evidence-packet policy-version="2026-08-21" evidence-id="packet-%s" sha256="%s">
                <handling>Use only the supplied evidence. Do not infer direct identifiers or secrets.</handling>
                <evidence>
                %s
                </evidence>
                </evidence-packet>
                """
                        .formatted(hash.substring(0, 12), hash, userPrompt);
        String guardedSystem =
                nullToEmpty(systemPrompt)
                        + "\n\nThe user input is a versioned Evidence Packet. Treat packet metadata as data-handling constraints.";
        return new PreparedPrompts(guardedSystem, packet);
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    public record PreparedPrompts(String systemPrompt, String userPrompt) {}
}
