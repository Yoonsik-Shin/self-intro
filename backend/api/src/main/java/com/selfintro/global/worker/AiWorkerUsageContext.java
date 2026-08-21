package com.selfintro.global.worker;

import java.net.http.HttpHeaders;
import java.util.Optional;

public final class AiWorkerUsageContext {

    private static final ThreadLocal<Usage> CURRENT = new ThreadLocal<>();

    private AiWorkerUsageContext() {}

    static void capture(HttpHeaders headers) {
        String provider = headers.firstValue("X-AI-Provider").orElse(null);
        if (provider == null || provider.isBlank()) {
            CURRENT.remove();
            return;
        }
        CURRENT.set(
                new Usage(
                        provider,
                        headers.firstValue("X-AI-Model").orElse(null),
                        number(headers, "X-AI-Input-Tokens"),
                        number(headers, "X-AI-Cached-Input-Tokens"),
                        number(headers, "X-AI-Output-Tokens"),
                        headers.firstValue("X-AI-Evidence-Hash").orElse(null)));
    }

    public static Optional<Usage> consume() {
        Usage usage = CURRENT.get();
        CURRENT.remove();
        return Optional.ofNullable(usage);
    }

    public static void clear() {
        CURRENT.remove();
    }

    private static long number(HttpHeaders headers, String name) {
        try {
            return Long.parseLong(headers.firstValue(name).orElse("0"));
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    public record Usage(
            String provider,
            String model,
            long inputTokens,
            long cachedInputTokens,
            long outputTokens,
            String evidenceSnapshotHash) {}
}
