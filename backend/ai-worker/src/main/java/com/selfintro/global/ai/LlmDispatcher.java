package com.selfintro.global.ai;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * @deprecated 새 호출은 {@link AiProviderRouter}를 직접 사용한다.
 */
@Deprecated(forRemoval = false)
@Component
@RequiredArgsConstructor
public class LlmDispatcher {

    private final AiProviderRouter router;

    public String resolveLabel(String aiModel, String customModelName) {
        return router.resolveLabel(aiModel, customModelName);
    }

    public String generate(
            String systemPrompt, String userPrompt, String aiModel, String customModelName) {
        return router.generate(systemPrompt, userPrompt, aiModel, customModelName);
    }

    public String generateJson(
            String systemPrompt,
            String userPrompt,
            String aiModel,
            String customModelName,
            int maxOutputTokens,
            Duration timeout) {
        return router.generateJson(
                systemPrompt, userPrompt, aiModel, customModelName, maxOutputTokens, timeout);
    }
}
