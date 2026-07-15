package com.selfintro.modules.competency.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.competency.domain.Competency;
import com.selfintro.modules.competency.domain.CompetencyRepository;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionRequest;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionResponse;
import com.selfintro.modules.experience.domain.Experience;
import com.selfintro.modules.experience.domain.ExperienceRepository;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.study.entity.Study;
import com.selfintro.study.repository.StudyRepository;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Function;
import java.util.function.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompetencyAiService {
    private static final String EVIDENCE_EXTRACTOR_PROMPT = """
        당신은 개발자 포트폴리오의 사실 근거를 분석하는 검증 담당자입니다.
        입력에 명시된 사실만 사용하고 성과, 수치, 기술 또는 경험을 추측하거나 만들지 마세요.
        사용자의 작성 방향과 관련된 반복 패턴을 찾아 최대 5개의 근거 그룹으로 묶으세요.
        기술/경력/Study ID는 입력 데이터에 있는 값만 사용하세요.
        fact에는 해당 경력 또는 프로젝트에서 직접 확인할 수 있는 사실만 한국어로 요약하세요.
        실무 근거나 Study가 없는 테마는 반환하지 마세요.
        설명이나 마크다운 없이 반드시 아래 JSON 구조만 반환하세요.
        {"evidenceGroups":[{"theme":"","skillIds":[1],"evidences":[{"experienceId":1,"fact":""}],"studyIds":[1],"reason":""}]}
        """;

    private static final String COMPETENCY_WRITER_PROMPT = """
        당신은 한국어 개발자 이력서의 핵심 역량을 작성하는 편집자입니다.
        입력으로 전달된 검증 완료 evidenceGroups만 사용하세요. 원본 포트폴리오를 추측하지 마세요.
        기존 핵심 역량과 의미가 중복되지 않는 후보를 최대 3개 작성하세요.
        기술/경력/Study ID는 evidenceGroups에 있는 값만 반환하세요.
        역량명은 기술 이름 나열이 아니라 사용자의 행동 역량을 표현하고 120자 이하여야 합니다.
        역량 설명은 이력서 문체의 한국어로 작성하고 500자 이하여야 합니다.
        근거 설명은 evidenceGroups의 fact를 벗어나지 않아야 하며 700자 이하여야 합니다.
        각 후보는 대표 실무 근거를 최대 하나만 지정하세요.
        충분한 근거가 없으면 suggestions를 빈 배열로 반환하세요.
        설명이나 마크다운 없이 반드시 아래 JSON 구조만 반환하세요.
        {"suggestions":[{"title":"","summary":"","skillIds":[1],"evidences":[{"experienceId":1,"evidenceSummary":"","primary":true}],"studyIds":[1],"reason":""}]}
        """;

    private static final long STREAM_TIMEOUT_MILLIS = 300_000L;

    private final CompetencyRepository competencyRepository;
    private final SkillRepository skillRepository;
    private final ExperienceRepository experienceRepository;
    private final StudyRepository studyRepository;
    private final NvidiaNimClient nvidiaNimClient;
    private final ObjectMapper objectMapper;
    private final AtomicBoolean generating = new AtomicBoolean(false);

    public CompetencySuggestionResponse suggest(CompetencySuggestionRequest request) {
        if (!generating.compareAndSet(false, true)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "이미 핵심 역량 AI 초안을 생성하고 있습니다.");
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

    public SseEmitter suggestStream(CompetencySuggestionRequest request) {
        if (!generating.compareAndSet(false, true)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "이미 핵심 역량 AI 초안을 생성하고 있습니다.");
        }
        PreparedGeneration prepared;
        try {
            prepared = prepare(request);
        } catch (RuntimeException exception) {
            generating.set(false);
            throw exception;
        }
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual().name("competency-ai-stream").start(() -> streamSuggestions(prepared, emitter));
        return emitter;
    }

    private void streamSuggestions(PreparedGeneration prepared, SseEmitter emitter) {
        try {
            CompetencySuggestionResponse response = run(prepared, new StreamSink() {
                @Override
                public void stage(int stage, String message) {
                    send(emitter, new StageEvent("stage", stage, message));
                }

                @Override
                public void token(int stage, String text) {
                    send(emitter, new TokenEvent("token", stage, text));
                }

                @Override
                public void evidence(List<EvidenceGroup> groups) {
                    send(emitter, new EvidenceEvent("evidence", groups.stream()
                        .map(group -> new EvidenceGroupSummary(
                            group.theme(), group.evidences().size(), group.studyIds().size()))
                        .toList()));
                }
            });
            send(emitter, new CompleteEvent("complete", response.suggestions()));
            emitter.complete();
        } catch (ResponseStatusException exception) {
            log.warn("핵심 역량 AI 스트리밍 생성 실패: {}", exception.getReason(), exception);
            fail(emitter, exception.getReason() == null ? "AI 초안 생성에 실패했습니다." : exception.getReason());
        } catch (JsonProcessingException exception) {
            log.warn("핵심 역량 AI 스트리밍 응답 파싱 실패", exception);
            fail(emitter, "AI 오케스트레이션 응답을 처리하지 못했습니다. 다시 시도해주세요.");
        } catch (Exception exception) {
            log.warn("핵심 역량 AI 스트리밍 생성 중 예상하지 못한 오류", exception);
            fail(emitter, "AI 초안 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            generating.set(false);
        }
    }

    private CompetencySuggestionResponse run(PreparedGeneration prepared, StreamSink sink)
        throws JsonProcessingException {
        if (sink != null) sink.stage(1, "포트폴리오에서 역량 근거를 추출하고 있습니다");
        String extractionInput = objectMapper.writeValueAsString(prepared.extractionContext());
        String extractionRaw = sink == null
            ? nvidiaNimClient.generate(EVIDENCE_EXTRACTOR_PROMPT, extractionInput)
            : nvidiaNimClient.generateStreaming(EVIDENCE_EXTRACTOR_PROMPT, extractionInput,
                token -> sink.token(1, token));
        ExtractionResponse extraction = parseJson(extractionRaw, ExtractionResponse.class, "근거 추출");
        List<EvidenceGroup> evidenceGroups = normalizeExtraction(
            extraction,
            prepared.allowedSkillIds(),
            prepared.allowedExperienceIds(),
            prepared.allowedStudyIds()
        );
        if (sink != null) sink.evidence(evidenceGroups);

        if (sink != null) sink.stage(2, "검증된 근거로 역량 초안을 작성하고 있습니다");
        WriterContext writerContext = new WriterContext(
            prepared.instruction(), prepared.draft(), prepared.existingCompetencies(), evidenceGroups);
        String writerInput = objectMapper.writeValueAsString(writerContext);
        String suggestionRaw = sink == null
            ? nvidiaNimClient.generate(COMPETENCY_WRITER_PROMPT, writerInput)
            : nvidiaNimClient.generateStreaming(COMPETENCY_WRITER_PROMPT, writerInput,
                token -> sink.token(2, token));
        CompetencySuggestionResponse parsed = parseJson(
            suggestionRaw, CompetencySuggestionResponse.class, "역량 작성");

        return normalizeSuggestions(
            parsed,
            evidenceGroups.stream().flatMap(group -> group.skillIds().stream()).collect(toLinkedSet()),
            evidenceGroups.stream().flatMap(group -> group.evidences().stream())
                .map(ExtractedEvidence::experienceId).collect(toLinkedSet()),
            evidenceGroups.stream().flatMap(group -> group.studyIds().stream()).collect(toLinkedSet())
        );
    }

    private PreparedGeneration prepare(CompetencySuggestionRequest request) {
        List<Skill> skills = select(
            skillRepository.findAllByOrderByDisplayOrderAsc(), request.skillIds(), Skill::getId, "기술");
        List<Experience> experiences = select(
            experienceRepository.findAllByOrderByDisplayOrderAsc().stream()
                .filter(item -> "CAREER".equals(item.getType()) || "PROJECT".equals(item.getType()))
                .toList(),
            request.experienceIds(), Experience::getId, "경력/프로젝트");
        List<Study> studies = select(studyRepository.findAll(), request.studyIds(), Study::getId, "Study");
        List<ExistingCompetency> existingCompetencies = competencyRepository
            .findAllByOrderByDisplayOrderAsc().stream().map(ExistingCompetency::from).toList();

        ExtractionContext extractionContext = new ExtractionContext(
            blankToNull(request.instruction()),
            skills.stream().map(SkillFact::from).toList(),
            experiences.stream().map(ExperienceFact::from).toList(),
            studies.stream().map(StudyFact::from).toList()
        );
        return new PreparedGeneration(
            extractionContext,
            blankToNull(request.instruction()),
            new Draft(blankToNull(request.draftTitle()), blankToNull(request.draftSummary())),
            existingCompetencies,
            toIdSet(skills, Skill::getId),
            toIdSet(experiences, Experience::getId),
            toIdSet(studies, Study::getId)
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

    private List<EvidenceGroup> normalizeExtraction(
        ExtractionResponse response,
        Set<Long> allowedSkillIds,
        Set<Long> allowedExperienceIds,
        Set<Long> allowedStudyIds
    ) {
        List<EvidenceGroup> groups = safe(response.evidenceGroups()).stream()
            .limit(5)
            .filter(group -> group != null && hasText(group.theme()))
            .map(group -> {
                List<Long> skillIds = safe(group.skillIds()).stream()
                    .filter(allowedSkillIds::contains).distinct().toList();
                List<ExtractedEvidence> evidences = safe(group.evidences()).stream()
                    .filter(evidence -> evidence != null
                        && allowedExperienceIds.contains(evidence.experienceId())
                        && hasText(evidence.fact()))
                    .filter(distinctBy(ExtractedEvidence::experienceId))
                    .map(evidence -> new ExtractedEvidence(evidence.experienceId(), limit(evidence.fact(), 700)))
                    .toList();
                List<Long> studyIds = safe(group.studyIds()).stream()
                    .filter(allowedStudyIds::contains).distinct().toList();
                return new EvidenceGroup(
                    limit(group.theme(), 120), skillIds, evidences, studyIds, limit(group.reason(), 500));
            })
            .filter(group -> !group.evidences().isEmpty() || !group.studyIds().isEmpty())
            .toList();
        if (groups.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "1단계 근거 분석에서 충분한 핵심 역량 근거를 찾지 못했습니다.");
        }
        return groups;
    }

    private CompetencySuggestionResponse normalizeSuggestions(
        CompetencySuggestionResponse response,
        Set<Long> extractedSkillIds,
        Set<Long> extractedExperienceIds,
        Set<Long> extractedStudyIds
    ) {
        List<CompetencySuggestionResponse.Suggestion> suggestions = safe(response.suggestions()).stream()
            .limit(3)
            .filter(item -> item != null && hasText(item.title()) && hasText(item.summary()))
            .map(item -> normalizeSuggestion(
                item, extractedSkillIds, extractedExperienceIds, extractedStudyIds))
            .toList();
        if (suggestions.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "2단계 역량 작성에서 적합한 초안을 만들지 못했습니다.");
        }
        return new CompetencySuggestionResponse(suggestions);
    }

    private CompetencySuggestionResponse.Suggestion normalizeSuggestion(
        CompetencySuggestionResponse.Suggestion item,
        Set<Long> extractedSkillIds,
        Set<Long> extractedExperienceIds,
        Set<Long> extractedStudyIds
    ) {
        List<Long> skillIds = safe(item.skillIds()).stream()
            .filter(extractedSkillIds::contains).distinct().toList();
        List<Long> studyIds = safe(item.studyIds()).stream()
            .filter(extractedStudyIds::contains).distinct().toList();
        List<CompetencySuggestionResponse.Evidence> evidences = safe(item.evidences()).stream()
            .filter(evidence -> evidence != null && extractedExperienceIds.contains(evidence.experienceId()))
            .filter(distinctBy(CompetencySuggestionResponse.Evidence::experienceId))
            .map(evidence -> new CompetencySuggestionResponse.Evidence(
                evidence.experienceId(), limit(evidence.evidenceSummary(), 700), evidence.primary()))
            .toList();
        if (!evidences.isEmpty()) {
            Long primaryId = evidences.stream()
                .filter(CompetencySuggestionResponse.Evidence::primary)
                .findFirst()
                .map(CompetencySuggestionResponse.Evidence::experienceId)
                .orElse(evidences.getFirst().experienceId());
            evidences = evidences.stream()
                .map(evidence -> new CompetencySuggestionResponse.Evidence(
                    evidence.experienceId(), evidence.evidenceSummary(), evidence.experienceId().equals(primaryId)))
                .toList();
        }
        return new CompetencySuggestionResponse.Suggestion(
            limit(item.title(), 120),
            limit(item.summary(), 500),
            skillIds,
            evidences,
            studyIds,
            limit(item.reason(), 500)
        );
    }

    private <T> T parseJson(String raw, Class<T> type, String stage) throws JsonProcessingException {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start < 0 || end <= start) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                stage + " 단계에서 AI가 올바른 JSON을 반환하지 않았습니다.");
        }
        return objectMapper.readValue(raw.substring(start, end + 1), type);
    }

    private static <T> List<T> select(
        List<T> all,
        List<Long> requestedIds,
        Function<T, Long> idExtractor,
        String label
    ) {
        if (requestedIds.isEmpty()) return all;
        Set<Long> requested = new LinkedHashSet<>(requestedIds);
        List<T> selected = all.stream().filter(item -> requested.contains(idExtractor.apply(item))).toList();
        if (selected.size() != requested.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "존재하지 않는 " + label + " 항목이 포함되어 있습니다.");
        }
        return selected;
    }

    private static <T> Set<Long> toIdSet(List<T> items, Function<T, Long> idExtractor) {
        return items.stream().map(idExtractor).collect(toLinkedSet());
    }

    private static <T, K> Predicate<T> distinctBy(Function<T, K> keyExtractor) {
        Set<K> seen = new LinkedHashSet<>();
        return value -> seen.add(keyExtractor.apply(value));
    }

    private static <T> java.util.stream.Collector<T, ?, Set<T>> toLinkedSet() {
        return java.util.stream.Collectors.toCollection(LinkedHashSet::new);
    }

    private static <T> List<T> safe(List<T> values) { return values == null ? List.of() : values; }
    private static boolean hasText(String value) { return value != null && !value.isBlank(); }
    private static String blankToNull(String value) { return hasText(value) ? value.trim() : null; }
    private static String limit(String value, int max) {
        if (value == null) return "";
        String trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }

    private interface StreamSink {
        void stage(int stage, String message);
        void token(int stage, String text);
        void evidence(List<EvidenceGroup> groups);
    }

    private record PreparedGeneration(
        ExtractionContext extractionContext,
        String instruction,
        Draft draft,
        List<ExistingCompetency> existingCompetencies,
        Set<Long> allowedSkillIds,
        Set<Long> allowedExperienceIds,
        Set<Long> allowedStudyIds
    ) {}
    private record StageEvent(String type, int stage, String message) {}
    private record TokenEvent(String type, int stage, String text) {}
    private record EvidenceEvent(String type, List<EvidenceGroupSummary> groups) {}
    private record EvidenceGroupSummary(String theme, int evidenceCount, int studyCount) {}
    private record CompleteEvent(String type, List<CompetencySuggestionResponse.Suggestion> suggestions) {}
    private record ErrorEvent(String type, String message) {}
    private record ExtractionContext(
        String instruction,
        List<SkillFact> skills,
        List<ExperienceFact> experiences,
        List<StudyFact> studies
    ) {}
    private record ExtractionResponse(List<EvidenceGroup> evidenceGroups) {}
    private record EvidenceGroup(
        String theme,
        List<Long> skillIds,
        List<ExtractedEvidence> evidences,
        List<Long> studyIds,
        String reason
    ) {}
    private record ExtractedEvidence(Long experienceId, String fact) {}
    private record WriterContext(
        String instruction,
        Draft currentDraft,
        List<ExistingCompetency> existingCompetencies,
        List<EvidenceGroup> evidenceGroups
    ) {}
    private record Draft(String title, String summary) {}
    private record ExistingCompetency(Long id, String title, String summary) {
        static ExistingCompetency from(Competency value) {
            return new ExistingCompetency(value.getId(), value.getTitle(), value.getSummary());
        }
    }
    private record SkillFact(Long id, String name, String category, String level, String comment) {
        static SkillFact from(Skill value) {
            return new SkillFact(value.getId(), value.getName(), value.getCategory(),
                value.getSkillLevel(), value.getComment());
        }
    }
    private record ExperienceFact(
        Long id,
        String type,
        String title,
        String summary,
        String takeaway,
        List<String> skills
    ) {
        static ExperienceFact from(Experience value) {
            return new ExperienceFact(
                value.getId(), value.getType(), value.getTitle(), value.getSummary(), value.getTakeaway(),
                value.getSkills().stream().map(Skill::getName).toList());
        }
    }
    private record StudyFact(Long id, String title, String summary, String status, List<String> skills) {
        static StudyFact from(Study value) {
            return new StudyFact(
                value.getId(), value.getTitle(), value.getSummary(), value.getStatus().name(),
                value.getSkills().stream().map(Skill::getName).toList());
        }
    }
}
