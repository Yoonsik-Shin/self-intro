package com.selfintro.modules.billing.infrastructure;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.billing.application.BillingProviderPort;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class TossBillingProvider implements BillingProviderPort {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String baseUrl;
    private final String authorization;

    public TossBillingProvider(
            ObjectMapper objectMapper,
            @Value("${app.billing.toss.base-url:https://api.tosspayments.com}") String baseUrl,
            @Value("${app.billing.toss.secret-key:}") String secretKey) {
        this.objectMapper = objectMapper;
        this.httpClient =
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(5))
                        .followRedirects(HttpClient.Redirect.NEVER)
                        .build();
        this.baseUrl = baseUrl;
        this.authorization =
                "Basic "
                        + Base64.getEncoder()
                                .encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public RegisteredMethod issueBillingMethod(String authKey, String customerKey) {
        JsonNode response =
                post(
                        "/v1/billing/authorizations/issue",
                        Map.of("authKey", authKey, "customerKey", customerKey),
                        null,
                        Duration.ofSeconds(15));
        JsonNode card = response.path("card");
        return new RegisteredMethod(
                required(response, "billingKey"),
                required(response, "customerKey"),
                "CARD",
                text(card, "issuerCode", text(card, "company", null)),
                text(card, "number", null));
    }

    @Override
    public ApprovedPayment charge(ChargeCommand command) {
        JsonNode response =
                post(
                        "/v1/billing/"
                                + URLEncoder.encode(command.billingKey(), StandardCharsets.UTF_8),
                        Map.of(
                                "customerKey",
                                command.customerKey(),
                                "amount",
                                command.amountKrw(),
                                "orderId",
                                command.orderId(),
                                "orderName",
                                command.orderName()),
                        command.idempotencyKey(),
                        Duration.ofSeconds(65));
        return payment(response);
    }

    @Override
    public ApprovedPayment query(String providerPaymentReference) {
        HttpRequest request =
                requestBuilder(
                                "/v1/payments/"
                                        + URLEncoder.encode(
                                                providerPaymentReference, StandardCharsets.UTF_8),
                                Duration.ofSeconds(10))
                        .GET()
                        .build();
        return payment(send(request));
    }

    @Override
    public ApprovedPayment queryOrder(String orderId) {
        HttpRequest request =
                requestBuilder(
                                "/v1/payments/orders/"
                                        + URLEncoder.encode(orderId, StandardCharsets.UTF_8),
                                Duration.ofSeconds(10))
                        .GET()
                        .build();
        return payment(send(request));
    }

    @Override
    public ApprovedPayment cancel(CancelCommand command) {
        if (command.amountKrw() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "취소 금액은 0원보다 커야 합니다.");
        }
        JsonNode response =
                post(
                        "/v1/payments/"
                                + URLEncoder.encode(command.paymentKey(), StandardCharsets.UTF_8)
                                + "/cancel",
                        Map.of(
                                "cancelReason", command.reason(),
                                "cancelAmount", command.amountKrw()),
                        command.idempotencyKey(),
                        Duration.ofSeconds(65));
        return payment(response);
    }

    @Override
    public void revokeBillingMethod(String billingKey) {
        HttpRequest request =
                requestBuilder(
                                "/v1/billing/"
                                        + URLEncoder.encode(billingKey, StandardCharsets.UTF_8),
                                Duration.ofSeconds(15))
                        .DELETE()
                        .build();
        send(request);
    }

    private JsonNode post(String path, Object body, String idempotencyKey, Duration timeout) {
        try {
            HttpRequest.Builder builder =
                    requestBuilder(path, timeout)
                            .header("Content-Type", "application/json")
                            .POST(
                                    HttpRequest.BodyPublishers.ofString(
                                            objectMapper.writeValueAsString(body)));
            if (idempotencyKey != null) {
                builder.header("Idempotency-Key", idempotencyKey);
            }
            return send(builder.build());
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw providerUnavailable();
        }
    }

    private HttpRequest.Builder requestBuilder(String path, Duration timeout) {
        if (authorization.equals("Basic Og==")) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "결제 공급자 설정이 완료되지 않았습니다.");
        }
        return HttpRequest.newBuilder(URI.create(baseUrl + path))
                .timeout(timeout)
                .header("Authorization", authorization);
    }

    private JsonNode send(HttpRequest request) {
        try {
            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY, "결제 공급자가 요청을 승인하지 않았습니다.");
            }
            if (response.body() == null || response.body().isBlank()) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(response.body());
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw providerUnavailable();
        }
    }

    private ApprovedPayment payment(JsonNode response) {
        String approvedAt = text(response, "approvedAt", null);
        return new ApprovedPayment(
                required(response, "paymentKey"),
                required(response, "orderId"),
                text(response, "lastTransactionKey", null),
                text(response, "method", null),
                required(response, "status"),
                response.path("totalAmount").asInt(),
                Math.max(
                        0,
                        response.path("totalAmount").asInt()
                                - response.path("balanceAmount")
                                        .asInt(response.path("totalAmount").asInt())),
                approvedAt == null ? null : OffsetDateTime.parse(approvedAt).toLocalDateTime());
    }

    private static String required(JsonNode node, String field) {
        String value = text(node, field, null);
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "결제 공급자 응답이 올바르지 않습니다.");
        }
        return value;
    }

    private static String text(JsonNode node, String field, String defaultValue) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? defaultValue : value.asText();
    }

    private static ResponseStatusException providerUnavailable() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "결제 공급자와 통신할 수 없습니다.");
    }
}
