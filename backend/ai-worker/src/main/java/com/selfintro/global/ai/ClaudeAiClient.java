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

    /**
     * Anthropic Messages API엔 OpenAI 스타일의 강제 JSON 응답 모드가 없어, 시스템 프롬프트에 JSON 전용 지시문을
     * 덧붙이는 방식으로 흉내낸다. 파싱은 호출부(AiJsonSupport 등)의 관대한 파서가 처리한다.
     */
    public String generateJson(String systemPrompt, String userPrompt, String modelName) {
        String jsonSystemPrompt = systemPrompt
                + "\n\n반드시 JSON 객체 하나만 응답하세요. 설명 문장이나 ```json 같은 코드펜스 없이 순수 JSON만 출력하세요.";
        return generate(jsonSystemPrompt, userPrompt, modelName);
    }

    public String generate(String systemPrompt, String userPrompt, String modelName) {
        if (!isConfigured()) {
            throw new IllegalArgumentException("ANTHROPIC_API_KEY 가 환경변수/k8s 시크릿에 설정되지 않았습니다.");
        }

        String targetModel = (modelName != null && !modelName.isBlank()) ? modelName : "claude-sonnet-5";

        try {
            ClaudeRequest body = new ClaudeRequest(
                    targetModel,
                    8192,
                    systemPrompt,
                    List.of(new ClaudeMessage("user", userPrompt)),
                    new ClaudeThinking("adaptive"),
                    new ClaudeOutputConfig("low")
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
            if (resBody.content != null) {
                for (ClaudeContentBlock block : resBody.content) {
                    if (block.text != null && !block.text.isBlank()) {
                        return block.text;
                    }
                }
            }
            throw new RuntimeException("Anthropic API 반환 결과가 비어 있습니다: " + response.body());
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
            List<ClaudeMessage> messages,
            ClaudeThinking thinking,
            @JsonProperty("output_config") ClaudeOutputConfig outputConfig
    ) {}

    private record ClaudeThinking(String type) {}

    private record ClaudeOutputConfig(String effort) {}

    private static class ClaudeResponse {
        public List<ClaudeContentBlock> content;
    }

    private static class ClaudeContentBlock {
        public String text;
    }
}
