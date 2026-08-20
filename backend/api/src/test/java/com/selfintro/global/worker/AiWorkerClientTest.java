package com.selfintro.global.worker;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class AiWorkerClientTest {

    @Test
    void sendsInternalTokenToWorker() throws Exception {
        AtomicReference<String> receivedToken = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext(
                "/internal/test",
                exchange -> {
                    receivedToken.set(
                            exchange.getRequestHeaders().getFirst("X-Internal-Worker-Token"));
                    byte[] response = "\"ok\"".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, response.length);
                    exchange.getResponseBody().write(response);
                    exchange.close();
                });
        server.start();

        try {
            AiWorkerClient client =
                    new AiWorkerClient(
                            "http://localhost:" + server.getAddress().getPort(),
                            "test-worker-token",
                            new ObjectMapper());

            assertThat(client.get("/internal/test", String.class)).isEqualTo("ok");
            assertThat(receivedToken).hasValue("test-worker-token");
        } finally {
            server.stop(0);
        }
    }
}
