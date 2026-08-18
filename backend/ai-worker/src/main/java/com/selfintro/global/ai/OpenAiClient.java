package com.selfintro.global.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OpenAiClient {

    private final String apiKey;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    public OpenAiClient(
            @Value("${app.ai.openai-api-key:}") String apiKey, ObjectMapper objectMapper) {
        this(apiKey, objectMapper, null);
    }

    @Autowired
    public OpenAiClient(
            @Value("${app.ai.openai-api-key:}") String apiKey,
            ObjectMapper objectMapper,
            @Autowired(required = false) MeterRegistry meterRegistry) {
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String generate(String systemPrompt, String userPrompt, String modelName) {
        return generate(systemPrompt, userPrompt, modelName, false);
    }

    /**
     * Chat Completions API의 네이티브 {@code response_format: json_object} 옵션을 켜서 구조화 JSON 응답을 강제한다.
     * NVIDIA NIM 전용이었던 {@code generateJsonOnce}와 동등한 기능을 OpenAI 모델에도 제공한다.
     */
    public String generateJson(String systemPrompt, String userPrompt, String modelName) {
        return generate(systemPrompt, userPrompt, modelName, true);
    }

    private String generate(
            String systemPrompt, String userPrompt, String modelName, boolean forceJsonResponse) {
        if (!isConfigured()) {
            throw new IllegalArgumentException("OPENAI_API_KEY 가 환경변수/k8s 시크릿에 설정되지 않았습니다.");
        }

        String targetModel =
                (modelName != null && !modelName.isBlank()) ? modelName : "gpt-5.4-mini";
        Timer.Sample sample = (meterRegistry != null) ? Timer.start(meterRegistry) : null;

        try {
            OpenAiRequest body =
                    new OpenAiRequest(
                            targetModel,
                            List.of(
                                    new OpenAiMessage("system", systemPrompt),
                                    new OpenAiMessage("user", userPrompt)),
                            forceJsonResponse ? new OpenAiResponseFormat("json_object") : null);

            String requestJson = objectMapper.writeValueAsString(body);

            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                            .header("Authorization", "Bearer " + apiKey)
                            .header("Content-Type", "application/json")
                            .timeout(Duration.ofSeconds(60))
                            .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                            .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                if (meterRegistry != null) {
                    meterRegistry
                            .counter(
                                    "ai.openai.request.status",
                                    "status",
                                    "failed",
                                    "model",
                                    targetModel)
                            .increment();
                }
                throw new RuntimeException(
                        "OpenAI API Error (" + response.statusCode() + "): " + response.body());
            }

            if (meterRegistry != null) {
                meterRegistry
                        .counter(
                                "ai.openai.request.status",
                                "status",
                                "success",
                                "model",
                                targetModel)
                        .increment();
                if (sample != null) {
                    sample.stop(
                            meterRegistry.timer(
                                    "ai.openai.request.duration", "model", targetModel));
                }
            }

            OpenAiResponse resBody = objectMapper.readValue(response.body(), OpenAiResponse.class);
            if (resBody.choices != null && !resBody.choices.isEmpty()) {
                String content =
                        resBody.choices.get(0).message != null
                                ? resBody.choices.get(0).message.content
                                : null;
                if (content != null && !content.isBlank()) {
                    return content;
                }
            }
            throw new RuntimeException("OpenAI API 반환 결과가 비어 있습니다: " + response.body());
        } catch (Exception e) {
            if (e instanceof RuntimeException) throw (RuntimeException) e;
            throw new RuntimeException("OpenAI 호출 중 오류 발생: " + e.getMessage(), e);
        }
    }

    private record OpenAiMessage(String role, String content) {}

    private record OpenAiResponseFormat(String type) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record OpenAiRequest(
            String model,
            List<OpenAiMessage> messages,
            @JsonProperty("response_format") OpenAiResponseFormat responseFormat) {}

    private static class OpenAiResponse {
        public List<OpenAiChoice> choices;
    }

    private static class OpenAiChoice {
        public OpenAiMessage message;
    }
}
