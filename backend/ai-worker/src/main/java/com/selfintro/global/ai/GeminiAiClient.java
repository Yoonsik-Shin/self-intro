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
public class GeminiAiClient {

    private final String apiKey;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public GeminiAiClient(
            @Value("${app.ai.gemini-api-key:}") String apiKey,
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
            throw new IllegalStateException("로컬 터미널/환경변수에 GEMINI_API_KEY 가 설정되지 않았습니다.\n(export GEMINI_API_KEY=\"AIzaSy...\")");
        }

        String targetModel = (modelName != null && !modelName.isBlank()) ? modelName : "gemini-2.0-flash";

        try {
            String combinedPrompt = systemPrompt + "\n\n" + userPrompt;

            GeminiRequest body = new GeminiRequest(
                    List.of(new GeminiContent("user", List.of(new GeminiPart(combinedPrompt))))
            );

            String requestJson = objectMapper.writeValueAsString(body);
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + targetModel + ":generateContent?key=" + apiKey;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(60))
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new RuntimeException("Gemini API Error (" + response.statusCode() + "): " + response.body());
            }

            GeminiResponse resBody = objectMapper.readValue(response.body(), GeminiResponse.class);
            if (resBody.candidates != null && !resBody.candidates.isEmpty()) {
                GeminiCandidate candidate = resBody.candidates.get(0);
                if (candidate.content != null && candidate.content.parts != null && !candidate.content.parts.isEmpty()) {
                    return candidate.content.parts.get(0).text;
                }
            }
            throw new RuntimeException("Gemini API 반환 결과가 비어 있습니다.");
        } catch (Exception e) {
            if (e instanceof RuntimeException) throw (RuntimeException) e;
            throw new RuntimeException("Gemini AI 호출 중 오류 발생: " + e.getMessage(), e);
        }
    }

    private record GeminiPart(String text) {}

    private record GeminiContent(String role, List<GeminiPart> parts) {}

    private record GeminiRequest(List<GeminiContent> contents) {}

    private static class GeminiResponse {
        public List<GeminiCandidate> candidates;
    }

    private static class GeminiCandidate {
        public GeminiContent content;
    }
}
