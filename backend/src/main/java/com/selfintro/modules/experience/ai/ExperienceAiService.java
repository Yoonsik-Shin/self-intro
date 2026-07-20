package com.selfintro.modules.experience.ai;

import static com.selfintro.modules.ai.AiJsonSupport.blankToNull;
import static com.selfintro.modules.ai.AiJsonSupport.hasText;
import static com.selfintro.modules.ai.AiJsonSupport.limit;
import static com.selfintro.modules.ai.AiJsonSupport.safe;
import static com.selfintro.modules.ai.AiJsonSupport.select;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.ai.AiJsonSupport;
import com.selfintro.modules.ai.NvidiaNimClient;
import com.selfintro.modules.experience.domain.Experience;
import com.selfintro.modules.experience.domain.ExperienceRepository;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeResponse;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionResponse;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.study.entity.Study;
import com.selfintro.study.repository.StudyRepository;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@Service
@Transactional(readOnly = true)
public class ExperienceAiService {
    private static final String FACT_CONSOLIDATOR_PROMPT = """
        당신은 개발자의 이력·경력 회고 글을 쓰기 전에 사실관계를 정리하는 편집 보조입니다.
        입력에 주어진 이력 유형·기본 정보, 선택한 기술/관련 Study/관련 경력 요약, 사용자가 작성한 메모만 사실로 인정하세요.
        메모는 사용자가 직접 제공한 사실로 신뢰하되, 메모에도 입력 데이터에도 없는 수치·고유명사·성과를 새로 만들어내지 마세요.
        각 사실에는 근거가 된 스킬/Study/관련 경력 ID를 표시하고, 메모에서만 나온 사실은 ID를 모두 비워두세요.
        ID는 입력 데이터에 있는 값만 사용하세요.
        각 사실은 상황(situation), 행동(action), 성과(outcome), 배경(context) 중 어떤 관점인지 aspect로 구분하세요.
        설명이나 마크다운 없이 반드시 아래 JSON 구조만 반환하세요.
        {"facts":[{"skillId":null,"studyId":null,"experienceId":null,"aspect":"situation|action|outcome|context","text":""}],"reason":""}
        """;

    private static final String EXPERIENCE_WRITER_PROMPT = """
        당신은 한국어로 개발자 이력서의 경력 회고를 작성하는 편집자입니다.
        입력으로 전달된 검증 완료 facts만 근거로 사용하세요. 새로운 사실을 추측하거나 만들지 마세요.
        summary는 300자 이하, takeaway는 500자 이하로 핵심 배운 점을 요약하세요.
        details는 상황(situation)-행동(actionDetail)-성과(outcome) 구조의 불릿을 최대 3개 작성하고,
        각 불릿의 content는 한 줄 요약이어야 하며 skillIds는 facts에 등장한 관련 기술 ID만 포함하세요.
        후보는 1개만 작성하세요. 충분한 근거가 없으면 suggestions를 빈 배열로 반환하세요.
        설명이나 마크다운 펜스 없이 반드시 아래 JSON 구조만 반환하세요.
        {"suggestions":[{"summary":"","takeaway":"","details":[{"content":"","situation":"","actionDetail":"","outcome":"","skillIds":[1]}],"reason":""}]}
        """;

    private static final String NARRATIVE_PROMPT = """
        당신은 한국어로 개발자 이력서의 경력 상세 항목을 자연스러운 한 문단으로 다듬는 편집자입니다.
        입력으로 한 줄 요약(content)과 상황(situation)·진행 과정(actionDetail)·성과(outcome) 텍스트가 주어집니다. 일부 필드는 비어 있을 수 있습니다.
        주어진 사실만 사용해 새로운 사실이나 수치를 추가하지 말고, 상황-과정-성과가 자연스럽게 이어지는 하나의 문단으로 재작성하세요.
        소제목, 글머리 기호, 마크다운 서식 없이 순수한 문장으로만 작성하고 400자 이내로 작성하세요.
        설명이나 마크다운 펜스 없이 반드시 아래 JSON 구조만 반환하세요.
        {"narrative":""}
        """;

    private static final long STREAM_TIMEOUT_MILLIS = 300_000L;

    private final SkillRepository skillRepository;
    private final ExperienceRepository experienceRepository;
    private final StudyRepository studyRepository;
    private final NvidiaNimClient nvidiaNimClient;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final AtomicBoolean generating = new AtomicBoolean(false);

    public ExperienceAiService(
        SkillRepository skillRepository,
        ExperienceRepository experienceRepository,
        StudyRepository studyRepository,
        NvidiaNimClient nvidiaNimClient,
        ObjectMapper objectMapper,
        @Value("${app.ai.experience.enabled:false}") boolean enabled
    ) {
        this.skillRepository = skillRepository;
        this.experienceRepository = experienceRepository;
        this.studyRepository = studyRepository;
        this.nvidiaNimClient = nvidiaNimClient;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
    }

    private void ensureEnabled() {
        if (!enabled) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "이력·경력 AI 기능이 비활성화되어 있습니다. NVIDIA API 설정을 확인해주세요.");
        }
    }

    public ExperienceSuggestionResponse suggest(ExperienceSuggestionRequest request) {
        ensureEnabled();
        if (!generating.compareAndSet(false, true)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "이미 이력·경력 AI 초안을 생성하고 있습니다.");
        }
        try {
            return run(prepare(request), null);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "AI 오케스트레이션 응답을 처리하지 못했습니다. 다시 시도해주세요.", exception);
        } finally {
            generating.set(false);
        }
    }

    public SseEmitter suggestStream(ExperienceSuggestionRequest request) {
        ensureEnabled();
        if (!generating.compareAndSet(false, true)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "이미 이력·경력 AI 초안을 생성하고 있습니다.");
        }
        PreparedGeneration prepared;
        try {
            prepared = prepare(request);
        } catch (RuntimeException exception) {
            generating.set(false);
            throw exception;
        }
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual().name("experience-ai-stream").start(() -> streamSuggestions(prepared, emitter));
        return emitter;
    }

    private void streamSuggestions(PreparedGeneration prepared, SseEmitter emitter) {
        try {
            ExperienceSuggestionResponse response = run(prepared, new StreamSink() {
                @Override
                public void stage(int stage, String message) {
                    send(emitter, new StageEvent("stage", stage, message));
                }

                @Override
                public void token(int stage, String text) {
                    send(emitter, new TokenEvent("token", stage, text));
                }

                @Override
                public void facts(List<Fact> facts) {
                    send(emitter, new FactsEvent("facts", facts.size()));
                }
            });
            send(emitter, new CompleteEvent("complete", response.suggestions()));
            emitter.complete();
        } catch (ResponseStatusException exception) {
            log.warn("이력·경력 AI 스트리밍 생성 실패: {}", exception.getReason(), exception);
            fail(emitter, exception.getReason() == null ? "AI 초안 생성에 실패했습니다." : exception.getReason());
        } catch (JsonProcessingException exception) {
            log.warn("이력·경력 AI 스트리밍 응답 파싱 실패", exception);
            fail(emitter, "AI 오케스트레이션 응답을 처리하지 못했습니다. 다시 시도해주세요.");
        } catch (Exception exception) {
            log.warn("이력·경력 AI 스트리밍 생성 중 예상하지 못한 오류", exception);
            fail(emitter, "AI 초안 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            generating.set(false);
        }
    }

    private ExperienceSuggestionResponse run(PreparedGeneration prepared, StreamSink sink)
        throws JsonProcessingException {
        if (sink != null) sink.stage(1, "선택한 자료와 메모를 바탕으로 사실관계를 정리하고 있습니다");
        String extractionInput = objectMapper.writeValueAsString(prepared.extractionContext());
        String extractionRaw = sink == null
            ? nvidiaNimClient.generate(FACT_CONSOLIDATOR_PROMPT, extractionInput)
            : nvidiaNimClient.generateStreaming(FACT_CONSOLIDATOR_PROMPT, extractionInput,
                token -> sink.token(1, token));
        ExtractionResponse extraction = parseJson(extractionRaw, ExtractionResponse.class, "사실관계 정리");
        List<Fact> facts = normalizeExtraction(extraction, prepared);
        if (sink != null) sink.facts(facts);

        if (sink != null) sink.stage(2, "정리된 사실관계로 경력 회고 초안을 작성하고 있습니다");
        WriterContext writerContext = new WriterContext(prepared.instruction(), prepared.roleContext(), facts);
        String writerInput = objectMapper.writeValueAsString(writerContext);
        String suggestionRaw = sink == null
            ? nvidiaNimClient.generate(EXPERIENCE_WRITER_PROMPT, writerInput)
            : nvidiaNimClient.generateStreaming(EXPERIENCE_WRITER_PROMPT, writerInput,
                token -> sink.token(2, token));
        ExperienceSuggestionResponse parsed = parseJson(
            suggestionRaw, ExperienceSuggestionResponse.class, "초안 작성");
        return normalizeSuggestions(parsed, prepared.allowedSkillIds());
    }

    private PreparedGeneration prepare(ExperienceSuggestionRequest request) {
        List<Skill> skills = select(
            skillRepository.findAllByOrderByDisplayOrderAsc(), request.skillIds(), Skill::getId, "기술");
        List<Study> studies = select(studyRepository.findAll(), request.studyIds(), Study::getId, "Study");
        List<Experience> relatedExperiences = select(
            experienceRepository.findAllByOrderByDisplayOrderAsc(), request.relatedExperienceIds(),
            Experience::getId, "관련 경력");

        RoleContext roleContext = new RoleContext(
            request.type(), blankToNull(request.draftTitle()), blankToNull(request.companyName()),
            blankToNull(request.role()), blankToNull(request.institutionName()),
            blankToNull(request.issuer()), blankToNull(request.repositoryUrl()));

        ExtractionContext extractionContext = new ExtractionContext(
            blankToNull(request.instruction()),
            roleContext,
            skills.stream().map(SkillFact::from).toList(),
            studies.stream().map(StudyFact::from).toList(),
            relatedExperiences.stream().map(ExperienceFact::from).toList()
        );
        return new PreparedGeneration(
            extractionContext,
            blankToNull(request.instruction()),
            roleContext,
            AiJsonSupport.toIdSet(skills, Skill::getId),
            AiJsonSupport.toIdSet(studies, Study::getId),
            AiJsonSupport.toIdSet(relatedExperiences, Experience::getId)
        );
    }

    private void send(SseEmitter emitter, Object payload) {
        try {
            emitter.send(SseEmitter.event()
                .data(objectMapper.writeValueAsString(payload), MediaType.APPLICATION_JSON));
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

    private List<Fact> normalizeExtraction(ExtractionResponse response, PreparedGeneration prepared) {
        List<Fact> facts = safe(response.facts()).stream()
            .limit(12)
            .filter(fact -> fact != null && hasText(fact.text()))
            .filter(fact -> (fact.skillId() == null || prepared.allowedSkillIds().contains(fact.skillId()))
                && (fact.studyId() == null || prepared.allowedStudyIds().contains(fact.studyId()))
                && (fact.experienceId() == null || prepared.allowedExperienceIds().contains(fact.experienceId())))
            .map(fact -> new Fact(fact.skillId(), fact.studyId(), fact.experienceId(),
                blankToNull(fact.aspect()), limit(fact.text(), 400)))
            .toList();
        if (facts.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "1단계 사실관계 정리에서 충분한 근거를 찾지 못했습니다.");
        }
        return facts;
    }

    private ExperienceSuggestionResponse normalizeSuggestions(
        ExperienceSuggestionResponse response, Set<Long> allowedSkillIds
    ) {
        List<ExperienceSuggestionResponse.Suggestion> suggestions = safe(response.suggestions()).stream()
            .limit(1)
            .filter(item -> item != null && hasText(item.summary()))
            .map(item -> normalizeSuggestion(item, allowedSkillIds))
            .toList();
        if (suggestions.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "2단계 초안 작성에서 적합한 결과를 만들지 못했습니다.");
        }
        return new ExperienceSuggestionResponse(suggestions);
    }

    private ExperienceSuggestionResponse.Suggestion normalizeSuggestion(
        ExperienceSuggestionResponse.Suggestion item, Set<Long> allowedSkillIds
    ) {
        List<ExperienceSuggestionResponse.DetailSuggestion> details = safe(item.details()).stream()
            .limit(3)
            .filter(detail -> detail != null && hasText(detail.content()))
            .map(detail -> new ExperienceSuggestionResponse.DetailSuggestion(
                limit(detail.content(), 500),
                limit(detail.situation(), 500),
                limit(detail.actionDetail(), 500),
                limit(detail.outcome(), 500),
                safe(detail.skillIds()).stream().filter(allowedSkillIds::contains).distinct().toList()
            ))
            .toList();
        return new ExperienceSuggestionResponse.Suggestion(
            limit(item.summary(), 300),
            limit(item.takeaway(), 500),
            details,
            limit(item.reason(), 500)
        );
    }

    private <T> T parseJson(String raw, Class<T> type, String stage) throws JsonProcessingException {
        return AiJsonSupport.parseJson(objectMapper, raw, type, stage);
    }

    public ExperienceDetailNarrativeResponse generateNarrative(ExperienceDetailNarrativeRequest request) {
        ensureEnabled();
        if (!hasText(request.situation()) && !hasText(request.actionDetail()) && !hasText(request.outcome())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "병합할 상황/진행 과정/성과 내용이 없습니다.");
        }
        NarrativeInput input = new NarrativeInput(
            request.content(), blankToNull(request.situation()),
            blankToNull(request.actionDetail()), blankToNull(request.outcome()));
        try {
            String raw = nvidiaNimClient.generate(NARRATIVE_PROMPT, objectMapper.writeValueAsString(input));
            NarrativeResponse parsed = parseJson(raw, NarrativeResponse.class, "서술 재작성");
            if (!hasText(parsed.narrative())) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "AI가 서술 초안을 만들지 못했습니다.");
            }
            return new ExperienceDetailNarrativeResponse(limit(parsed.narrative(), 500));
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "AI 응답을 처리하지 못했습니다. 다시 시도해주세요.", exception);
        }
    }

    private record NarrativeInput(String content, String situation, String actionDetail, String outcome) {}
    private record NarrativeResponse(String narrative) {}

    private interface StreamSink {
        void stage(int stage, String message);
        void token(int stage, String text);
        void facts(List<Fact> facts);
    }

    private record PreparedGeneration(
        ExtractionContext extractionContext,
        String instruction,
        RoleContext roleContext,
        Set<Long> allowedSkillIds,
        Set<Long> allowedStudyIds,
        Set<Long> allowedExperienceIds
    ) {}
    private record StageEvent(String type, int stage, String message) {}
    private record TokenEvent(String type, int stage, String text) {}
    private record FactsEvent(String type, int factCount) {}
    private record CompleteEvent(String type, List<ExperienceSuggestionResponse.Suggestion> suggestions) {}
    private record ErrorEvent(String type, String message) {}
    private record ExtractionContext(
        String instruction,
        RoleContext roleContext,
        List<SkillFact> skills,
        List<StudyFact> studies,
        List<ExperienceFact> relatedExperiences
    ) {}
    private record RoleContext(
        String type, String title, String companyName, String role,
        String institutionName, String issuer, String repositoryUrl
    ) {}
    private record ExtractionResponse(List<Fact> facts, String reason) {}
    private record Fact(Long skillId, Long studyId, Long experienceId, String aspect, String text) {}
    private record WriterContext(String instruction, RoleContext roleContext, List<Fact> facts) {}
    private record SkillFact(Long id, String name, String category, String level, String comment) {
        static SkillFact from(Skill value) {
            return new SkillFact(value.getId(), value.getName(), value.getCategory(),
                value.getSkillLevel(), value.getComment());
        }
    }
    private record StudyFact(Long id, String title, String summary) {
        static StudyFact from(Study value) {
            return new StudyFact(value.getId(), value.getTitle(), value.getSummary());
        }
    }
    private record ExperienceFact(Long id, String type, String title, String summary) {
        static ExperienceFact from(Experience value) {
            return new ExperienceFact(value.getId(), value.getType(), value.getTitle(), value.getSummary());
        }
    }
}
