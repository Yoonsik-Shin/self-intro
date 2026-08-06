package com.selfintro.global.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class GeminiAiClient {

    private final String apiKey;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    public GeminiAiClient(
            @Value("${app.ai.gemini-api-key:}") String apiKey,
            ObjectMapper objectMapper) {
        this(apiKey, objectMapper, null);
    }

    @Autowired
    public GeminiAiClient(
            @Value("${app.ai.gemini-api-key:}") String apiKey,
            ObjectMapper objectMapper,
            @Autowired(required = false) MeterRegistry meterRegistry) {
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String generate(String systemPrompt, String userPrompt, String modelName) {
        return generate(systemPrompt, userPrompt, modelName, false);
    }

    /**
     * Gemini generateContent API의 네이티브 {@code generationConfig.responseMimeType=application/json} 옵션을 켜서
     * 구조화 JSON 응답을 강제한다.
     */
    public String generateJson(String systemPrompt, String userPrompt, String modelName) {
        return generate(systemPrompt, userPrompt, modelName, true);
    }

    private String generate(String systemPrompt, String userPrompt, String modelName, boolean forceJsonResponse) {
        if (!isConfigured()) {
            throw new IllegalArgumentException("GEMINI_API_KEY 가 환경변수/k8s 시크릿에 설정되지 않았습니다.");
        }

        String targetModel = (modelName != null && !modelName.isBlank()) ? modelName : "gemini-3.1-flash-lite";
        Timer.Sample sample = (meterRegistry != null) ? Timer.start(meterRegistry) : null;

        try {
            String combinedPrompt = systemPrompt + "\n\n" + userPrompt;

            GeminiRequest body = new GeminiRequest(
                    List.of(new GeminiContent("user", List.of(new GeminiPart(combinedPrompt)))),
                    forceJsonResponse ? new GeminiGenerationConfig("application/json") : null
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
                if (meterRegistry != null) {
                    meterRegistry.counter("ai.gemini.request.status", "status", "failed", "model", targetModel).increment();
                }
                throw new RuntimeException("Gemini API Error (" + response.statusCode() + "): " + response.body());
            }

            if (meterRegistry != null) {
                meterRegistry.counter("ai.gemini.request.status", "status", "success", "model", targetModel).increment();
                if (sample != null) {
                    sample.stop(meterRegistry.timer("ai.gemini.request.duration", "model", targetModel));
                }
            }

            GeminiResponse resBody = objectMapper.readValue(response.body(), GeminiResponse.class);
            if (resBody.candidates != null && !resBody.candidates.isEmpty()) {
                GeminiCandidate candidate = resBody.candidates.get(0);
                if (candidate.content != null && candidate.content.parts != null) {
                    for (GeminiPart part : candidate.content.parts) {
                        if (part.text != null && !part.text.isBlank()) {
                            return part.text;
                        }
                    }
                }
            }
            throw new RuntimeException("Gemini API 반환 결과가 비어 있습니다: " + response.body());
        } catch (Exception e) {
            if (e instanceof RuntimeException) throw (RuntimeException) e;
            throw new RuntimeException("Gemini AI 호출 중 오류 발생: " + e.getMessage(), e);
        }
    }

    private record GeminiPart(String text) {}

    private record GeminiContent(String role, List<GeminiPart> parts) {}

    private record GeminiGenerationConfig(
            @com.fasterxml.jackson.annotation.JsonProperty("responseMimeType") String responseMimeType) {}

    @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
    private record GeminiRequest(List<GeminiContent> contents, GeminiGenerationConfig generationConfig) {}

    private static class GeminiResponse {
        public List<GeminiCandidate> candidates;
    }

    private static class GeminiCandidate {
        public GeminiContent content;
    }
}
