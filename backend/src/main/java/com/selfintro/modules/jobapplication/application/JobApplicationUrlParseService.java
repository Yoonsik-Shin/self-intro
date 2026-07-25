package com.selfintro.modules.jobapplication.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationUrlParseResponse;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import org.jsoup.Jsoup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** 채용공고 URL 하나를 서버에서 단건으로 가져와 AI로 회사명/직무명/마감일 등을 추출한다. */
@Service
public class JobApplicationUrlParseService {

    private static final String PARSE_PROMPT =
            """
            당신은 채용 공고 페이지의 본문 텍스트에서 사실만 추출하는 편집 보조입니다.
            입력으로 공고 URL과 페이지 본문 텍스트가 주어집니다. 본문에 실제로 있는 내용만 사실로 인정하고,
            없는 내용은 만들어내지 마세요. 알 수 없는 값은 null로 두세요.
            source는 URL의 도메인이나 페이지 내용으로 미루어 알 수 있는 채용 플랫폼/회사 채용 페이지 이름입니다
            (예: 사람인, 원티드, 잡코리아, 회사 채용 사이트 등).
            deadline은 마감일이 있으면 YYYY-MM-DD 형식으로, 상시채용이거나 알 수 없으면 null로 반환하세요.
            설명이나 마크다운 없이 반드시 아래 JSON 구조만 반환하세요.
            {"companyName":null,"positionTitle":null,"source":null,"deadline":null,"salaryNote":null}
            """;

    private static final int MAX_PAGE_TEXT_LENGTH = 6000;
    private static final long MAX_RAW_BODY_LENGTH = 2_000_000L;

    private final NvidiaNimClient nvidiaNimClient;
    private final ObjectMapper objectMapper;
    private final boolean enabled;

    public JobApplicationUrlParseService(
            NvidiaNimClient nvidiaNimClient,
            ObjectMapper objectMapper,
            @Value("${app.ai.job-application.enabled:false}") boolean enabled) {
        this.nvidiaNimClient = nvidiaNimClient;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
    }

    public JobApplicationUrlParseResponse parse(String url) {
        if (!enabled) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "채용공고 URL 자동분석 기능이 비활성화되어 있습니다. NVIDIA API 설정을 확인해주세요.");
        }
        URI uri = validateUrl(url);
        String pageText = fetchPageText(uri);
        String userPrompt = "URL: " + url + "\n\n본문:\n" + pageText;

        try {
            String raw = nvidiaNimClient.generate(PARSE_PROMPT, userPrompt);
            ExtractedFields extracted =
                    AiJsonSupport.parseJson(
                            objectMapper, raw, ExtractedFields.class, "채용공고 URL 분석");
            return new JobApplicationUrlParseResponse(
                    AiJsonSupport.blankToNull(extracted.companyName()),
                    AiJsonSupport.blankToNull(extracted.positionTitle()),
                    AiJsonSupport.blankToNull(extracted.source()),
                    parseDate(extracted.deadline()),
                    AiJsonSupport.blankToNull(extracted.salaryNote()),
                    url);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "AI 응답을 처리하지 못했습니다. 다시 시도해주세요.", exception);
        }
    }

    private URI validateUrl(String url) {
        URI uri;
        try {
            uri = new URI(url.trim());
        } catch (URISyntaxException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바르지 않은 URL입니다.");
        }
        String scheme = uri.getScheme();
        if (scheme == null
                || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "http(s) URL만 지원합니다.");
        }
        return uri;
    }

    private String fetchPageText(URI uri) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        HttpRequest request =
                HttpRequest.newBuilder(uri)
                        .timeout(Duration.ofSeconds(8))
                        .header(
                                "User-Agent",
                                "Mozilla/5.0 (compatible; SelfIntroJobApplicationBot/1.0)")
                        .GET()
                        .build();
        try {
            HttpResponse<String> response =
                    client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "채용공고 페이지를 불러오지 못했습니다 (HTTP " + response.statusCode() + ").");
            }
            String body = response.body();
            if (body.length() > MAX_RAW_BODY_LENGTH) {
                body = body.substring(0, (int) MAX_RAW_BODY_LENGTH);
            }
            String text = Jsoup.parse(body, uri.toString()).text();
            return AiJsonSupport.limit(text, MAX_PAGE_TEXT_LENGTH);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "채용공고 페이지에 접속하지 못했습니다.", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "채용공고 페이지에 접속하지 못했습니다.", exception);
        }
    }

    private LocalDate parseDate(String value) {
        if (!AiJsonSupport.hasText(value)) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private record ExtractedFields(
            String companyName,
            String positionTitle,
            String source,
            String deadline,
            String salaryNote) {}
}
