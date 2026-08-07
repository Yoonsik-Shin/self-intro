package com.selfintro.portfolio.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.LlmDispatcher;
import com.selfintro.global.ai.PrintDraftStreamSupport;
import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudy;
import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudyRevision;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRepository;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRevisionRepository;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyContent;
import com.selfintro.modules.printtemplate.application.PrintTemplateService;
import com.selfintro.modules.printtemplate.domain.entity.PrintTemplate;
import com.selfintro.modules.printtemplate.domain.entity.PrintTemplateRevision;
import com.selfintro.modules.printtemplate.domain.repository.PrintTemplateRevisionRepository;
import com.selfintro.portfolio.presentation.dto.PortfolioPrintDraftResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
@RequiredArgsConstructor
@Slf4j
public class PortfolioPrintDraftService {

    private static final Duration AI_TIMEOUT = Duration.ofSeconds(90);
    private static final long STREAM_TIMEOUT_MILLIS = 360_000L;
    private static final int AI_MAX_OUTPUT_TOKENS = 4096;
    private static final Pattern NUMBER_PATTERN = Pattern.compile("\\d+(?:[.,]\\d+)?%?");
    private static final String SECTION_ORDER =
            "[\"problem\",\"thought\",\"tradeoffs\",\"solution\",\"outcome\",\"architecture\"]";

    private static final String SYSTEM_PROMPT =
            """
            당신은 포트폴리오 케이스스터디를 인쇄용 PDF 지면 분량으로 압축 편집하는 편집자다. 입력된
            케이스스터디 본문(problem/thoughtProcess/tradeoffs/solution/outcome/architecture)에 이미
            작성된 사실만 인정하고, 새로운 사실이나 수치를 만들어내지 않는다. 반드시 JSON 객체 하나만 반환한다.

            원칙:
            - 인덱스는 입력에 존재하는 값만 사용한다. 인덱스를 새로 만들지 않는다.
            - 지면에 맞춰 트레이드오프/성과 지표 중 가장 설득력 있는 것만 남긴다.
            - 아키텍처 다이어그램/이미지는 있으면 포함 여부만 결정한다(내용 자체는 바꾸지 않는다).
            - 문구 개선은 원문의 의미와 사실을 유지하고 짧고 구체적인 한국어로 쓴다.
            - 수치, 기간, 성과를 추측하거나 새로 만들지 않는다.
            - includedTradeoffIndexes, includedMetricIndexes는 반드시 JSON 숫자 배열이다.
            - decisions는 핵심 판단만 최대 15개, warnings는 최대 5개로 제한한다.

            응답 스키마:
            {
              "strategySummary":"이번 지면 구성 전략 1~3문장",
              "includedTradeoffIndexes":[0],
              "includedMetricIndexes":[0],
              "includeArchitecture":true,
              "contentOverrides":{"summary":"","problem":"","thoughtProcess":"","solution":"","outcomeSummary":""},
              "decisions":[{"itemType":"TRADEOFF|METRIC|ARCHITECTURE","itemId":"0","decision":"INCLUDE|EXCLUDE","reason":"근거"}],
              "warnings":["보완 또는 확인할 점"]
            }
            """;

    private static final String REVISION_SYSTEM_PROMPT =
            """
            당신은 이미 만들어진 포트폴리오 PDF 초안(currentDraft)과 사용자의 지적/보완 요청
            (feedbackInstruction)을 바탕으로, 원본 케이스스터디(caseStudy) 사실 범위 안에서 지면 구성을
            다시 조정하는 편집자다. 반드시 JSON 객체 하나만 반환한다.

            원칙:
            - 사용자의 feedbackInstruction을 최우선으로 반영해 currentDraft의 부족한 점을 적극 수정한다.
            - 인덱스는 입력에 존재하는 값만 사용한다. 인덱스를 새로 만들지 않는다.
            - 새로운 사실이나 수치를 만들어내지 않는다.
            - includedTradeoffIndexes, includedMetricIndexes는 반드시 JSON 숫자 배열이다.
            - decisions는 핵심 판단만 최대 15개, warnings는 최대 5개로 제한한다.

            응답 스키마:
            {
              "strategySummary":"이번 재구성에서 무엇을 어떻게 반영했는지 1~3문장",
              "includedTradeoffIndexes":[0],
              "includedMetricIndexes":[0],
              "includeArchitecture":true,
              "contentOverrides":{"summary":"","problem":"","thoughtProcess":"","solution":"","outcomeSummary":""},
              "decisions":[{"itemType":"TRADEOFF|METRIC|ARCHITECTURE","itemId":"0","decision":"INCLUDE|EXCLUDE","reason":"근거"}],
              "warnings":["보완 또는 확인할 점"]
            }
            """;

    private final PortfolioCaseStudyRepository caseStudyRepository;
    private final PortfolioCaseStudyRevisionRepository caseStudyRevisionRepository;
    private final LlmDispatcher llmDispatcher;
    private final PrintTemplateService printTemplateService;
    private final PrintTemplateRevisionRepository printTemplateRevisionRepository;
    private final PrintDraftStreamSupport printDraftStreamSupport;
    private final ObjectMapper objectMapper;

    public SseEmitter generateStream(
            Long caseStudyId, String orientation, String aiModel, String customModelName) {
        SseEmitter emitter = printDraftStreamSupport.createEmitter(STREAM_TIMEOUT_MILLIS, "포트폴리오 PDF 초안");
        Thread.ofVirtual()
                .name("portfolio-print-draft-stream")
                .start(
                        () ->
                                streamGenerate(
                                        caseStudyId, orientation, aiModel, customModelName, emitter));
        return emitter;
    }

    private void streamGenerate(
            Long caseStudyId,
            String orientation,
            String aiModel,
            String customModelName,
            SseEmitter emitter) {
        try {
            PortfolioPrintDraftResponse response =
                    generate(caseStudyId, orientation, aiModel, customModelName);
            printDraftStreamSupport.sendComplete(emitter, response);
        } catch (ResponseStatusException exception) {
            log.warn("AI 포트폴리오 PDF 초안 스트리밍 실패: {}", exception.getReason(), exception);
            printDraftStreamSupport.sendError(
                    emitter,
                    exception.getReason() == null ? "PDF 초안 생성에 실패했습니다." : exception.getReason());
        } catch (Exception exception) {
            log.warn("AI 포트폴리오 PDF 초안 스트리밍 중 예상하지 못한 오류", exception);
            printDraftStreamSupport.sendError(emitter, "PDF 초안 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
        }
    }

    public SseEmitter reviseStream(
            Long caseStudyId,
            Long templateId,
            String feedbackInstruction,
            String aiModel,
            String customModelName) {
        SseEmitter emitter = printDraftStreamSupport.createEmitter(STREAM_TIMEOUT_MILLIS, "포트폴리오 PDF 재생성");
        Thread.ofVirtual()
                .name("portfolio-print-draft-revise-stream")
                .start(
                        () ->
                                streamRevise(
                                        caseStudyId,
                                        templateId,
                                        feedbackInstruction,
                                        aiModel,
                                        customModelName,
                                        emitter));
        return emitter;
    }

    private void streamRevise(
            Long caseStudyId,
            Long templateId,
            String feedbackInstruction,
            String aiModel,
            String customModelName,
            SseEmitter emitter) {
        try {
            PortfolioPrintDraftResponse response =
                    revise(caseStudyId, templateId, feedbackInstruction, aiModel, customModelName);
            printDraftStreamSupport.sendComplete(emitter, response);
        } catch (ResponseStatusException exception) {
            log.warn("AI 포트폴리오 PDF 재생성 스트리밍 실패: {}", exception.getReason(), exception);
            printDraftStreamSupport.sendError(
                    emitter, exception.getReason() == null ? "PDF 재생성에 실패했습니다." : exception.getReason());
        } catch (Exception exception) {
            log.warn("AI 포트폴리오 PDF 재생성 스트리밍 중 예상하지 못한 오류", exception);
            printDraftStreamSupport.sendError(emitter, "PDF 재생성 중 오류가 발생했습니다. 다시 시도해주세요.");
        }
    }

    private PortfolioPrintDraftResponse generate(
            Long caseStudyId, String orientation, String aiModel, String customModelName) {
        PortfolioCaseStudy caseStudy = getPublishedCaseStudy(caseStudyId);
        PortfolioCaseStudyContent content = loadPublishedContent(caseStudy);

        String input = writeJson(content);
        String raw =
                llmDispatcher.generateJson(
                        SYSTEM_PROMPT, input, aiModel, customModelName, AI_MAX_OUTPUT_TOKENS, AI_TIMEOUT);
        JsonNode plan = parseJson(raw);

        DraftArtifacts artifacts = assemble(plan, content);
        String metadata = writeJson(buildMetadata(plan, artifacts));
        PrintTemplate template =
                printTemplateService.createPortfolioAiDraft(
                        caseStudyId,
                        caseStudy.getTitle(),
                        orientation,
                        writeJson(artifacts.excludedIds()),
                        SECTION_ORDER,
                        writeJson(artifacts.contentOverridesPayload()),
                        metadata);

        String strategySummary =
                AiJsonSupport.text(
                        plan, "strategySummary", "지면에 맞춰 핵심 트레이드오프와 성과를 우선 배치했습니다.", 1000);
        String modelLabel = llmDispatcher.resolveLabel(aiModel, customModelName);
        printTemplateRevisionRepository.save(
                PrintTemplateRevision.create(
                        template.getId(),
                        PrintTemplateRevision.SENDER_AI,
                        strategySummary,
                        modelLabel,
                        LocalDateTime.now()));

        return new PortfolioPrintDraftResponse(
                template.getId(),
                template.getName(),
                strategySummary,
                artifacts.includedCount(),
                artifacts.excludedIds().size(),
                decisions(plan),
                strings(plan.path("warnings")));
    }

    private PortfolioPrintDraftResponse revise(
            Long caseStudyId,
            Long templateId,
            String feedbackInstruction,
            String aiModel,
            String customModelName) {
        PortfolioCaseStudy caseStudy = getPublishedCaseStudy(caseStudyId);
        PortfolioCaseStudyContent content = loadPublishedContent(caseStudy);
        PrintTemplate current = printTemplateService.getOrThrow(templateId);

        String input = serializeRevisionInput(content, current, feedbackInstruction);
        String raw =
                llmDispatcher.generateJson(
                        REVISION_SYSTEM_PROMPT,
                        input,
                        aiModel,
                        customModelName,
                        AI_MAX_OUTPUT_TOKENS,
                        AI_TIMEOUT);
        JsonNode plan = parseJson(raw);

        DraftArtifacts artifacts = assemble(plan, content);
        String metadata = writeJson(buildMetadata(plan, artifacts));
        PrintTemplate template =
                printTemplateService.applyAiRevision(
                        templateId,
                        writeJson(artifacts.excludedIds()),
                        SECTION_ORDER,
                        current.getTargetRole(),
                        writeJson(artifacts.contentOverridesPayload()),
                        metadata);

        String strategySummary =
                AiJsonSupport.text(plan, "strategySummary", "피드백을 반영해 지면 구성을 다시 조정했습니다.", 1000);
        String modelLabel = llmDispatcher.resolveLabel(aiModel, customModelName);
        LocalDateTime now = LocalDateTime.now();
        if (AiJsonSupport.hasText(feedbackInstruction)) {
            printTemplateRevisionRepository.save(
                    PrintTemplateRevision.create(
                            templateId,
                            PrintTemplateRevision.SENDER_USER,
                            feedbackInstruction.trim(),
                            now));
        }
        printTemplateRevisionRepository.save(
                PrintTemplateRevision.create(
                        templateId, PrintTemplateRevision.SENDER_AI, strategySummary, modelLabel, now));

        return new PortfolioPrintDraftResponse(
                template.getId(),
                template.getName(),
                strategySummary,
                artifacts.includedCount(),
                artifacts.excludedIds().size(),
                decisions(plan),
                strings(plan.path("warnings")));
    }

    private PortfolioCaseStudy getPublishedCaseStudy(Long caseStudyId) {
        PortfolioCaseStudy caseStudy =
                caseStudyRepository
                        .findById(caseStudyId)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "존재하지 않는 케이스스터디입니다: " + caseStudyId));
        if (caseStudy.getPublishedRevisionId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "발행된 케이스스터디만 PDF 초안을 생성할 수 있습니다.");
        }
        return caseStudy;
    }

    private PortfolioCaseStudyContent loadPublishedContent(PortfolioCaseStudy caseStudy) {
        PortfolioCaseStudyRevision revision =
                caseStudyRevisionRepository
                        .findById(caseStudy.getPublishedRevisionId())
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "발행된 리비전을 찾을 수 없습니다: "
                                                        + caseStudy.getPublishedRevisionId()));
        try {
            return objectMapper.readValue(
                    revision.getContentJson(), PortfolioCaseStudyContent.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("케이스스터디 콘텐츠 파싱에 실패했습니다.", exception);
        }
    }

    private String serializeRevisionInput(
            PortfolioCaseStudyContent content, PrintTemplate current, String feedbackInstruction) {
        ObjectNode input = objectMapper.createObjectNode();
        input.set("caseStudy", objectMapper.valueToTree(content));

        ObjectNode currentDraft = objectMapper.createObjectNode();
        currentDraft.set("excludedIds", readJsonOrEmptyArray(current.getExcludedIds()));
        currentDraft.set("contentOverrides", readJsonOrEmptyObject(current.getContentOverrides()));
        input.set("currentDraft", currentDraft);
        input.put("feedbackInstruction", feedbackInstruction == null ? "" : feedbackInstruction.trim());
        return writeJson(input);
    }

    private DraftArtifacts assemble(JsonNode plan, PortfolioCaseStudyContent content) {
        int tradeoffCount = AiJsonSupport.safe(content.tradeoffs()).size();
        int metricCount = AiJsonSupport.safe(content.outcome().metrics()).size();
        int imageCount =
                content.architecture() == null
                        ? 0
                        : AiJsonSupport.safe(content.architecture().imageObjectKeys()).size();
        boolean hasMermaid =
                content.architecture() != null
                        && AiJsonSupport.hasText(content.architecture().mermaidSource());
        boolean hasArchitecture = hasMermaid || imageCount > 0;

        Set<Integer> includedTradeoffs = validIndexes(plan.path("includedTradeoffIndexes"), tradeoffCount);
        if (includedTradeoffs.isEmpty() && tradeoffCount > 0) includedTradeoffs = allIndexes(tradeoffCount);
        Set<Integer> includedMetrics = validIndexes(plan.path("includedMetricIndexes"), metricCount);
        if (includedMetrics.isEmpty() && metricCount > 0) includedMetrics = allIndexes(metricCount);
        JsonNode includeArchitectureNode = plan.path("includeArchitecture");
        boolean includeArchitecture =
                includeArchitectureNode.isMissingNode() || !includeArchitectureNode.isBoolean()
                        ? true
                        : includeArchitectureNode.asBoolean();

        LinkedHashSet<String> excluded = new LinkedHashSet<>();
        for (int i = 0; i < tradeoffCount; i++) {
            if (!includedTradeoffs.contains(i)) excluded.add("portfolio-tradeoff:" + i);
        }
        for (int i = 0; i < metricCount; i++) {
            if (!includedMetrics.contains(i)) excluded.add("portfolio-outcome-metric:" + i);
        }
        if (!includeArchitecture && hasArchitecture) {
            excluded.add("portfolio-architecture-header");
            if (hasMermaid) excluded.add("portfolio-architecture-diagram");
            for (int i = 0; i < imageCount; i++) excluded.add("portfolio-architecture-image:" + i);
        }

        JsonNode overrideCandidates = plan.path("contentOverrides");
        ObjectNode narrative = objectMapper.createObjectNode();
        copySafe(narrative, "summary", overrideCandidates, content.summary(), 200);
        copySafe(narrative, "problem", overrideCandidates, content.problem(), 1200);
        copySafe(narrative, "thoughtProcess", overrideCandidates, content.thoughtProcess(), 1500);
        copySafe(narrative, "solution", overrideCandidates, content.solution(), 1500);
        copySafe(narrative, "outcomeSummary", overrideCandidates, content.outcome().summary(), 800);

        ObjectNode payload = objectMapper.createObjectNode();
        payload.set("narrative", narrative);

        int includedCount =
                includedTradeoffs.size() + includedMetrics.size() + (includeArchitecture && hasArchitecture ? 1 : 0);
        return new DraftArtifacts(List.copyOf(excluded), payload, includedCount);
    }

    private void copySafe(
            ObjectNode target, String field, JsonNode candidate, String source, int maxLength) {
        String value = AiJsonSupport.text(candidate, field, null, maxLength);
        if (value != null && numbersAreGrounded(value, source)) target.put(field, value);
    }

    private boolean numbersAreGrounded(String rewritten, String source) {
        Set<String> sourceNumbers = numbers(source);
        return sourceNumbers.containsAll(numbers(rewritten));
    }

    private Set<String> numbers(String value) {
        Set<String> values = new LinkedHashSet<>();
        Matcher matcher = NUMBER_PATTERN.matcher(value == null ? "" : value);
        while (matcher.find()) values.add(matcher.group());
        return values;
    }

    private Set<Integer> validIndexes(JsonNode node, int count) {
        Set<Integer> values = new LinkedHashSet<>();
        if (!node.isArray()) return values;
        for (JsonNode value : node) {
            int idx = value.isIntegralNumber() ? value.asInt() : -1;
            if (idx >= 0 && idx < count) values.add(idx);
        }
        return values;
    }

    private Set<Integer> allIndexes(int count) {
        Set<Integer> values = new LinkedHashSet<>();
        for (int i = 0; i < count; i++) values.add(i);
        return values;
    }

    private ObjectNode buildMetadata(JsonNode plan, DraftArtifacts artifacts) {
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("strategySummary", AiJsonSupport.text(plan, "strategySummary", "", 1000));
        metadata.set("decisions", plan.path("decisions").deepCopy());
        metadata.set("warnings", plan.path("warnings").deepCopy());
        metadata.set("excludedIds", objectMapper.valueToTree(artifacts.excludedIds()));
        metadata.put("includedCount", artifacts.includedCount());
        metadata.put("fallbackUsed", plan.path("_fallbackUsed").asBoolean(false));
        return metadata;
    }

    private List<PortfolioPrintDraftResponse.Decision> decisions(JsonNode plan) {
        List<PortfolioPrintDraftResponse.Decision> values = new ArrayList<>();
        JsonNode nodes = plan.path("decisions");
        if (!nodes.isArray()) return values;
        for (JsonNode node : nodes) {
            values.add(
                    new PortfolioPrintDraftResponse.Decision(
                            AiJsonSupport.text(node, "itemType", "ITEM", 30),
                            AiJsonSupport.text(node, "itemId", "", 60),
                            AiJsonSupport.text(node, "decision", "INCLUDE", 20),
                            AiJsonSupport.text(node, "reason", "", 500)));
        }
        return values.stream().limit(30).toList();
    }

    private List<String> strings(JsonNode node) {
        if (!node.isArray()) return List.of();
        List<String> values = new ArrayList<>();
        for (JsonNode value : node) {
            if (value.isTextual() && !value.asText().isBlank()) values.add(value.asText().trim());
        }
        return values.stream().limit(10).toList();
    }

    JsonNode parseJson(String raw) {
        try {
            JsonNode parsed =
                    AiJsonSupport.parseJson(objectMapper, raw, JsonNode.class, "포트폴리오 PDF 초안");
            if (parsed.isObject()) return parsed;
            return fallbackPlan("AI가 JSON 객체가 아닌 형식으로 응답해 기본 선별 규칙을 적용했습니다.");
        } catch (JsonProcessingException | ResponseStatusException exception) {
            log.warn(
                    "AI 포트폴리오 PDF 초안 응답 파싱 실패. 기본 선별 규칙으로 계속합니다. responseLength={}, cause={}",
                    raw == null ? 0 : raw.length(),
                    exception.getMessage());
            return fallbackPlan("AI 응답이 불완전해 기본 선별 규칙으로 초안을 생성했습니다. 내용을 확인해 주세요.");
        }
    }

    private ObjectNode fallbackPlan(String warning) {
        ObjectNode fallback = objectMapper.createObjectNode();
        fallback.put("strategySummary", "AI 응답을 해석하지 못해 트레이드오프와 성과 지표를 모두 포함해 보수적으로 구성했습니다.");
        fallback.put("_fallbackUsed", true);
        fallback.putArray("warnings").add(warning);
        return fallback;
    }

    private JsonNode readJsonOrEmptyArray(String raw) {
        try {
            return raw == null || raw.isBlank() ? objectMapper.createArrayNode() : objectMapper.readTree(raw);
        } catch (JsonProcessingException exception) {
            return objectMapper.createArrayNode();
        }
    }

    private JsonNode readJsonOrEmptyObject(String raw) {
        try {
            return raw == null || raw.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(raw);
        } catch (JsonProcessingException exception) {
            return objectMapper.createObjectNode();
        }
    }

    private String writeJson(Object value) {
        return AiJsonSupport.writeJson(objectMapper, value);
    }

    private record DraftArtifacts(
            List<String> excludedIds, ObjectNode contentOverridesPayload, int includedCount) {}
}
