package com.selfintro.modules.visitor.application;

import java.util.regex.Pattern;

final class BotDetector {
    private static final Pattern KNOWN_BOT_SIGNATURE = Pattern.compile(
            "bot|spider|crawl|slurp|curl|wget|python-requests|python-urllib|scrapy"
                    + "|httpclient|okhttp|go-http-client|java/|libwww-perl|phantomjs"
                    + "|headlesschrome|postmanruntime|node-fetch|puppeteer|playwright|selenium",
            Pattern.CASE_INSENSITIVE);

    private BotDetector() {
    }

    static boolean isLikelyBot(String userAgent) {
        return userAgent == null || userAgent.isBlank() || KNOWN_BOT_SIGNATURE.matcher(userAgent).find();
    }
}
