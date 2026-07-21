package com.selfintro.study.ai;

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
import com.selfintro.modules.experience.domain.ExperienceDetail;
import com.selfintro.modules.experience.domain.ExperienceDetailRepository;
import com.selfintro.modules.experience.domain.ExperienceRepository;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.study.dto.StudySuggestionRequest;
import com.selfintro.study.dto.StudySuggestionResponse;
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
public class StudyAiService {
    private static final String FACT_CONSOLIDATOR_PROMPT =
            """
        당신은 개발자의 학습 정리 글을 쓰기 전에 사실관계를 정리하는 편집 보조입니다.
        입력에 주어진 스킬/경력·프로젝트/경력 상세/관련 Study 요약과 사용자가 작성한 메모만 사실로 인정하세요.
        메모는 사용자가 직접 제공한 사실로 신뢰하되, 메모에도 입력 데이터에도 없는 수치·고유명사·성과를 새로 만들어내지 마세요.
        각 사실에는 근거가 된 스킬/경력/경력상세/Study ID를 표시하고, 메모에서만 나온 사실은 ID를 모두 비워두세요.
        ID는 입력 데이터에 있는 값만 사용하세요.
        글의 뼈대가 될 섹션 개요(outline)를 3~6개 작성하세요.
        설명이나 마크다운 없이 반드시 아래 JSON 구조만 반환하세요.
        {"facts":[{"skillId":null,"experienceId":null,"experienceDetailId":null,"studyId":null,"text":""}],"outline":[""],"reason":""}
        """;

    private static final String STUDY_WRITER_PROMPT =
            """
        당신은 한국어로 개발자 학습 블로그를 작성하는 편집자입니다.
        입력으로 전달된 검증 완료 facts와 outline만 근거로 사용하세요. 새로운 사실을 추측하거나 만들지 마세요.
        입력에 있는 관련 Study 목록과 내용이 중복되지 않게 작성하세요.
        title은 160자 이하, summary는 500자 이하로 핵심을 요약하세요.
        tagNames는 최대 6개, 각 80자 이하로 제시하고 가능하면 기존 태그를 재사용하세요.
        contentMarkdown은 800~1800자 내외의 마크다운으로 작성하고, outline의 섹션 구조를 따르며 ## 소제목과 필요하면 코드블록을 사용하세요.
        후보는 1개만 작성하세요. 충분한 근거가 없으면 suggestions를 빈 배열로 반환하세요.
        설명이나 마크다운 펜스 없이 반드시 아래 JSON 구조만 반환하세요.
        {"suggestions":[{"title":"","summary":"","tagNames":[],"contentMarkdown":"","reason":""}]}
        """;

    private static final long STREAM_TIMEOUT_MILLIS = 300_000L;

    private final SkillRepository skillRepository;
    private final ExperienceRepository experienceRepository;
    private final ExperienceDetailRepository experienceDetailRepository;
    private final StudyRepository studyRepository;
    private final NvidiaNimClient nvidiaNimClient;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final AtomicBoolean generating = new AtomicBoolean(false);

    public StudyAiService(
            SkillRepository skillRepository,
            ExperienceRepository experienceRepository,
            ExperienceDetailRepository experienceDetailRepository,
            StudyRepository studyRepository,
            NvidiaNimClient nvidiaNimClient,
            ObjectMapper objectMapper,
            @Value("${app.ai.study.enabled:false}") boolean enabled) {
        this.skillRepository = skillRepository;
        this.experienceRepository = experienceRepository;
        this.experienceDetailRepository = experienceDetailRepository;
        this.studyRepository = studyRepository;
        this.nvidiaNimClient = nvidiaNimClient;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
    }

    private void ensureEnabled() {
        if (!enabled) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "공부 정리 AI 기능이 비활성화되어 있습니다. NVIDIA API 설정을 확인해주세요.");
        }
    }

    public StudySuggestionResponse suggest(StudySuggestionRequest request) {
        ensureEnabled();
        if (!generating.compareAndSet(false, true)) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS, "이미 공부 정리 AI 초안을 생성하고 있습니다.");
        }
        try {
            return run(prepare(request), null);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "AI 오케스트레이션 응답을 처리하지 못했습니다. 다시 시도해주세요.", exception);
        } finally {
            generating.set(false);
        }
    }

    public SseEmitter suggestStream(StudySuggestionRequest request) {
        ensureEnabled();
        if (!generating.compareAndSet(false, true)) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS, "이미 공부 정리 AI 초안을 생성하고 있습니다.");
        }
        PreparedGeneration prepared;
        try {
            prepared = prepare(request);
        } catch (RuntimeException exception) {
            generating.set(false);
            throw exception;
        }
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual()
                .name("study-ai-stream")
                .start(() -> streamSuggestions(prepared, emitter));
        return emitter;
    }

    private void streamSuggestions(PreparedGeneration prepared, SseEmitter emitter) {
        try {
            StudySuggestionResponse response =
                    run(
                            prepared,
                            new StreamSink() {
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
            log.warn("공부 정리 AI 스트리밍 생성 실패: {}", exception.getReason(), exception);
            fail(
                    emitter,
                    exception.getReason() == null ? "AI 초안 생성에 실패했습니다." : exception.getReason());
        } catch (JsonProcessingException exception) {
            log.warn("공부 정리 AI 스트리밍 응답 파싱 실패", exception);
            fail(emitter, "AI 오케스트레이션 응답을 처리하지 못했습니다. 다시 시도해주세요.");
        } catch (Exception exception) {
            log.warn("공부 정리 AI 스트리밍 생성 중 예상하지 못한 오류", exception);
            fail(emitter, "AI 초안 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            generating.set(false);
        }
    }

    private StudySuggestionResponse run(PreparedGeneration prepared, StreamSink sink)
            throws JsonProcessingException {
        if (sink != null) sink.stage(1, "선택한 자료와 메모를 바탕으로 사실관계를 정리하고 있습니다");
        String extractionInput = objectMapper.writeValueAsString(prepared.extractionContext());
        String extractionRaw =
                sink == null
                        ? nvidiaNimClient.generate(FACT_CONSOLIDATOR_PROMPT, extractionInput)
                        : nvidiaNimClient.generateStreaming(
                                FACT_CONSOLIDATOR_PROMPT,
                                extractionInput,
                                token -> sink.token(1, token));
        ExtractionResponse extraction =
                parseJson(extractionRaw, ExtractionResponse.class, "사실관계 정리");
        List<Fact> facts = normalizeExtraction(extraction, prepared);
        if (sink != null) sink.facts(facts);

        if (sink != null) sink.stage(2, "정리된 사실관계로 학습 정리 글 초안을 작성하고 있습니다");
        WriterContext writerContext =
                new WriterContext(
                        prepared.instruction(),
                        prepared.draft(),
                        prepared.relatedStudies(),
                        facts,
                        extraction.outline());
        String writerInput = objectMapper.writeValueAsString(writerContext);
        String suggestionRaw =
                sink == null
                        ? nvidiaNimClient.generate(STUDY_WRITER_PROMPT, writerInput)
                        : nvidiaNimClient.generateStreaming(
                                STUDY_WRITER_PROMPT, writerInput, token -> sink.token(2, token));
        StudySuggestionResponse parsed =
                parseJson(suggestionRaw, StudySuggestionResponse.class, "초안 작성");
        return normalizeSuggestions(parsed);
    }

    private PreparedGeneration prepare(StudySuggestionRequest request) {
        List<Skill> skills =
                select(
                        skillRepository.findAllByOrderByDisplayOrderAsc(),
                        request.skillIds(),
                        Skill::getId,
                        "기술");
        List<Experience> experiences =
                select(
                        experienceRepository.findAllByOrderByDisplayOrderAsc(),
                        request.experienceIds(),
                        Experience::getId,
                        "경력/프로젝트");
        List<ExperienceDetail> experienceDetails =
                select(
                        experienceDetailRepository.findAll(),
                        request.experienceDetailIds(),
                        ExperienceDetail::getId,
                        "경력 상세");
        List<Study> relatedStudies =
                select(
                        studyRepository.findAll(),
                        request.relatedStudyIds(),
                        Study::getId,
                        "관련 Study");

        ExtractionContext extractionContext =
                new ExtractionContext(
                        blankToNull(request.instruction()),
                        skills.stream().map(SkillFact::from).toList(),
                        experiences.stream().map(ExperienceFact::from).toList(),
                        experienceDetails.stream().map(ExperienceDetailFact::from).toList(),
                        relatedStudies.stream().map(StudyFact::from).toList());
        return new PreparedGeneration(
                extractionContext,
                blankToNull(request.instruction()),
                new Draft(blankToNull(request.draftTitle()), blankToNull(request.draftSummary())),
                relatedStudies.stream().map(StudyFact::from).toList(),
                AiJsonSupport.toIdSet(skills, Skill::getId),
                AiJsonSupport.toIdSet(experiences, Experience::getId),
                AiJsonSupport.toIdSet(experienceDetails, ExperienceDetail::getId),
                AiJsonSupport.toIdSet(relatedStudies, Study::getId));
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

    private List<Fact> normalizeExtraction(
            ExtractionResponse response, PreparedGeneration prepared) {
        List<Fact> facts =
                safe(response.facts()).stream()
                        .limit(12)
                        .filter(fact -> fact != null && hasText(fact.text()))
                        .filter(
                                fact ->
                                        (fact.skillId() == null
                                                        || prepared.allowedSkillIds()
                                                                .contains(fact.skillId()))
                                                && (fact.experienceId() == null
                                                        || prepared.allowedExperienceIds()
                                                                .contains(fact.experienceId()))
                                                && (fact.experienceDetailId() == null
                                                        || prepared.allowedExperienceDetailIds()
                                                                .contains(
                                                                        fact.experienceDetailId()))
                                                && (fact.studyId() == null
                                                        || prepared.allowedStudyIds()
                                                                .contains(fact.studyId())))
                        .map(
                                fact ->
                                        new Fact(
                                                fact.skillId(),
                                                fact.experienceId(),
                                                fact.experienceDetailId(),
                                                fact.studyId(),
                                                limit(fact.text(), 400)))
                        .toList();
        if (facts.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY, "1단계 사실관계 정리에서 충분한 근거를 찾지 못했습니다.");
        }
        return facts;
    }

    private StudySuggestionResponse normalizeSuggestions(StudySuggestionResponse response) {
        List<StudySuggestionResponse.Suggestion> suggestions =
                safe(response.suggestions()).stream()
                        .limit(1)
                        .filter(
                                item ->
                                        item != null
                                                && hasText(item.title())
                                                && hasText(item.summary())
                                                && hasText(item.contentMarkdown()))
                        .map(this::normalizeSuggestion)
                        .toList();
        if (suggestions.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY, "2단계 초안 작성에서 적합한 결과를 만들지 못했습니다.");
        }
        return new StudySuggestionResponse(suggestions);
    }

    private StudySuggestionResponse.Suggestion normalizeSuggestion(
            StudySuggestionResponse.Suggestion item) {
        List<String> tagNames =
                safe(item.tagNames()).stream()
                        .filter(AiJsonSupport::hasText)
                        .map(name -> limit(name, 80))
                        .distinct()
                        .limit(6)
                        .toList();
        return new StudySuggestionResponse.Suggestion(
                limit(item.title(), 160),
                limit(item.summary(), 500),
                tagNames,
                limit(item.contentMarkdown(), 1800),
                limit(item.reason(), 500));
    }

    private <T> T parseJson(String raw, Class<T> type, String stage)
            throws JsonProcessingException {
        return AiJsonSupport.parseJson(objectMapper, raw, type, stage);
    }

    private interface StreamSink {
        void stage(int stage, String message);

        void token(int stage, String text);

        void facts(List<Fact> facts);
    }

    private record PreparedGeneration(
            ExtractionContext extractionContext,
            String instruction,
            Draft draft,
            List<StudyFact> relatedStudies,
            Set<Long> allowedSkillIds,
            Set<Long> allowedExperienceIds,
            Set<Long> allowedExperienceDetailIds,
            Set<Long> allowedStudyIds) {}

    private record StageEvent(String type, int stage, String message) {}

    private record TokenEvent(String type, int stage, String text) {}

    private record FactsEvent(String type, int factCount) {}

    private record CompleteEvent(
            String type, List<StudySuggestionResponse.Suggestion> suggestions) {}

    private record ErrorEvent(String type, String message) {}

    private record ExtractionContext(
            String instruction,
            List<SkillFact> skills,
            List<ExperienceFact> experiences,
            List<ExperienceDetailFact> experienceDetails,
            List<StudyFact> relatedStudies) {}

    private record ExtractionResponse(List<Fact> facts, List<String> outline, String reason) {}

    private record Fact(
            Long skillId, Long experienceId, Long experienceDetailId, Long studyId, String text) {}

    private record WriterContext(
            String instruction,
            Draft currentDraft,
            List<StudyFact> relatedStudies,
            List<Fact> facts,
            List<String> outline) {}

    private record Draft(String title, String summary) {}

    private record SkillFact(Long id, String name, String category, String level, String comment) {
        static SkillFact from(Skill value) {
            return new SkillFact(
                    value.getId(),
                    value.getName(),
                    value.getCategory(),
                    value.getSkillLevel(),
                    value.getComment());
        }
    }

    private record ExperienceFact(
            Long id, String type, String title, String summary, String takeaway) {
        static ExperienceFact from(Experience value) {
            return new ExperienceFact(
                    value.getId(),
                    value.getType(),
                    value.getTitle(),
                    value.getSummary(),
                    value.getTakeaway());
        }
    }

    private record ExperienceDetailFact(
            Long id,
            Long experienceId,
            String content,
            String situation,
            String actionDetail,
            String outcome) {
        static ExperienceDetailFact from(ExperienceDetail value) {
            return new ExperienceDetailFact(
                    value.getId(),
                    value.getExperience() != null ? value.getExperience().getId() : null,
                    value.getContent(),
                    value.getSituation(),
                    value.getActionDetail(),
                    value.getOutcome());
        }
    }

    private record StudyFact(Long id, String title, String summary, String status) {
        static StudyFact from(Study value) {
            return new StudyFact(
                    value.getId(), value.getTitle(), value.getSummary(), value.getStatus().name());
        }
    }
}
