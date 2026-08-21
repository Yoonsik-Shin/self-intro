package com.selfintro.global.ai;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AiProviderRouter {

    private final NvidiaNimClient nvidiaNimClient;
    private final ClaudeAiClient claudeAiClient;
    private final GeminiAiClient geminiAiClient;
    private final OpenAiClient openAiClient;
    private final AiPromptPolicy promptPolicy;
    private final WorkspaceAiCredentialResolver credentialResolver;

    @Value("${app.ai.usage.enforcement-enabled:false}")
    private boolean enforcementEnabled;

    public String resolveLabel(String aiModel, String customModelName) {
        String modelKey = normalize(aiModel);
        return switch (modelKey) {
            case "CLAUDE_3_5_SONNET", "CLAUDE_3_7_SONNET", "CLAUDE" -> "Claude Sonnet 5";
            case "GEMINI_2_FLASH" -> "Gemini 2.0 Flash";
            case "GEMINI_3_6_FLASH" -> "Gemini 3.6 Flash";
            case "GEMINI_3_1_FLASH_LITE", "GEMINI" -> "Gemini 3.1 Flash-Lite";
            case "O3_MINI" -> "OpenAI o3-mini";
            case "GPT_5_4_NANO" -> "GPT-5.4 Nano";
            case "GPT_5_4_MINI", "GPT_4O", "GPT" -> "GPT-5.4 Mini";
            case "CUSTOM" -> customLabel(customModelName);
            default -> "Nvidia NIM";
        };
    }

    public String generate(
            String systemPrompt, String userPrompt, String aiModel, String customModelName) {
        var prepared = promptPolicy.prepare(systemPrompt, userPrompt);
        systemPrompt = prepared.systemPrompt();
        userPrompt = prepared.userPrompt();
        var credential = credentialResolver.current();
        if (credential.isPresent()) {
            return dispatchByok(systemPrompt, userPrompt, credential.get(), false);
        }
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
            case "CUSTOM" -> dispatchCustom(systemPrompt, userPrompt, customModelName, false);
            default -> nvidiaNimClient.generate(systemPrompt, userPrompt);
        };
    }

    public String generateJson(
            String systemPrompt,
            String userPrompt,
            String aiModel,
            String customModelName,
            int maxOutputTokens,
            Duration timeout) {
        var prepared = promptPolicy.prepare(systemPrompt, userPrompt);
        systemPrompt = prepared.systemPrompt();
        userPrompt = prepared.userPrompt();
        var credential = credentialResolver.current();
        if (credential.isPresent()) {
            return dispatchByok(systemPrompt, userPrompt, credential.get(), true);
        }
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
            case "CUSTOM" -> dispatchCustom(systemPrompt, userPrompt, customModelName, true);
            default ->
                    nvidiaNimClient.generateJsonOnce(
                            systemPrompt, userPrompt, maxOutputTokens, timeout);
        };
    }

    private String normalize(String aiModel) {
        return aiModel != null && !aiModel.isBlank() ? aiModel.toUpperCase() : "NVIDIA_NIM";
    }

    private String customLabel(String customModelName) {
        requireCustomAllowed(customModelName);
        return customModelName;
    }

    private String dispatchCustom(
            String systemPrompt, String userPrompt, String customModelName, boolean forceJson) {
        requireCustomAllowed(customModelName);
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

    private String dispatchByok(
            String systemPrompt,
            String userPrompt,
            WorkspaceAiCredentialResolver.Credential credential,
            boolean forceJson) {
        return switch (credential.provider().toUpperCase()) {
            case "OPENAI" ->
                    forceJson
                            ? openAiClient.generateJsonWithApiKey(
                                    systemPrompt, userPrompt, "gpt-5.4-mini", credential.apiKey())
                            : openAiClient.generateWithApiKey(
                                    systemPrompt, userPrompt, "gpt-5.4-mini", credential.apiKey());
            case "ANTHROPIC" ->
                    forceJson
                            ? claudeAiClient.generateJsonWithApiKey(
                                    systemPrompt,
                                    userPrompt,
                                    "claude-sonnet-5",
                                    credential.apiKey())
                            : claudeAiClient.generateWithApiKey(
                                    systemPrompt,
                                    userPrompt,
                                    "claude-sonnet-5",
                                    credential.apiKey());
            case "GEMINI" ->
                    forceJson
                            ? geminiAiClient.generateJsonWithApiKey(
                                    systemPrompt,
                                    userPrompt,
                                    "gemini-3.1-flash-lite",
                                    credential.apiKey())
                            : geminiAiClient.generateWithApiKey(
                                    systemPrompt,
                                    userPrompt,
                                    "gemini-3.1-flash-lite",
                                    credential.apiKey());
            default -> throw new AiPolicyViolationException("지원하지 않는 AI 제공업체입니다.");
        };
    }

    private void requireCustomAllowed(String customModelName) {
        if (enforcementEnabled) {
            throw new AiPolicyViolationException("사용자 지정 모델은 허용되지 않습니다.");
        }
        if (customModelName == null || customModelName.isBlank()) {
            throw new IllegalArgumentException("커스텀 모델명을 입력해 주세요.");
        }
    }
}
