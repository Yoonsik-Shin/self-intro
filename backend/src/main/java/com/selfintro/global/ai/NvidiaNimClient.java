package com.selfintro.global.ai;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Consumer;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.content.Media;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.ResponseFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.MimeType;
import org.springframework.web.server.ResponseStatusException;

@Component
public class NvidiaNimClient {
    private final ChatClient chatClient;
    private final String apiKey;
    private final String model;
    private final int maxOutputTokens;
    private final boolean jsonResponseFormat;

    public NvidiaNimClient(
            ChatClient.Builder chatClientBuilder,
            @Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.model:nvidia/nemotron-3-super-120b-a12b}") String model,
            @Value("${app.ai.max-output-tokens:8192}") int maxOutputTokens,
            @Value("${app.ai.json-response-format:false}") boolean jsonResponseFormat) {
        this.chatClient = chatClientBuilder.build();
        this.apiKey = apiKey;
        this.model = model;
        this.maxOutputTokens = maxOutputTokens;
        this.jsonResponseFormat = jsonResponseFormat;
    }

    public String generate(String systemPrompt, String userPrompt) {
        return generate(systemPrompt, userPrompt, maxOutputTokens);
    }

    /**
     * 응답 자체가 길어질 수밖에 없는 호출(예: 항목별 자가점검 질문까지 포함하는 학습 계획 생성)을 위해 기본 {@code
     * app.ai.max-output-tokens}보다 큰 상한을 지정하고 싶을 때 사용한다.
     */
    public String generate(String systemPrompt, String userPrompt, int maxOutputTokensOverride) {
        ensureAvailable();
        return executeWithRetry(
                () -> {
                    String content =
                            chatClient
                                    .prompt()
                                    .system(systemPrompt)
                                    .user(userPrompt)
                                    .options(buildOptions(model, maxOutputTokensOverride))
                                    .call()
                                    .content();
                    return requireContent(content);
                });
    }

    /**
     * 사용자 요청 수명 안에서 반드시 끝나야 하는 짧은 구조화 추출용 호출이다. 공용 HTTP read timeout과 재시도 정책을 그대로 쓰면 한 번의 느린 응답이
     * SSE 전체 제한을 모두 소비할 수 있어, 호출별 작업 시간과 출력량을 별도로 제한한다.
     */
    public String generateOnce(
            String systemPrompt, String userPrompt, int maxOutputTokensOverride, Duration timeout) {
        return generateOnce(
                systemPrompt, userPrompt, maxOutputTokensOverride, timeout, jsonResponseFormat);
    }

    /** 구조화 응답이 반드시 필요한 짧은 호출에만 OpenAI 호환 JSON object 모드를 강제한다. */
    public String generateJsonOnce(
            String systemPrompt, String userPrompt, int maxOutputTokensOverride, Duration timeout) {
        return generateOnce(systemPrompt, userPrompt, maxOutputTokensOverride, timeout, true);
    }

    private String generateOnce(
            String systemPrompt,
            String userPrompt,
            int maxOutputTokensOverride,
            Duration timeout,
            boolean forceJsonResponse) {
        ensureAvailable();
        return executeWithTimeout(
                () -> {
                    String content =
                            chatClient
                                    .prompt()
                                    .system(systemPrompt)
                                    .user(userPrompt)
                                    .options(
                                            buildOptions(
                                                    model,
                                                    maxOutputTokensOverride,
                                                    forceJsonResponse))
                                    .call()
                                    .content();
                    return requireContent(content);
                },
                timeout);
    }

    public String generateWithImage(
            String systemPrompt,
            String userPrompt,
            String model,
            byte[] imageBytes,
            String mimeType) {
        return generateWithImages(
                systemPrompt, userPrompt, model, List.of(new ImagePart(imageBytes, mimeType)));
    }

    /**
     * 세로로 긴 배너처럼 한 장으로는 해상도가 부족한 이미지를 여러 조각으로 잘라 한 번의 요청에 순서대로 함께 보낸다. 비전 모델이 여러 이미지를 하나의 문서로 이해하고
     * 합성해 답하도록 {@code userPrompt}에서 순서를 설명해줘야 한다.
     */
    public String generateWithImages(
            String systemPrompt, String userPrompt, String model, List<ImagePart> images) {
        ensureAvailable();
        try {
            Media[] media =
                    images.stream()
                            .map(
                                    image ->
                                            new Media(
                                                    MimeType.valueOf(image.mimeType()),
                                                    new ByteArrayResource(image.bytes())))
                            .toArray(Media[]::new);
            String content =
                    chatClient
                            .prompt()
                            .system(systemPrompt)
                            .user(u -> u.text(userPrompt).media(media))
                            .options(buildOptions(model))
                            .call()
                            .content();
            return requireContent(content);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw translate(exception);
        }
    }

    public String generateWithImages(
            String systemPrompt,
            String userPrompt,
            String model,
            List<ImagePart> images,
            int maxOutputTokensOverride,
            Duration timeout) {
        ensureAvailable();
        return executeWithTimeout(
                () -> {
                    Media[] media =
                            images.stream()
                                    .map(
                                            image ->
                                                    new Media(
                                                            MimeType.valueOf(image.mimeType()),
                                                            new ByteArrayResource(image.bytes())))
                                    .toArray(Media[]::new);
                    String content =
                            chatClient
                                    .prompt()
                                    .system(systemPrompt)
                                    .user(u -> u.text(userPrompt).media(media))
                                    .options(buildOptions(model, maxOutputTokensOverride))
                                    .call()
                                    .content();
                    return requireContent(content);
                },
                timeout);
    }

    public record ImagePart(byte[] bytes, String mimeType) {}

    public String generateStreaming(
            String systemPrompt, String userPrompt, Consumer<String> onToken) {
        ensureAvailable();
        try {
            StringBuilder content = new StringBuilder();
            chatClient
                    .prompt()
                    .system(systemPrompt)
                    .user(userPrompt)
                    .options(buildOptions())
                    .stream()
                    .content()
                    .doOnNext(
                            token -> {
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
        if (apiKey.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "AI 기능을 사용하려면 NVIDIA API 키가 설정되어 있어야 합니다.");
        }
    }

    private OpenAiChatOptions buildOptions() {
        return buildOptions(model, maxOutputTokens);
    }

    private OpenAiChatOptions buildOptions(String modelOverride) {
        return buildOptions(modelOverride, maxOutputTokens);
    }

    private OpenAiChatOptions buildOptions(String modelOverride, int maxTokensOverride) {
        return buildOptions(modelOverride, maxTokensOverride, jsonResponseFormat);
    }

    private OpenAiChatOptions buildOptions(
            String modelOverride, int maxTokensOverride, boolean useJsonResponseFormat) {
        OpenAiChatOptions.Builder builder =
                OpenAiChatOptions.builder()
                        .model(modelOverride)
                        .temperature(0.2)
                        .topP(0.9)
                        .maxTokens(maxTokensOverride);
        if (useJsonResponseFormat) {
            // NVIDIA NIM의 Qwen3.5 엔드포인트는 response_format 지정 시 빈 응답을 반환해 기본값을 비활성으로 뒀었다.
            // Nemotron으로 교체 후 정상 동작 여부를 재검증하고 필요 시 true로 전환할 것.
            builder.responseFormat(new ResponseFormat(ResponseFormat.Type.JSON_OBJECT, null));
        }
        return builder.build();
    }

    private static String requireContent(String content) {
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "NVIDIA API가 빈 응답을 반환했습니다.");
        }
        return content;
    }

    private static ResponseStatusException translate(Exception exception) {
        String message = exception.getMessage() == null ? "" : exception.getMessage().toLowerCase();
        if (message.contains("429") || message.contains("rate limit")) {
            return new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "NVIDIA API 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.",
                    exception);
        }
        if (message.contains("timeout") || message.contains("timed out")) {
            return new ResponseStatusException(
                    HttpStatus.GATEWAY_TIMEOUT, "NVIDIA API 응답 시간이 초과되었습니다.", exception);
        }
        return new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Spring AI를 통한 NVIDIA API 호출에 실패했습니다. API 키와 모델 설정을 확인해주세요.",
                exception);
    }

    private <T> T executeWithRetry(java.util.function.Supplier<T> supplier) {
        int maxAttempts = 3;
        long backoffMs = 500;
        Exception lastException = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return supplier.get();
            } catch (ResponseStatusException exception) {
                throw exception;
            } catch (Exception exception) {
                lastException = exception;
                if (attempt < maxAttempts) {
                    try {
                        Thread.sleep(backoffMs);
                    } catch (InterruptedException interruptedException) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                    backoffMs *= 2;
                }
            }
        }
        throw translate(lastException);
    }

    private <T> T executeWithTimeout(java.util.concurrent.Callable<T> callable, Duration timeout) {
        FutureTask<T> task = new FutureTask<>(callable);
        Thread worker = Thread.ofVirtual().name("nvidia-nim-bounded-call").start(task);
        try {
            return task.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException exception) {
            task.cancel(true);
            worker.interrupt();
            throw new ResponseStatusException(
                    HttpStatus.GATEWAY_TIMEOUT,
                    "NVIDIA API가 제한 시간 " + timeout.toSeconds() + "초 안에 응답하지 않았습니다.",
                    exception);
        } catch (InterruptedException exception) {
            task.cancel(true);
            worker.interrupt();
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "NVIDIA API 호출이 중단되었습니다.", exception);
        } catch (ExecutionException exception) {
            Throwable cause = exception.getCause();
            if (cause instanceof ResponseStatusException responseStatusException) {
                throw responseStatusException;
            }
            if (cause instanceof Exception nestedException) {
                throw translate(nestedException);
            }
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "NVIDIA API 호출에 실패했습니다.", cause);
        }
    }
}
