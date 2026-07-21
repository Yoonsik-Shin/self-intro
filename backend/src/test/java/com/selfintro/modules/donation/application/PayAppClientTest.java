package com.selfintro.modules.donation.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;

class PayAppClientTest {

    @Test
    void parsesSuccessResponse() {
        Map<String, String> parsed =
                PayAppClient.parse(
                        "state=1&mul_no=12345678&payurl=https%3A%2F%2Fpayapp.kr%2FL%2Fabcdef");

        assertThat(parsed)
                .containsEntry("state", "1")
                .containsEntry("mul_no", "12345678")
                .containsEntry("payurl", "https://payapp.kr/L/abcdef");
    }

    @Test
    void parsesErrorResponse() {
        Map<String, String> parsed =
                PayAppClient.parse(
                        "state=0&errorMessage=%EC%9E%98%EB%AA%BB%EB%90%9C+%EC%9A%94%EC%B2%AD");

        assertThat(parsed).containsEntry("state", "0").containsEntry("errorMessage", "잘못된 요청");
    }

    @Test
    void parseHandlesBlankAndMalformedInput() {
        assertThat(PayAppClient.parse(null)).isEmpty();
        assertThat(PayAppClient.parse("")).isEmpty();
        assertThat(PayAppClient.parse("noseparator&=nokey&key=value"))
                .hasSize(1)
                .containsEntry("key", "value");
    }
}
