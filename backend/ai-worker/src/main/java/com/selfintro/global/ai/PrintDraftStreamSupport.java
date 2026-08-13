package com.selfintro.global.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.UncheckedIOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * PDF 초안(이력서/포트폴리오) 생성·재생성 서비스들이 공유하는 SSE 보일러플레이트. 도메인별 큐레이션 로직(SYSTEM_PROMPT, assemble 등)은 각 서비스가
 * 독립적으로 갖고, 이 클래스는 "결과를 SSE로 어떻게 실어 보내는가"만 다룬다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PrintDraftStreamSupport {

    private final ObjectMapper objectMapper;

    public SseEmitter createEmitter(long timeoutMillis, String logLabel) {
        SseEmitter emitter = new SseEmitter(timeoutMillis);
        emitter.onTimeout(
                () -> {
                    log.info("{} SSE 스트림 타임아웃 발생", logLabel);
                    emitter.complete();
                });
        emitter.onError(ex -> log.debug("{} SSE 스트림 에러: {}", logLabel, ex.getMessage()));
        return emitter;
    }

    public void sendComplete(SseEmitter emitter, Object response) {
        send(emitter, new CompleteEvent("complete", response));
        emitter.complete();
    }

    public void sendError(SseEmitter emitter, String message) {
        try {
            send(emitter, new ErrorEvent("error", message));
            emitter.complete();
        } catch (RuntimeException ignored) {
        }
    }

    private void send(SseEmitter emitter, Object payload) {
        try {
            emitter.send(
                    SseEmitter.event()
                            .data(
                                    objectMapper.writeValueAsString(payload),
                                    MediaType.APPLICATION_JSON));
        } catch (IOException exception) {
            throw new UncheckedIOException("SSE 이벤트 전송에 실패했습니다.", exception);
        }
    }

    private record CompleteEvent(String type, Object response) {}

    private record ErrorEvent(String type, String message) {}
}
