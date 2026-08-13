package com.selfintro.modules.systemstatus.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.systemstatus.presentation.dto.ExternalServiceStatusResponse;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

// CI/CD 배포 중 "이게 우리 문제냐 벤더 장애냐" 구분할 때마다 각 status 사이트를 일일이
// 열어보던 걸 대체하기 위한 관리자용 통합 조회. Statuspage(v2) 계열 3개는 스키마가
// 동일하고, Google Cloud만 incidents.json 형태라 별도 파싱이 필요하다.
@Slf4j
@Service
public class ExternalStatusService {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(4);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ExternalStatusService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    }

    public List<ExternalServiceStatusResponse> checkAll() {
        CompletableFuture<ExternalServiceStatusResponse> github =
                fetchStatuspage(
                        "GitHub",
                        "https://www.githubstatus.com/api/v2/status.json",
                        "https://www.githubstatus.com");
        CompletableFuture<ExternalServiceStatusResponse> anthropic =
                fetchStatuspage(
                        "Anthropic (Claude)",
                        "https://status.claude.com/api/v2/status.json",
                        "https://status.claude.com");
        CompletableFuture<ExternalServiceStatusResponse> openai =
                fetchStatuspage(
                        "OpenAI",
                        "https://status.openai.com/api/v2/status.json",
                        "https://status.openai.com");
        CompletableFuture<ExternalServiceStatusResponse> googleCloud = fetchGoogleCloud();

        return CompletableFuture.allOf(github, anthropic, openai, googleCloud)
                .thenApply(
                        ignored ->
                                List.of(
                                        github.join(),
                                        anthropic.join(),
                                        openai.join(),
                                        googleCloud.join()))
                .join();
    }

    private CompletableFuture<ExternalServiceStatusResponse> fetchStatuspage(
            String name, String apiUrl, String pageUrl) {
        return getAsync(apiUrl)
                .thenApply(
                        body -> {
                            JsonNode status = readTree(body).path("status");
                            String indicator = status.path("indicator").asText("unknown");
                            String description = status.path("description").asText("알 수 없음");
                            return new ExternalServiceStatusResponse(
                                    name, indicator, description, pageUrl);
                        })
                .exceptionally(error -> unknown(name, pageUrl, error));
    }

    private CompletableFuture<ExternalServiceStatusResponse> fetchGoogleCloud() {
        String name = "Google Cloud";
        String pageUrl = "https://status.cloud.google.com";
        return getAsync("https://status.cloud.google.com/incidents.json")
                .thenApply(
                        body -> {
                            JsonNode incidents = readTree(body);
                            boolean hasOngoing = false;
                            boolean hasHighSeverityOngoing = false;
                            for (JsonNode incident : incidents) {
                                JsonNode end = incident.path("end");
                                if (end.isMissingNode() || end.isNull()) {
                                    hasOngoing = true;
                                    String severity = incident.path("severity").asText("");
                                    if ("high".equalsIgnoreCase(severity)) {
                                        hasHighSeverityOngoing = true;
                                    }
                                }
                            }
                            if (!hasOngoing) {
                                return new ExternalServiceStatusResponse(
                                        name, "none", "정상 운영중", pageUrl);
                            }
                            String indicator = hasHighSeverityOngoing ? "major" : "minor";
                            return new ExternalServiceStatusResponse(
                                    name, indicator, "진행 중인 이슈 있음", pageUrl);
                        })
                .exceptionally(error -> unknown(name, pageUrl, error));
    }

    private CompletableFuture<String> getAsync(String url) {
        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Accept", "application/json")
                        .GET()
                        .timeout(REQUEST_TIMEOUT)
                        .build();
        return httpClient
                .sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(
                        response -> {
                            if (response.statusCode() != 200) {
                                throw new IllegalStateException(
                                        "HTTP " + response.statusCode() + " from " + url);
                            }
                            return response.body();
                        });
    }

    private JsonNode readTree(String body) {
        try {
            return objectMapper.readTree(body);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse status response", e);
        }
    }

    private ExternalServiceStatusResponse unknown(String name, String pageUrl, Throwable error) {
        log.warn("External status check failed for {}", name, error);
        return new ExternalServiceStatusResponse(name, "unknown", "확인 실패", pageUrl);
    }
}
