package com.selfintro.modules.competency.ai;

import java.util.function.Consumer;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.ResponseFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class NvidiaNimClient {
    private final ChatClient chatClient;
    private final boolean enabled;
    private final String apiKey;
    private final String model;
    private final int maxOutputTokens;
    private final boolean jsonResponseFormat;

    public NvidiaNimClient(
        ChatClient.Builder chatClientBuilder,
        @Value("${app.ai.competency.enabled:false}") boolean enabled,
        @Value("${app.ai.competency.api-key:}") String apiKey,
        @Value("${app.ai.competency.model:qwen/qwen3.5-122b-a10b}") String model,
        @Value("${app.ai.competency.max-output-tokens:4096}") int maxOutputTokens,
        @Value("${app.ai.competency.json-response-format:false}") boolean jsonResponseFormat
    ) {
        this.chatClient = chatClientBuilder.build();
        this.enabled = enabled;
        this.apiKey = apiKey;
        this.model = model;
        this.maxOutputTokens = maxOutputTokens;
        this.jsonResponseFormat = jsonResponseFormat;
    }

    public String generate(String systemPrompt, String userPrompt) {
        ensureAvailable();
        try {
            String content = chatClient.prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .options(buildOptions())
                .call()
                .content();
            return requireContent(content);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw translate(exception);
        }
    }

    public String generateStreaming(String systemPrompt, String userPrompt, Consumer<String> onToken) {
        ensureAvailable();
        try {
            StringBuilder content = new StringBuilder();
            chatClient.prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .options(buildOptions())
                .stream()
                .content()
                .doOnNext(token -> {
                    content.append(token);
                    onToken.accept(token);
                })
                .blockLast();
            return requireContent(content.toString());
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw translate(exception);
        }
    }

    private void ensureAvailable() {
        if (!enabled || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "핵심 역량 AI 기능이 비활성화되어 있습니다. NVIDIA API 설정을 확인해주세요.");
        }
    }

    private OpenAiChatOptions buildOptions() {
        OpenAiChatOptions.Builder builder = OpenAiChatOptions.builder()
            .model(model)
            .temperature(0.2)
            .topP(0.9)
            .maxTokens(maxOutputTokens);
        if (jsonResponseFormat) {
            // NVIDIA NIM의 Qwen3.5 엔드포인트는 response_format 지정 시 빈 응답을 반환하므로 기본값은 비활성이다.
            builder.responseFormat(new ResponseFormat(ResponseFormat.Type.JSON_OBJECT, null));
        }
        return builder.build();
    }

    private static String requireContent(String content) {
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "NVIDIA API가 빈 응답을 반환했습니다.");
        }
        return content;
    }

    private static ResponseStatusException translate(Exception exception) {
        String message = exception.getMessage() == null ? "" : exception.getMessage().toLowerCase();
        if (message.contains("429") || message.contains("rate limit")) {
            return new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "NVIDIA API 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.", exception);
        }
        if (message.contains("timeout") || message.contains("timed out")) {
            return new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT,
                "NVIDIA API 응답 시간이 초과되었습니다.", exception);
        }
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
            "Spring AI를 통한 NVIDIA API 호출에 실패했습니다. API 키와 모델 설정을 확인해주세요.", exception);
    }
}
