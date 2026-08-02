package com.selfintro.modules.visitor.application;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class BotDetectorTest {
    @Test
    void detectsGoogleAdCrawler() {
        assertThat(BotDetector.isLikelyBot("Mediapartners-Google")).isTrue();
    }

    @Test
    void doesNotFlagRegularBrowser() {
        assertThat(
                        BotDetector.isLikelyBot(
                                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                                        + "AppleWebKit/537.36 (KHTML, like Gecko) "
                                        + "Chrome/150.0.0.0 Safari/537.36"))
                .isFalse();
    }
}
