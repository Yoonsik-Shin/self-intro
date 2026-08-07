package com.selfintro.jobposting.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.selfintro.bff.application.BffService;
import com.selfintro.bff.presentation.dto.IntroductionResponse;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.LlmDispatcher;
import com.selfintro.modules.competency.presentation.dto.CompetencyResponse;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailResponse;
import com.selfintro.modules.experience.presentation.dto.ExperienceResponse;
import com.selfintro.jobposting.presentation.dto.JobPostingPrintDraftResponse;
import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPositionChoiceRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceImageRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import com.selfintro.modules.printtemplate.application.PrintTemplateService;
import com.selfintro.modules.printtemplate.domain.entity.PrintTemplate;
import com.selfintro.modules.profile.presentation.dto.ProfileResponse;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import com.selfintro.vectorsearch.application.RelevantProfileDigestService;
import com.selfintro.vectorsearch.application.RelevantProfileDigestService.RelevantMatches;
import com.selfintro.vectorsearch.application.RelevantProfileDigestService.TopK;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobPostingPrintDraftService {

    private static final Duration AI_TIMEOUT = Duration.ofSeconds(90);
    private static final long STREAM_TIMEOUT_MILLIS = 360_000L;
    private static final int AI_MAX_OUTPUT_TOKENS = 8192;
    private static final int PROJECT_RELEVANCE_TOP_K = 15;
    private static final Pattern NUMBER_PATTERN = Pattern.compile("\\d+(?:[.,]\\d+)?%?");
    private static final String SECTION_ORDER =
            "[\"skills\",\"competencies\",\"career\",\"projects\",\"credentials\",\"cover-letter\"]";

    private static final String SYSTEM_PROMPT =
            """
            당신은 한국 개발자 이력서 편집자다. 제공된 채용 공고와 후보자의 실제 경력 데이터만 사용해
            공고 맞춤 PDF 이력서 초안을 설계한다. 반드시 JSON 객체 하나만 반환한다.

            원칙:
            - ID는 입력에 존재하는 값만 사용한다. ID를 새로 만들지 않는다.
            - 프로젝트/성과/기술/역량은 공고 관련성과 증거 강도를 기준으로 선택한다.
            - 수치, 기간, 도구, 성과를 추측하거나 새로 만들지 않는다.
            - 문구 개선은 원문의 의미와 사실을 유지하고 짧고 구체적인 한국어로 쓴다.
            - 회사 경력 자체는 제거 대상이 아니며, 그 안의 프로젝트와 세부 성과만 선별한다.
            - selectedSkillIds, includedExperienceIds, includedDetailIds, includedCompetencyIds는 반드시 JSON 숫자 배열이다.
            - 원문과 동일한 문장은 override에 반복하지 말고, 실제로 개선할 항목만 넣는다.
            - experienceOverrides는 최대 8개, detailOverrides는 최대 12개, competencyOverrides는 최대 5개다.
            - decisions는 핵심 판단만 최대 20개, warnings는 최대 5개로 제한한다.

            응답 스키마:
            {
              "strategySummary":"초안 구성 전략 1~3문장",
              "targetRole":"60자 이하 목표 직무",
              "selectedSkillIds":[1],
              "includedExperienceIds":[1],
              "includedDetailIds":[1],
              "includedCompetencyIds":[1],
              "profile":{"jobTitle":"","bio":"","coreStackSummary":""},
              "experienceOverrides":[{"id":1,"summary":"","takeaway":"","role":""}],
              "detailOverrides":[{"id":1,"content":"","narrative":""}],
              "competencyOverrides":[{"id":1,"title":"","summary":""}],
              "decisions":[{"itemType":"PROJECT|DETAIL|SKILL|COMPETENCY","itemId":"1","decision":"INCLUDE|EXCLUDE","reason":"근거"}],
              "warnings":["보완 또는 확인할 점"]
            }
            """;

    private final JobPostingRepository jobPostingRepository;
    private final JobPostingSourceUrlRepository sourceUrlRepository;
    private final JobPostingPositionChoiceRepository positionChoiceRepository;
    private final JobPostingSourceImageRepository sourceImageRepository;
    private final BffService bffService;
    private final RelevantProfileDigestService relevantProfileDigestService;
    private final LlmDispatcher llmDispatcher;
    private final PrintTemplateService printTemplateService;
    private final ObjectMapper objectMapper;

    /**
     * generate()를 그대로 감싸되 Cloudflare 엣지 타임아웃(524)을 피하기 위해 SSE로 응답한다 —
     * 헤더가 즉시 나가므로 AI 호출이 90초를 넘겨도 요청이 끊기지 않는다(VectorBackfillOrchestrator와
     * 동일한 문제, JobApplicationUrlParseService.parseStream과 동일한 해법).
     */
    private SseEmitter createSseEmitter(long timeoutMillis) {
        SseEmitter emitter = new SseEmitter(timeoutMillis);
        emitter.onTimeout(() -> {
            log.info("PDF 초안 SSE 스트림 타임아웃 발생");
            emitter.complete();
        });
        emitter.onError(ex -> {
            log.debug("PDF 초안 SSE 스트림 에러: {}", ex.getMessage());
        });
        return emitter;
    }

    public SseEmitter generateStream(Long jobPostingId, String aiModel, String customModelName) {
        SseEmitter emitter = createSseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual()
                .name("job-posting-print-draft-stream")
                .start(() -> streamGenerate(jobPostingId, aiModel, customModelName, emitter));
        return emitter;
    }

    private void streamGenerate(Long jobPostingId, String aiModel, String customModelName, SseEmitter emitter) {
        try {
            JobPostingPrintDraftResponse response = generate(jobPostingId, aiModel, customModelName);
            send(emitter, new CompleteEvent("complete", response));
            emitter.complete();
        } catch (ResponseStatusException exception) {
            log.warn("AI PDF 초안 스트리밍 실패: {}", exception.getReason(), exception);
            fail(emitter, exception.getReason() == null ? "PDF 초안 생성에 실패했습니다." : exception.getReason());
        } catch (Exception exception) {
            log.warn("AI PDF 초안 스트리밍 중 예상하지 못한 오류", exception);
            fail(emitter, "PDF 초안 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
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

    private void fail(SseEmitter emitter, String message) {
        try {
            send(emitter, new ErrorEvent("error", message));
            emitter.complete();
        } catch (RuntimeException ignored) {
        }
    }

    private record CompleteEvent(String type, JobPostingPrintDraftResponse response) {}

    private record ErrorEvent(String type, String message) {}

    public JobPostingPrintDraftResponse generate(Long jobPostingId, String aiModel, String customModelName) {
        JobPosting postingEntity =
                jobPostingRepository
                        .findById(jobPostingId)
                        .orElseThrow(
                                () ->
                                        new jakarta.persistence.EntityNotFoundException(
                                                "존재하지 않는 채용 공고입니다: " + jobPostingId));
        JobPostingResponse posting =
                JobPostingResponse.from(
                        postingEntity,
                        sourceUrlRepository.findByJobPostingIdOrderByPrimaryDescCreatedAtAsc(
                                postingEntity.getId()),
                        positionChoiceRepository.findByJobPostingIdOrderByRankOrderAsc(
                                postingEntity.getId()),
                        sourceImageRepository.findByJobPostingIdOrderByDisplayOrderAsc(
                                postingEntity.getId()));
        IntroductionResponse introduction = bffService.getIntroduction();
        List<ExperienceResponse> relevantExperiences = filterRelevantExperiences(posting, introduction);
        String input = serializeInput(posting, introduction, relevantExperiences);
        String raw =
                llmDispatcher.generateJson(
                        SYSTEM_PROMPT, input, aiModel, customModelName, AI_MAX_OUTPUT_TOKENS, AI_TIMEOUT);
        JsonNode plan = parseJson(raw);

        DraftArtifacts artifacts = assemble(plan, introduction, relevantExperiences);
        String metadata = writeJson(buildMetadata(plan, artifacts));
        PrintTemplate template =
                printTemplateService.createAiDraft(
                        jobPostingId,
                        posting.companyName(),
                        posting.positionTitle(),
                        writeJson(artifacts.excludedIds()),
                        SECTION_ORDER,
                        "{}",
                        text(plan, "targetRole", posting.positionTitle(), 60),
                        writeJson(artifacts.contentOverrides()),
                        metadata);

        return new JobPostingPrintDraftResponse(
                template.getId(),
                template.getName(),
                text(plan, "strategySummary", "공고 관련성이 높은 경력과 성과를 우선 배치했습니다.", 1000),
                template.getTargetRole(),
                artifacts.includedCount(),
                artifacts.excludedIds().size(),
                decisions(plan),
                strings(plan.path("warnings")));
    }

    private String serializeInput(
            JobPostingResponse posting, IntroductionResponse introduction, List<ExperienceResponse> experiences) {
        ObjectNode input = objectMapper.createObjectNode();
        input.set("jobPosting", objectMapper.valueToTree(posting));
        input.set("profile", objectMapper.valueToTree(introduction.profile()));
        input.set("skills", objectMapper.valueToTree(introduction.skills()));
        input.set("experiences", objectMapper.valueToTree(experiences));
        input.set("coreProjects", objectMapper.valueToTree(introduction.coreProjects()));
        input.set("competencies", objectMapper.valueToTree(introduction.competencies()));
        return writeJson(input);
    }

    /**
     * 프로필 전체(경력/프로젝트)를 통째로 넣는 대신, 채용공고 요건과 하이브리드 검색으로 관련도 높은 프로젝트만 AI 선택 후보로 좁힌다. 회사 경력
     * 레코드 자체(type != PROJECT)와 고정 노출 대상인 core project는 관련도와 무관하게 항상 후보에 남긴다 — AI가 실제로 제거하는 건
     * 프로젝트/세부 성과뿐이라는 시스템 프롬프트 규칙과 같은 맥락이다. 벡터 인덱스가 비어 있으면 필터링 없이 전체를 그대로 넘긴다.
     */
    private List<ExperienceResponse> filterRelevantExperiences(
            JobPostingResponse posting, IntroductionResponse intro) {
        String queryText = JobPostingRetrievalQueryText.build(
                posting.positionTitle(), posting.jobDescription(), posting.requiredQualifications(), posting.preferredQualifications());
        RelevantMatches matches = relevantProfileDigestService.search(queryText, new TopK(PROJECT_RELEVANCE_TOP_K, 0));
        if (matches.isEmpty()) {
            return intro.experiences();
        }

        Set<Long> relevantIds =
                matches.experiences().stream()
                        .map(match -> match.item().getExperienceId())
                        .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<Long> coreProjectIds = new HashSet<>();
        intro.coreProjects().forEach(project -> coreProjectIds.add(project.id()));

        return intro.experiences().stream()
                .filter(
                        experience ->
                                !"PROJECT".equals(experience.type())
                                        || relevantIds.contains(experience.id())
                                        || coreProjectIds.contains(experience.id()))
                .toList();
    }

    private DraftArtifacts assemble(JsonNode plan, IntroductionResponse intro, List<ExperienceResponse> experiencesToConsider) {
        Map<Long, ExperienceResponse> experiences = new HashMap<>();
        Map<Long, ExperienceDetailResponse> details = new HashMap<>();
        for (ExperienceResponse experience : experiencesToConsider) {
            experiences.put(experience.id(), experience);
            for (ExperienceDetailResponse detail : experience.details()) {
                if (detail.visible()) details.put(detail.id(), detail);
            }
        }

        Set<Long> projectIds = new LinkedHashSet<>();
        experiencesToConsider.stream()
                .filter(experience -> "PROJECT".equals(experience.type()))
                .forEach(experience -> projectIds.add(experience.id()));
        Set<Long> coreProjectIds = new HashSet<>();
        intro.coreProjects().forEach(project -> coreProjectIds.add(project.id()));

        Set<Long> includedProjects = validIds(plan.path("includedExperienceIds"), projectIds);
        if (includedProjects.isEmpty()) includedProjects.addAll(projectIds);

        Set<Long> includedDetails = validIds(plan.path("includedDetailIds"), details.keySet());
        if (includedDetails.isEmpty()) {
            for (Long projectId : includedProjects) {
                ExperienceResponse project = experiences.get(projectId);
                if (project != null) {
                    project.details().stream()
                            .filter(ExperienceDetailResponse::visible)
                            .forEach(detail -> includedDetails.add(detail.id()));
                }
            }
        }

        Set<Long> skillIds = new LinkedHashSet<>();
        intro.skills().forEach(skill -> skillIds.add(skill.id()));
        Set<Long> selectedSkills = validIds(plan.path("selectedSkillIds"), skillIds);
        if (selectedSkills.isEmpty()) {
            intro.skills().stream()
                    .filter(SkillResponse::isCore)
                    .forEach(skill -> selectedSkills.add(skill.id()));
        }
        if (selectedSkills.isEmpty()) selectedSkills.addAll(skillIds);

        Set<Long> competencyIds = new LinkedHashSet<>();
        intro.competencies().forEach(competency -> competencyIds.add(competency.id()));
        Set<Long> includedCompetencies =
                validIds(plan.path("includedCompetencyIds"), competencyIds);
        if (includedCompetencies.isEmpty()) {
            intro.competencies().stream()
                    .limit(3)
                    .forEach(value -> includedCompetencies.add(value.id()));
        }

        LinkedHashSet<String> excluded = new LinkedHashSet<>();
        excluded.add("cover-letter");
        for (Long projectId : projectIds) {
            ExperienceResponse project = experiences.get(projectId);
            boolean included = includedProjects.contains(projectId);
            if (!included) {
                if (project.careerId() != null) excluded.add("career-project:" + projectId);
                if (coreProjectIds.contains(projectId))
                    excluded.add("project:" + projectAtomId(project));
                continue;
            }
            for (ExperienceDetailResponse detail : project.details()) {
                if (!detail.visible() || includedDetails.contains(detail.id())) continue;
                if (project.careerId() != null) excluded.add("career-detail:" + detail.id());
                if (coreProjectIds.contains(projectId))
                    excluded.add("project-detail:" + detail.id());
            }
        }
        for (Long competencyId : competencyIds) {
            if (!includedCompetencies.contains(competencyId)) {
                excluded.add("competency:" + competencyId);
            }
        }
        if (includedCompetencies.isEmpty()) excluded.add("competencies");
        if (coreProjectIds.stream().noneMatch(includedProjects::contains)) excluded.add("projects");

        ObjectNode overrides = objectMapper.createObjectNode();
        ArrayNode selectedSkillArray = overrides.putArray("selectedSkillIds");
        selectedSkills.forEach(selectedSkillArray::add);
        applyProfileOverride(overrides, plan.path("profile"), intro.profile());
        applyExperienceOverrides(overrides, plan.path("experienceOverrides"), experiences);
        applyDetailOverrides(overrides, plan.path("detailOverrides"), details);
        applyCompetencyOverrides(overrides, plan.path("competencyOverrides"), intro.competencies());

        int includedCount =
                includedProjects.size()
                        + includedDetails.size()
                        + selectedSkills.size()
                        + includedCompetencies.size();
        return new DraftArtifacts(List.copyOf(excluded), overrides, includedCount);
    }

    private void applyProfileOverride(
            ObjectNode root, JsonNode candidate, ProfileResponse original) {
        if (!candidate.isObject() || original == null) return;
        ObjectNode target = objectMapper.createObjectNode();
        copySafe(target, "jobTitle", candidate, original.jobTitle(), 80);
        copySafe(target, "bio", candidate, original.bio(), 500);
        copySafe(target, "coreStackSummary", candidate, original.coreStackSummary(), 120);
        if (!target.isEmpty()) root.set("profile", target);
    }

    private void applyExperienceOverrides(
            ObjectNode root, JsonNode candidates, Map<Long, ExperienceResponse> originals) {
        ObjectNode target = objectMapper.createObjectNode();
        if (candidates.isArray()) {
            for (JsonNode candidate : candidates) {
                ExperienceResponse original = originals.get(longValue(candidate.path("id")));
                if (original == null) continue;
                String source =
                        join(
                                original.title(),
                                original.summary(),
                                original.takeaway(),
                                original.role());
                ObjectNode fields = objectMapper.createObjectNode();
                copySafe(fields, "summary", candidate, source, 500);
                copySafe(fields, "takeaway", candidate, source, 500);
                copySafe(fields, "role", candidate, source, 100);
                if (!fields.isEmpty()) target.set(String.valueOf(original.id()), fields);
            }
        }
        if (!target.isEmpty()) root.set("experiences", target);
    }

    private void applyDetailOverrides(
            ObjectNode root, JsonNode candidates, Map<Long, ExperienceDetailResponse> originals) {
        ObjectNode target = objectMapper.createObjectNode();
        if (candidates.isArray()) {
            for (JsonNode candidate : candidates) {
                ExperienceDetailResponse original = originals.get(longValue(candidate.path("id")));
                if (original == null) continue;
                String source =
                        join(
                                original.content(),
                                original.situation(),
                                original.task(),
                                original.actionDetail(),
                                original.outcome(),
                                original.narrative());
                ObjectNode fields = objectMapper.createObjectNode();
                copySafe(fields, "content", candidate, source, 500);
                copySafe(fields, "narrative", candidate, source, 4000);
                if (!fields.isEmpty()) target.set(String.valueOf(original.id()), fields);
            }
        }
        if (!target.isEmpty()) root.set("details", target);
    }

    private void applyCompetencyOverrides(
            ObjectNode root, JsonNode candidates, List<CompetencyResponse> originals) {
        Map<Long, CompetencyResponse> byId = new HashMap<>();
        originals.forEach(value -> byId.put(value.id(), value));
        ObjectNode target = objectMapper.createObjectNode();
        if (candidates.isArray()) {
            for (JsonNode candidate : candidates) {
                CompetencyResponse original = byId.get(longValue(candidate.path("id")));
                if (original == null) continue;
                String source = join(original.title(), original.summary());
                ObjectNode fields = objectMapper.createObjectNode();
                copySafe(fields, "title", candidate, source, 120);
                copySafe(fields, "summary", candidate, source, 500);
                if (!fields.isEmpty()) target.set(String.valueOf(original.id()), fields);
            }
        }
        if (!target.isEmpty()) root.set("competencies", target);
    }

    private void copySafe(
            ObjectNode target, String field, JsonNode candidate, String source, int maxLength) {
        String value = text(candidate, field, null, maxLength);
        if (value != null && numbersAreGrounded(value, source)) target.put(field, value);
    }

    private boolean numbersAreGrounded(String rewritten, String source) {
        Set<String> sourceNumbers = numbers(source);
        return sourceNumbers.containsAll(numbers(rewritten));
    }

    private Set<String> numbers(String value) {
        Set<String> values = new HashSet<>();
        Matcher matcher = NUMBER_PATTERN.matcher(value == null ? "" : value);
        while (matcher.find()) values.add(matcher.group());
        return values;
    }

    private ObjectNode buildMetadata(JsonNode plan, DraftArtifacts artifacts) {
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("strategySummary", text(plan, "strategySummary", "", 1000));
        metadata.set("decisions", plan.path("decisions").deepCopy());
        metadata.set("warnings", plan.path("warnings").deepCopy());
        metadata.set("excludedIds", objectMapper.valueToTree(artifacts.excludedIds()));
        metadata.put("includedCount", artifacts.includedCount());
        metadata.put("fallbackUsed", plan.path("_fallbackUsed").asBoolean(false));
        return metadata;
    }

    private List<JobPostingPrintDraftResponse.Decision> decisions(JsonNode plan) {
        List<JobPostingPrintDraftResponse.Decision> values = new ArrayList<>();
        JsonNode nodes = plan.path("decisions");
        if (!nodes.isArray()) return values;
        for (JsonNode node : nodes) {
            values.add(
                    new JobPostingPrintDraftResponse.Decision(
                            text(node, "itemType", "ITEM", 30),
                            text(node, "itemId", "", 60),
                            text(node, "decision", "INCLUDE", 20),
                            text(node, "reason", "", 500)));
        }
        return values.stream().limit(30).toList();
    }

    private Set<Long> validIds(JsonNode node, Set<Long> validIds) {
        Set<Long> values = new LinkedHashSet<>();
        if (!node.isArray()) return values;
        for (JsonNode value : node) {
            long id = longValue(value);
            if (validIds.contains(id)) values.add(id);
        }
        return values;
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
                    AiJsonSupport.parseJson(objectMapper, raw, JsonNode.class, "AI PDF 초안");
            if (parsed.isObject()) return parsed;
            return fallbackPlan("AI가 JSON 객체가 아닌 형식으로 응답해 기본 선별 규칙을 적용했습니다.");
        } catch (JsonProcessingException | ResponseStatusException exception) {
            log.warn(
                    "AI PDF 초안 응답 파싱 실패. 기본 선별 규칙으로 계속합니다. responseLength={}, cause={}",
                    raw == null ? 0 : raw.length(),
                    exception.getMessage());
            return fallbackPlan("AI 응답이 불완전해 기본 선별 규칙으로 초안을 생성했습니다. 내용을 확인해 주세요.");
        }
    }

    private ObjectNode fallbackPlan(String warning) {
        ObjectNode fallback = objectMapper.createObjectNode();
        fallback.put("strategySummary", "AI 응답을 해석하지 못해 공개된 핵심 기술과 경력 항목을 중심으로 보수적으로 구성했습니다.");
        fallback.put("_fallbackUsed", true);
        fallback.putArray("warnings").add(warning);
        return fallback;
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("PDF 초안 JSON 직렬화에 실패했습니다.", exception);
        }
    }

    private String text(JsonNode node, String field, String fallback, int maxLength) {
        JsonNode value = node.path(field);
        if (!value.isValueNode()) return fallback;
        String result = value.asText().trim();
        if (result.isBlank()) return fallback;
        return result.length() > maxLength ? result.substring(0, maxLength) : result;
    }

    private long longValue(JsonNode node) {
        if (node.isIntegralNumber()) return node.asLong();
        try {
            return Long.parseLong(node.asText());
        } catch (NumberFormatException exception) {
            return -1;
        }
    }

    private String projectAtomId(ExperienceResponse project) {
        return project.slug() == null || project.slug().isBlank()
                ? String.valueOf(project.id())
                : project.slug();
    }

    private String join(String... values) {
        return String.join(
                " ",
                java.util.Arrays.stream(values)
                        .filter(value -> value != null && !value.isBlank())
                        .toList());
    }

    private record DraftArtifacts(
            List<String> excludedIds, ObjectNode contentOverrides, int includedCount) {}
}
