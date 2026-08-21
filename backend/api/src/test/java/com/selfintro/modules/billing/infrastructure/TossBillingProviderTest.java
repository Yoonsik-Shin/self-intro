package com.selfintro.modules.billing.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.billing.application.BillingProviderPort;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class TossBillingProviderTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void cancelsExactAmountWithIdempotencyKey() throws Exception {
        AtomicReference<String> method = new AtomicReference<>();
        AtomicReference<String> idempotencyKey = new AtomicReference<>();
        AtomicReference<JsonNode> body = new AtomicReference<>();
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(
                "/v1/payments/pay_123/cancel",
                exchange -> {
                    method.set(exchange.getRequestMethod());
                    idempotencyKey.set(exchange.getRequestHeaders().getFirst("Idempotency-Key"));
                    body.set(objectMapper.readTree(exchange.getRequestBody()));
                    respond(
                            exchange,
                            """
                            {
                              "paymentKey":"pay_123",
                              "orderId":"si_order123",
                              "lastTransactionKey":"tx_123",
                              "method":"카드",
                              "status":"PARTIAL_CANCELED",
                              "totalAmount":9900,
                              "balanceAmount":4900,
                              "approvedAt":"2026-08-21T15:53:52+09:00"
                            }
                            """);
                });
        server.start();
        TossBillingProvider provider =
                new TossBillingProvider(
                        objectMapper,
                        "http://127.0.0.1:" + server.getAddress().getPort(),
                        "test_sk_example");

        BillingProviderPort.ApprovedPayment payment =
                provider.cancel(
                        new BillingProviderPort.CancelCommand(
                                "pay_123", 5_000, "운영자 승인 부분 환불", "refund-1"));

        assertThat(method.get()).isEqualTo("POST");
        assertThat(idempotencyKey.get()).isEqualTo("refund-1");
        assertThat(body.get().path("cancelReason").asText()).isEqualTo("운영자 승인 부분 환불");
        assertThat(body.get().path("cancelAmount").asInt()).isEqualTo(5_000);
        assertThat(payment.status()).isEqualTo("PARTIAL_CANCELED");
        assertThat(payment.canceledAmountKrw()).isEqualTo(5_000);
    }

    private static void respond(HttpExchange exchange, String response) throws IOException {
        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
