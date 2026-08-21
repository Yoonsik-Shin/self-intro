package com.selfintro.global.ai;

import java.util.Optional;

public final class ProviderUsageContext {

    private static final ThreadLocal<Usage> CURRENT = new ThreadLocal<>();

    private ProviderUsageContext() {}

    public static void record(
            String provider,
            String model,
            long inputTokens,
            long cachedInputTokens,
            long outputTokens) {
        CURRENT.set(
                new Usage(
                        provider,
                        model,
                        Math.max(0, inputTokens),
                        Math.max(0, cachedInputTokens),
                        Math.max(0, outputTokens)));
    }

    public static Optional<Usage> current() {
        return Optional.ofNullable(CURRENT.get());
    }

    public static void clear() {
        CURRENT.remove();
    }

    public record Usage(
            String provider,
            String model,
            long inputTokens,
            long cachedInputTokens,
            long outputTokens) {}
}
