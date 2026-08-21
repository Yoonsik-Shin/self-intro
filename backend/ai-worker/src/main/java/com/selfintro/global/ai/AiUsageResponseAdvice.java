package com.selfintro.global.ai;

import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@ControllerAdvice
public class AiUsageResponseAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(
            MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(
            Object body,
            MethodParameter returnType,
            MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> selectedConverterType,
            ServerHttpRequest request,
            ServerHttpResponse response) {
        try {
            ProviderUsageContext.current()
                    .ifPresent(
                            usage -> {
                                response.getHeaders().set("X-AI-Provider", usage.provider());
                                response.getHeaders().set("X-AI-Model", usage.model());
                                response.getHeaders()
                                        .set(
                                                "X-AI-Input-Tokens",
                                                Long.toString(usage.inputTokens()));
                                response.getHeaders()
                                        .set(
                                                "X-AI-Cached-Input-Tokens",
                                                Long.toString(usage.cachedInputTokens()));
                                response.getHeaders()
                                        .set(
                                                "X-AI-Output-Tokens",
                                                Long.toString(usage.outputTokens()));
                            });
            EvidencePacketContext.current()
                    .ifPresent(hash -> response.getHeaders().set("X-AI-Evidence-Hash", hash));
            return body;
        } finally {
            ProviderUsageContext.clear();
            EvidencePacketContext.clear();
        }
    }
}
