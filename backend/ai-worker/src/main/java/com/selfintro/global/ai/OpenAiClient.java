package com.selfintro.global.ai;

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
public class OpenAiClient {

    private final String apiKey;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public OpenAiClient(
            @Value("${app.ai.openai-api-key:}") String apiKey,
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
            throw new IllegalArgumentException("OPENAI_API_KEY 가 환경변수/k8s 시크릿에 설정되지 않았습니다.");
        }

        String targetModel = (modelName != null && !modelName.isBlank()) ? modelName : "gpt-5.4-mini";

        try {
            OpenAiRequest body = new OpenAiRequest(
                    targetModel,
                    List.of(
                            new OpenAiMessage("system", systemPrompt),
                            new OpenAiMessage("user", userPrompt)
                    )
            );

            String requestJson = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(60))
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new RuntimeException("OpenAI API Error (" + response.statusCode() + "): " + response.body());
            }

            OpenAiResponse resBody = objectMapper.readValue(response.body(), OpenAiResponse.class);
            if (resBody.choices != null && !resBody.choices.isEmpty()) {
                return resBody.choices.get(0).message.content;
            }
            throw new RuntimeException("OpenAI API 반환 결과가 비어 있습니다.");
        } catch (Exception e) {
            if (e instanceof RuntimeException) throw (RuntimeException) e;
            throw new RuntimeException("OpenAI 호출 중 오류 발생: " + e.getMessage(), e);
        }
    }

    private record OpenAiMessage(String role, String content) {}

    private record OpenAiRequest(String model, List<OpenAiMessage> messages) {}

    private static class OpenAiResponse {
        public List<OpenAiChoice> choices;
    }

    private static class OpenAiChoice {
        public OpenAiMessage message;
    }
}
