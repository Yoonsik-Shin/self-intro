package com.selfintro.global.ai;

import java.util.Optional;

public final class EvidencePacketContext {

    private static final ThreadLocal<String> SNAPSHOT_HASH = new ThreadLocal<>();

    private EvidencePacketContext() {}

    static void record(String hash) {
        SNAPSHOT_HASH.set(hash);
    }

    public static Optional<String> consume() {
        String hash = SNAPSHOT_HASH.get();
        SNAPSHOT_HASH.remove();
        return Optional.ofNullable(hash);
    }

    public static Optional<String> current() {
        return Optional.ofNullable(SNAPSHOT_HASH.get());
    }

    public static void clear() {
        SNAPSHOT_HASH.remove();
    }
}
