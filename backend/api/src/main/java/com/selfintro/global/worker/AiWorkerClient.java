package com.selfintro.global.worker;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Component
public class AiWorkerClient {

    private final String workerBaseUrl;
    private final String internalToken;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public AiWorkerClient(
            @Value("${app.worker.base-url:http://localhost:8081}") String workerBaseUrl,
            @Value("${app.worker.internal-token:}") String internalToken,
            ObjectMapper objectMapper) {
        this.workerBaseUrl =
                workerBaseUrl.endsWith("/")
                        ? workerBaseUrl.substring(0, workerBaseUrl.length() - 1)
                        : workerBaseUrl;
        this.objectMapper = objectMapper;
        this.internalToken = internalToken;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    public <T> T get(String path, Class<T> responseType) {
        AiWorkerUsageContext.clear();
        try {
            HttpRequest request =
                    workerRequest(path)
                            .timeout(Duration.ofSeconds(300))
                            .header("Accept", "application/json")
                            .GET()
                            .build();

            HttpResponse<String> response =
                    httpClient.send(
                            request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                throw new ResponseStatusException(
                        HttpStatus.valueOf(response.statusCode()), "Worker 요청을 처리하지 못했습니다.");
            }
            AiWorkerUsageContext.capture(response.headers());
            return objectMapper.readValue(response.body(), responseType);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Worker GET failed for path {} with {}", path, e.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI Worker 연결에 실패했습니다.");
        }
    }

    public <T> T post(String path, Object requestBody, Class<T> responseType) {
        AiWorkerUsageContext.clear();
        try {
            String json = requestBody != null ? objectMapper.writeValueAsString(requestBody) : "";
            HttpRequest request =
                    workerRequest(path)
                            .timeout(Duration.ofSeconds(300))
                            .header("Content-Type", "application/json")
                            .header("Accept", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                            .build();

            HttpResponse<String> response =
                    httpClient.send(
                            request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                throw new ResponseStatusException(
                        HttpStatus.valueOf(response.statusCode()), "Worker 요청을 처리하지 못했습니다.");
            }
            AiWorkerUsageContext.capture(response.headers());
            if (responseType == Void.class || response.body().isBlank()) {
                return null;
            }
            return objectMapper.readValue(response.body(), responseType);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Worker POST failed for path {} with {}", path, e.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI Worker 연결에 실패했습니다.");
        }
    }

    public void pipePost(String path, Object requestBody, OutputStream outputStream) {
        AiWorkerUsageContext.clear();
        try {
            String json = requestBody != null ? objectMapper.writeValueAsString(requestBody) : "";
            HttpRequest request =
                    workerRequest(path)
                            .timeout(Duration.ofMinutes(7))
                            .header("Content-Type", "application/json")
                            .header("Accept", "text/event-stream")
                            .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                            .build();

            HttpResponse<InputStream> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() >= 400) {
                log.warn("Worker SSE returned non-OK status: {}", response.statusCode());
                throw new ResponseStatusException(
                        HttpStatus.valueOf(response.statusCode()), "Worker 스트리밍 요청을 처리하지 못했습니다.");
            }

            try (InputStream in = response.body()) {
                byte[] buffer = new byte[1024];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, read);
                    outputStream.flush();
                }
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Worker SSE failed for path {} with {}", path, e.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI Worker 스트리밍 연결에 실패했습니다.");
        }
    }

    private HttpRequest.Builder workerRequest(String path) {
        HttpRequest.Builder builder =
                HttpRequest.newBuilder().uri(URI.create(workerBaseUrl + path));
        if (!internalToken.isBlank()) {
            builder.header("X-Internal-Worker-Token", internalToken);
        }
        return builder;
    }
}
