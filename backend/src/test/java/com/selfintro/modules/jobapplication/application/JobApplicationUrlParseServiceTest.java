package com.selfintro.modules.jobapplication.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.NvidiaNimClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class JobApplicationUrlParseServiceTest {

    @Test
    void throwsServiceUnavailableWhenDisabled() {
        JobApplicationUrlParseService service =
                new JobApplicationUrlParseService(
                        mock(NvidiaNimClient.class), new ObjectMapper(), false);

        assertThatThrownBy(() -> service.parse("https://example.com/posting"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(
                        exception ->
                                org.assertj.core.api.Assertions.assertThat(
                                                ((ResponseStatusException) exception)
                                                        .getStatusCode())
                                        .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }

    @Test
    void rejectsNonHttpScheme() {
        JobApplicationUrlParseService service =
                new JobApplicationUrlParseService(
                        mock(NvidiaNimClient.class), new ObjectMapper(), true);

        assertThatThrownBy(() -> service.parse("ftp://example.com/posting"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(
                        exception ->
                                org.assertj.core.api.Assertions.assertThat(
                                                ((ResponseStatusException) exception)
                                                        .getStatusCode())
                                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void rejectsMalformedUrl() {
        JobApplicationUrlParseService service =
                new JobApplicationUrlParseService(
                        mock(NvidiaNimClient.class), new ObjectMapper(), true);

        assertThatThrownBy(() -> service.parse("not a url"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(
                        exception ->
                                org.assertj.core.api.Assertions.assertThat(
                                                ((ResponseStatusException) exception)
                                                        .getStatusCode())
                                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
