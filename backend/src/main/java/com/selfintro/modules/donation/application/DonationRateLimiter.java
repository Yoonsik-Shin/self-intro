package com.selfintro.modules.donation.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * IP당 분당 5회 후원 생성 제한. 단일 replica 배포라 인메모리로 충분하다
 * (replica가 늘어나면 제한이 replica 수만큼 느슨해지는 한계가 있음).
 * 큐 갱신은 반드시 compute 계열 블록 안에서만 수행한다 — ConcurrentHashMap의
 * 키 단위 원자성이 동시성 보장의 전부이고, ArrayDeque 자체는 thread-safe가 아니다.
 */
@Component
@RequiredArgsConstructor
public class DonationRateLimiter {
    private static final int MAX_REQUESTS_PER_WINDOW = 5;
    private static final Duration WINDOW = Duration.ofMinutes(1);
    private static final int PRUNE_THRESHOLD = 256;

    private final ConcurrentHashMap<String, ArrayDeque<Instant>> requestLog = new ConcurrentHashMap<>();
    private final Clock donationClock;

    public boolean tryAcquire(String clientIp) {
        Instant now = Instant.now(donationClock);
        Instant cutoff = now.minus(WINDOW);
        boolean[] allowed = {false};
        requestLog.compute(clientIp, (ip, queue) -> {
            if (queue == null) {
                queue = new ArrayDeque<>();
            }
            while (!queue.isEmpty() && queue.peekFirst().isBefore(cutoff)) {
                queue.pollFirst();
            }
            if (queue.size() < MAX_REQUESTS_PER_WINDOW) {
                queue.addLast(now);
                allowed[0] = true;
            }
            return queue;
        });
        if (requestLog.size() > PRUNE_THRESHOLD) {
            prune(cutoff);
        }
        return allowed[0];
    }

    private void prune(Instant cutoff) {
        for (String ip : requestLog.keySet()) {
            requestLog.computeIfPresent(ip, (key, queue) -> {
                while (!queue.isEmpty() && queue.peekFirst().isBefore(cutoff)) {
                    queue.pollFirst();
                }
                return queue.isEmpty() ? null : queue;
            });
        }
    }
}
