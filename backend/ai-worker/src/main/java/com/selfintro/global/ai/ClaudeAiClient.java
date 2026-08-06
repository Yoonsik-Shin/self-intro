package com.selfintro.global.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ClaudeAiClient {

    private final String apiKey;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ClaudeAiClient(
            @Value("${app.ai.anthropic-api-key:}") String apiKey,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String generate(String systemPrompt, String userPrompt, String modelName) {
        if (!isConfigured()) {
            throw new IllegalStateException("로컬 터미널/환경변수에 ANTHROPIC_API_KEY 가 설정되지 않았습니다.\n(export ANTHROPIC_API_KEY=\"sk-ant-api03-...\")");
        }

        String targetModel = (modelName != null && !modelName.isBlank()) ? modelName : "claude-3-5-sonnet-20241022";

        try {
            ClaudeRequest body = new ClaudeRequest(
                    targetModel,
                    4096,
                    systemPrompt,
                    List.of(new ClaudeMessage("user", userPrompt))
            );

            String requestJson = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.anthropic.com/v1/messages"))
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", "2023-06-01")
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(60))
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new RuntimeException("Anthropic API Error (" + response.statusCode() + "): " + response.body());
            }

            ClaudeResponse resBody = objectMapper.readValue(response.body(), ClaudeResponse.class);
            if (resBody.content != null && !resBody.content.isEmpty()) {
                return resBody.content.get(0).text;
            }
            throw new RuntimeException("Anthropic API 반환 결과가 비어 있습니다.");
        } catch (Exception e) {
            if (e instanceof RuntimeException) throw (RuntimeException) e;
            throw new RuntimeException("Claude AI 호출 중 오류 발생: " + e.getMessage(), e);
        }
    }

    private record ClaudeMessage(String role, String content) {}

    private record ClaudeRequest(
            String model,
            @JsonProperty("max_tokens") int maxTokens,
            String system,
            List<ClaudeMessage> messages
    ) {}

    private static class ClaudeResponse {
        public List<ClaudeContentBlock> content;
    }

    private static class ClaudeContentBlock {
        public String text;
    }
}
