package com.selfintro.modules.donation.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DonationRateLimiterTest {
    private static final Instant BASE = Instant.parse("2026-07-17T03:00:00Z");

    private Clock clock;
    private DonationRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        clock = mock(Clock.class);
        when(clock.instant()).thenReturn(BASE);
        rateLimiter = new DonationRateLimiter(clock);
    }

    @Test
    void allowsUpToFiveRequestsPerMinuteThenRejects() {
        for (int i = 0; i < 5; i++) {
            assertThat(rateLimiter.tryAcquire("1.2.3.4")).isTrue();
        }
        assertThat(rateLimiter.tryAcquire("1.2.3.4")).isFalse();
    }

    @Test
    void allowsAgainAfterWindowPasses() {
        for (int i = 0; i < 5; i++) {
            rateLimiter.tryAcquire("1.2.3.4");
        }
        assertThat(rateLimiter.tryAcquire("1.2.3.4")).isFalse();

        when(clock.instant()).thenReturn(BASE.plusSeconds(61));
        assertThat(rateLimiter.tryAcquire("1.2.3.4")).isTrue();
    }

    @Test
    void limitsAreIndependentPerIp() {
        for (int i = 0; i < 5; i++) {
            rateLimiter.tryAcquire("1.2.3.4");
        }
        assertThat(rateLimiter.tryAcquire("1.2.3.4")).isFalse();
        assertThat(rateLimiter.tryAcquire("5.6.7.8")).isTrue();
    }
}
