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
                        HttpStatus.valueOf(response.statusCode()), response.body());
            }
            return objectMapper.readValue(response.body(), responseType);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to call worker GET {}", path, e);
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Worker service call failed: " + e.getMessage());
        }
    }

    public <T> T post(String path, Object requestBody, Class<T> responseType) {
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
                        HttpStatus.valueOf(response.statusCode()), response.body());
            }
            if (responseType == Void.class || response.body().isBlank()) {
                return null;
            }
            return objectMapper.readValue(response.body(), responseType);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to call worker POST {}", path, e);
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Worker service call failed: " + e.getMessage());
        }
    }

    public void pipePost(String path, Object requestBody, OutputStream outputStream) {
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
                return;
            }

            try (InputStream in = response.body()) {
                byte[] buffer = new byte[1024];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, read);
                    outputStream.flush();
                }
            }
        } catch (Exception e) {
            log.warn("Error piping SSE stream from worker path {}: {}", path, e.getMessage());
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
