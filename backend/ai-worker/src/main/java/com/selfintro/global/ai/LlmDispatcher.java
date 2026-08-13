package com.selfintro.global.ai;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 자소서 생성에만 있던 LLM provider(NVIDIA/Claude/Gemini/OpenAI) 선택 로직을 공통화한 라우터. 요청에 {@code aiModel}이 없으면
 * NVIDIA NIM(기본 모델)으로 라우팅한다.
 */
@Component
@RequiredArgsConstructor
public class LlmDispatcher {

    private final NvidiaNimClient nvidiaNimClient;
    private final ClaudeAiClient claudeAiClient;
    private final GeminiAiClient geminiAiClient;
    private final OpenAiClient openAiClient;

    public String resolveLabel(String aiModel, String customModelName) {
        if (aiModel == null || aiModel.isBlank()) return "Nvidia NIM";
        return switch (aiModel.toUpperCase()) {
            case "CLAUDE_3_5_SONNET", "CLAUDE_3_7_SONNET", "CLAUDE" -> "Claude Sonnet 5";
            case "GEMINI_2_FLASH" -> "Gemini 2.0 Flash";
            case "GEMINI_3_6_FLASH" -> "Gemini 3.6 Flash";
            case "GEMINI_3_1_FLASH_LITE", "GEMINI" -> "Gemini 3.1 Flash-Lite";
            case "O3_MINI" -> "OpenAI o3-mini";
            case "GPT_5_4_NANO" -> "GPT-5.4 Nano";
            case "GPT_5_4_MINI", "GPT_4O", "GPT" -> "GPT-5.4 Mini";
            case "CUSTOM" ->
                    (customModelName != null && !customModelName.isBlank())
                            ? customModelName
                            : "Custom LLM";
            default -> "Nvidia NIM";
        };
    }

    /** 자유 텍스트 생성 — 자소서 초안, 어필 분석 등 비-JSON 응답에서 사용. */
    public String generate(
            String systemPrompt, String userPrompt, String aiModel, String customModelName) {
        String modelKey = normalize(aiModel);
        return switch (modelKey) {
            case "CLAUDE_3_5_SONNET", "CLAUDE_3_7_SONNET", "CLAUDE" ->
                    claudeAiClient.generate(systemPrompt, userPrompt, "claude-sonnet-5");
            case "GEMINI_3_6_FLASH" ->
                    geminiAiClient.generate(systemPrompt, userPrompt, "gemini-3.6-flash");
            case "GEMINI_3_1_FLASH_LITE", "GEMINI" ->
                    geminiAiClient.generate(systemPrompt, userPrompt, "gemini-3.1-flash-lite");
            case "GPT_5_4_NANO" -> openAiClient.generate(systemPrompt, userPrompt, "gpt-5.4-nano");
            case "GPT_5_4_MINI", "GPT_4O", "GPT" ->
                    openAiClient.generate(systemPrompt, userPrompt, "gpt-5.4-mini");
            case "CUSTOM" ->
                    dispatchCustom(systemPrompt, userPrompt, customModelName, false, 0, null);
            default -> nvidiaNimClient.generate(systemPrompt, userPrompt);
        };
    }

    /**
     * JSON 강제 응답 생성 — GapProject/PrintDraft처럼 구조화 응답 파싱이 필요한 곳에서 사용. Claude/Gemini는 네이티브 강제모드가 없어
     * 시스템 프롬프트 지시문(ClaudeAiClient) 또는 responseMimeType(GeminiAiClient)으로 흉내낸다.
     */
    public String generateJson(
            String systemPrompt,
            String userPrompt,
            String aiModel,
            String customModelName,
            int maxOutputTokens,
            Duration timeout) {
        String modelKey = normalize(aiModel);
        return switch (modelKey) {
            case "CLAUDE_3_5_SONNET", "CLAUDE_3_7_SONNET", "CLAUDE" ->
                    claudeAiClient.generateJson(systemPrompt, userPrompt, "claude-sonnet-5");
            case "GEMINI_3_6_FLASH" ->
                    geminiAiClient.generateJson(systemPrompt, userPrompt, "gemini-3.6-flash");
            case "GEMINI_3_1_FLASH_LITE", "GEMINI" ->
                    geminiAiClient.generateJson(systemPrompt, userPrompt, "gemini-3.1-flash-lite");
            case "GPT_5_4_NANO" ->
                    openAiClient.generateJson(systemPrompt, userPrompt, "gpt-5.4-nano");
            case "GPT_5_4_MINI", "GPT_4O", "GPT" ->
                    openAiClient.generateJson(systemPrompt, userPrompt, "gpt-5.4-mini");
            case "CUSTOM" ->
                    dispatchCustom(
                            systemPrompt,
                            userPrompt,
                            customModelName,
                            true,
                            maxOutputTokens,
                            timeout);
            default ->
                    nvidiaNimClient.generateJsonOnce(
                            systemPrompt, userPrompt, maxOutputTokens, timeout);
        };
    }

    private String normalize(String aiModel) {
        return aiModel != null && !aiModel.isBlank() ? aiModel.toUpperCase() : "NVIDIA_NIM";
    }

    private String dispatchCustom(
            String systemPrompt,
            String userPrompt,
            String customModelName,
            boolean forceJson,
            int maxOutputTokens,
            Duration timeout) {
        if (customModelName == null || customModelName.isBlank()) {
            throw new IllegalArgumentException("커스텀 모델명을 입력해 주세요.");
        }
        if (customModelName.startsWith("claude")) {
            return forceJson
                    ? claudeAiClient.generateJson(systemPrompt, userPrompt, customModelName)
                    : claudeAiClient.generate(systemPrompt, userPrompt, customModelName);
        }
        if (customModelName.startsWith("gemini")) {
            return forceJson
                    ? geminiAiClient.generateJson(systemPrompt, userPrompt, customModelName)
                    : geminiAiClient.generate(systemPrompt, userPrompt, customModelName);
        }
        return forceJson
                ? openAiClient.generateJson(systemPrompt, userPrompt, customModelName)
                : openAiClient.generate(systemPrompt, userPrompt, customModelName);
    }
}
