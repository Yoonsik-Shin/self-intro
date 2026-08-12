package com.selfintro.global.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler();

    @Test
    @DisplayName("AsyncRequestTimeoutException 발생 시 503 SERVICE_UNAVAILABLE과 본문 없음(Void)을 반환한다")
    void handleAsyncRequestTimeoutException() {
        AsyncRequestTimeoutException ex = new AsyncRequestTimeoutException();

        ResponseEntity<Void> response = exceptionHandler.handleAsyncRequestTimeoutException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).isNull();
    }

    @Test
    void missingApiResourceReturnsNotFoundInsteadOfInternalServerError() {
        NoResourceFoundException exception =
                new NoResourceFoundException(HttpMethod.GET, "api/bff/introduction");

        ResponseEntity<ErrorResponse> response =
                exceptionHandler.handleNoResourceFoundException(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(HttpStatus.NOT_FOUND.value());
    }
}
