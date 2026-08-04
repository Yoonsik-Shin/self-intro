package com.selfintro.modules.jobapplication.domain.enums;

import java.net.URI;
import java.util.Locale;

/** 등록된 공고 URL이 어느 채용 플랫폼 소속인지 호스트 기준으로 판별한다. 원본보기 팝오버에 플랫폼 라벨을 붙이는 용도다. */
public enum JobPostingPlatform {
    WANTED,
    JOBKOREA,
    SARAMIN,
    GREETINGHR,
    OTHER;

    public static JobPostingPlatform fromUrl(String url) {
        if (url == null || url.isBlank()) {
            return OTHER;
        }
        String host;
        try {
            host = URI.create(url.trim()).getHost();
        } catch (IllegalArgumentException exception) {
            return OTHER;
        }
        if (host == null) {
            return OTHER;
        }
        String lowerHost = host.toLowerCase(Locale.ROOT);
        if (lowerHost.endsWith("wanted.co.kr")) {
            return WANTED;
        }
        if (lowerHost.endsWith("jobkorea.co.kr")) {
            return JOBKOREA;
        }
        if (lowerHost.endsWith("saramin.co.kr")) {
            return SARAMIN;
        }
        if (lowerHost.endsWith("greetinghr.com")) {
            return GREETINGHR;
        }
        return OTHER;
    }
}
