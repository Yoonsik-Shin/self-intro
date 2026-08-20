package com.selfintro.portfolio.application;

import static com.selfintro.global.ai.AiJsonSupport.blankToNull;
import static com.selfintro.global.ai.AiJsonSupport.hasText;
import static com.selfintro.global.ai.AiJsonSupport.limit;
import static com.selfintro.global.ai.AiJsonSupport.safe;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.competency.domain.entity.Competency;
import com.selfintro.modules.competency.domain.repository.CompetencyRepository;
import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.entity.ExperienceDetail;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudy;
import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudyRevision;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRepository;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRevisionRepository;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyContent;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyGenerateRequest;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import com.selfintro.modules.skill.domain.repository.WorkspaceSkillRepository;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
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
public class PortfolioCaseStudyAiService {

    private static final String FACT_CONSOLIDATOR_PROMPT =
            """
            당신은 개발자 포트폴리오 사례 1개를 쓰기 전에 근거 준비도를 진단하는 사례 설계 코치입니다.
            입력에 주어진 프로젝트 기본 정보, 프로젝트 상세 항목(situation/task/actionDetail/outcome/narrative),
            선택한 역량, 선택한 기술, 선택한 Study(제목/요약/본문 발췌), 사용자 메모만 사실로 인정하세요.
            메모는 사용자가 직접 제공한 사실로 신뢰하되, 메모에도 입력 데이터에도 없는 수치·고유명사·성과를 새로 만들어내지 마세요.
            각 사실에는 근거가 된 experienceDetailId 또는 studyId를 표시하고, 메모에서만 나온 사실은 둘 다 비워두세요.
            ID는 입력 데이터에 있는 값만 사용하세요.
            각 사실은 problem(문제 인식)·role(본인의 역할과 행동)·thought(고민한 내용, 검토한 후보안)·tradeoff(후보안 간 트레이드오프)·
            solution(실제 해결 방법)·outcome(성과·지표) 중 어떤 관점인지 aspect로 구분하세요.
            문제·역할·판단·해결·성과 근거가 하나의 프로젝트·기간·맥락으로 연결되는지, 서로 충돌하지 않는지 판정하세요.
            coverage의 status는 SATISFIED, PARTIAL, MISSING 중 하나입니다.
            필수 관점이 모두 충족되고 맥락이 일관될 때만 readiness를 READY로 하세요.
            조합은 일관되지만 설명이 부족하면 NEEDS_INPUT으로 하고, 사용자가 답할 구체적인 질문 1~3개를 questions에 적으세요.
            관련성이 낮거나 맥락이 섞였거나 충돌하면 RESELECT로 하고, conflicts에 해당 근거와 이유를,
            suggestions에 제거·교체·추가할 근거 방향을 적으세요. 선택하지 않은 근거 ID를 지어내지 마세요.
            linkedToProject가 false인 선택 근거는 현재 프로젝트와의 연결이 확인되지 않은 항목입니다.
            이런 항목을 무시하지 말고 반드시 RESELECT로 판정해 conflicts에서 이름과 이유를 설명하세요.
            message는 판정 이유와 다음 행동을 한국어 2문장 이내로 설명하세요.
            설명이나 마크다운 없이 반드시 아래 JSON 구조만 반환하세요.
            {"facts":[{"experienceDetailId":null,"studyId":null,"aspect":"problem|role|thought|tradeoff|solution|outcome","text":""}],"assessment":{"readiness":"READY|NEEDS_INPUT|RESELECT","coverage":{"problem":{"status":"SATISFIED|PARTIAL|MISSING","reason":""},"role":{"status":"SATISFIED|PARTIAL|MISSING","reason":""},"judgment":{"status":"SATISFIED|PARTIAL|MISSING","reason":""},"solution":{"status":"SATISFIED|PARTIAL|MISSING","reason":""},"outcome":{"status":"SATISFIED|PARTIAL|MISSING","reason":""}},"conflicts":[],"suggestions":[],"questions":[],"message":""}}
            """;

    private static final String WRITER_PROMPT =
            """
            당신은 한국어로 개발자 포트폴리오 케이스스터디를 작성하는 편집자입니다.
            입력으로 전달된 검증 완료 facts만 근거로 사용하세요. 새로운 사실을 추측하거나 만들지 마세요.
            currentDraft가 있으면 새 글을 처음부터 만드는 대신 사용자의 instruction에 따라 currentDraft를 개선하세요.
            instruction과 직접 관련 없는 문단은 가능한 한 유지하되, facts로 뒷받침되지 않는 표현은 유지하지 마세요.
            "문제 인식 → 고민/트레이드오프 → 해결 → 성과" 구조로 작성하세요.
            summary는 150자 이하 한줄 요약, problem/thoughtProcess/solution은 각각 800자 이하 문단으로 작성하세요.
            tradeoffs는 facts에 트레이드오프 근거가 있을 때만 최대 4개까지 작성하고, 근거가 없으면 빈 배열로 반환하세요.
            outcome.summary는 300자 이하로 작성하고, outcome.metrics는 facts에 구체적 수치(before/after)가 있을 때만
            작성하고 없으면 빈 배열로 반환하세요.
            architecture.mermaidSource는 facts 중 Study 근거 안에 mermaid 다이어그램 코드가 이미 포함되어 있으면
            그 코드를 그대로 재사용하고, 없으면 null로 반환하세요. 새 다이어그램을 창작하지 마세요.
            sourceStudyIds/sourceExperienceDetailIds에는 실제로 사용한 facts의 근거 ID만 중복 없이 담으세요.
            currentDraft에 architecture.imageObjectKeys가 있어도 값을 새로 만들거나 변경하지 마세요.
            설명이나 마크다운 펜스 없이 반드시 아래 JSON 구조만 반환하세요.
            {"summary":"","problem":"","thoughtProcess":"","tradeoffs":[{"option":"","pros":"","cons":"","chosenBecause":""}],"solution":"","outcome":{"summary":"","metrics":[{"label":"","before":"","after":""}]},"architecture":{"mermaidSource":null,"imageObjectKeys":[]},"sourceStudyIds":[],"sourceExperienceDetailIds":[]}
            """;

    private static final long STREAM_TIMEOUT_MILLIS = 300_000L;
    private static final int STUDY_CONTENT_EXCERPT_LIMIT = 3000;

    private final PortfolioCaseStudyRepository portfolioCaseStudyRepository;
    private final PortfolioCaseStudyRevisionRepository portfolioCaseStudyRevisionRepository;
    private final ExperienceRepository experienceRepository;
    private final CompetencyRepository competencyRepository;
    private final SkillRepository skillRepository;
    private final WorkspaceSkillRepository workspaceSkillRepository;
    private final StudyRepository studyRepository;
    private final NvidiaNimClient nvidiaNimClient;
    private final ObjectMapper objectMapper;
    private final AtomicBoolean generating = new AtomicBoolean(false);

    public PortfolioCaseStudyContent generate(
            Long caseStudyId, PortfolioCaseStudyGenerateRequest request) {
        return generate(null, caseStudyId, request);
    }

    public PortfolioCaseStudyContent generate(
            Long workspaceId, Long caseStudyId, PortfolioCaseStudyGenerateRequest request) {
        if (!generating.compareAndSet(false, true)) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS, "이미 포트폴리오 AI 초안을 생성하고 있습니다.");
        }
        try {
            return run(
                    prepare(
                            workspaceId,
                            resolveExperienceId(workspaceId, caseStudyId),
                            caseStudyId,
                            request),
                    null);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "AI 오케스트레이션 응답을 처리하지 못했습니다. 다시 시도해주세요.", exception);
        } finally {
            generating.set(false);
        }
    }

    public SseEmitter generateStream(Long caseStudyId, PortfolioCaseStudyGenerateRequest request) {
        return generateStream(null, caseStudyId, request);
    }

    public SseEmitter generateStream(
            Long workspaceId, Long caseStudyId, PortfolioCaseStudyGenerateRequest request) {
        if (!generating.compareAndSet(false, true)) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS, "이미 포트폴리오 AI 초안을 생성하고 있습니다.");
        }
        PreparedGeneration prepared;
        try {
            prepared =
                    prepare(
                            workspaceId,
                            resolveExperienceId(workspaceId, caseStudyId),
                            caseStudyId,
                            request);
        } catch (RuntimeException exception) {
            generating.set(false);
            throw exception;
        }
        SseEmitter emitter = createSseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual().name("portfolio-ai-stream").start(() -> stream(prepared, emitter));
        return emitter;
    }

    private SseEmitter createSseEmitter(long timeoutMillis) {
        SseEmitter emitter = new SseEmitter(timeoutMillis);
        emitter.onTimeout(
                () -> {
                    log.info("포트폴리오 AI SSE 스트림 타임아웃 발생");
                    fail(emitter, "AI 초안 생성 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.");
                });
        emitter.onError(
                ex -> {
                    log.debug("포트폴리오 AI SSE 스트림 에러: {}", ex.getMessage());
                });
        return emitter;
    }

    private Long resolveExperienceId(Long workspaceId, Long caseStudyId) {
        PortfolioCaseStudy caseStudy =
                (workspaceId == null
                                ? portfolioCaseStudyRepository.findById(caseStudyId)
                                : portfolioCaseStudyRepository.findByIdAndWorkspaceId(
                                        caseStudyId, workspaceId))
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "존재하지 않는 케이스스터디입니다."));
        return caseStudy.getExperienceId();
    }

    private void stream(PreparedGeneration prepared, SseEmitter emitter) {
        try {
            PortfolioCaseStudyContent content =
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

                                @Override
                                public void readiness(ReadinessAssessment assessment) {
                                    send(emitter, new ReadinessEvent("readiness", assessment));
                                }
                            });
            send(emitter, new CompleteEvent("complete", content));
            emitter.complete();
        } catch (EvidenceReadinessException exception) {
            send(emitter, new ReadinessEvent("readiness", exception.assessment()));
            emitter.complete();
        } catch (ResponseStatusException exception) {
            log.warn("포트폴리오 AI 스트리밍 생성 실패: {}", exception.getReason(), exception);
            fail(
                    emitter,
                    exception.getReason() == null ? "AI 초안 생성에 실패했습니다." : exception.getReason());
        } catch (JsonProcessingException exception) {
            log.warn("포트폴리오 AI 스트리밍 응답 파싱 실패", exception);
            fail(emitter, "AI 오케스트레이션 응답을 처리하지 못했습니다. 다시 시도해주세요.");
        } catch (Exception exception) {
            log.warn("포트폴리오 AI 스트리밍 생성 중 예상하지 못한 오류", exception);
            fail(emitter, "AI 초안 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            generating.set(false);
        }
    }

    private PortfolioCaseStudyContent run(PreparedGeneration prepared, StreamSink sink)
            throws JsonProcessingException {
        if (sink != null) sink.stage(1, "선택한 근거가 하나의 사례로 연결되는지 진단하고 있습니다");
        if (!prepared.selectionConflicts().isEmpty()) {
            throw new EvidenceReadinessException(
                    reselectionAssessment(prepared.selectionConflicts()));
        }
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
        ReadinessAssessment assessment = normalizeAssessment(extraction.assessment());
        if (!"READY".equals(assessment.readiness())) {
            throw new EvidenceReadinessException(assessment);
        }
        if (sink != null) sink.readiness(assessment);
        List<Fact> facts = normalizeExtraction(extraction, prepared);
        if (sink != null) sink.facts(facts);

        if (sink != null) sink.stage(2, "정리된 사실관계로 케이스스터디 초안을 작성하고 있습니다");
        WriterContext writerContext =
                new WriterContext(prepared.instruction(), facts, prepared.baseContent());
        String writerInput = objectMapper.writeValueAsString(writerContext);
        String writerRaw =
                sink == null
                        ? nvidiaNimClient.generate(WRITER_PROMPT, writerInput)
                        : nvidiaNimClient.generateStreaming(
                                WRITER_PROMPT, writerInput, token -> sink.token(2, token));
        PortfolioCaseStudyContent content =
                parseJson(writerRaw, PortfolioCaseStudyContent.class, "초안 작성");
        return normalize(content, prepared);
    }

    private PreparedGeneration prepare(
            Long workspaceId,
            Long experienceId,
            Long caseStudyId,
            PortfolioCaseStudyGenerateRequest request) {
        Experience experience =
                experienceId == null
                        ? null
                        : experienceRepository
                                .findById(experienceId)
                                .orElseThrow(
                                        () ->
                                                new ResponseStatusException(
                                                        HttpStatus.NOT_FOUND, "존재하지 않는 프로젝트입니다."));

        List<Skill> skills =
                request.skillIds() == null || request.skillIds().isEmpty()
                        ? List.of()
                        : validateSubset(
                                workspaceId == null
                                        ? skillRepository.findAllById(request.skillIds())
                                        : workspaceSkillRepository
                                                .findAllByWorkspaceIdAndSkill_IdIn(
                                                        workspaceId, request.skillIds())
                                                .stream()
                                                .map(workspaceSkill -> workspaceSkill.getSkill())
                                                .toList(),
                                request.skillIds(),
                                "기술");

        List<Study> studies =
                request.studyIds() == null || request.studyIds().isEmpty()
                        ? List.of()
                        : validateSubset(
                                workspaceId == null
                                        ? studyRepository.findAllById(request.studyIds())
                                        : studyRepository.findAllByWorkspaceIdAndIdIn(
                                                workspaceId, request.studyIds()),
                                request.studyIds(),
                                "Study");

        List<Competency> competencies = resolveCompetencies(workspaceId, request.competencyIds());

        List<ExperienceDetail> details = experience == null ? List.of() : experience.getDetails();
        List<String> selectionConflicts =
                findSelectionConflicts(experience, details, skills, studies, competencies);
        PortfolioCaseStudyContent baseContent =
                request.currentDraft() == null
                        ? readBaseContent(request.baseRevisionId(), caseStudyId)
                        : request.currentDraft();

        ExtractionContext extractionContext =
                new ExtractionContext(
                        blankToNull(request.instruction()),
                        experience == null ? null : ExperienceFact.from(experience),
                        details.stream().map(ExperienceDetailFact::from).toList(),
                        competencies.stream()
                                .map(
                                        competency ->
                                                CompetencyFact.from(
                                                        competency,
                                                        isCompetencyLinked(experience, competency)))
                                .toList(),
                        skills.stream()
                                .map(
                                        skill ->
                                                SkillFact.from(
                                                        skill,
                                                        isSkillLinked(experience, details, skill)))
                                .toList(),
                        studies.stream()
                                .map(
                                        study ->
                                                StudyFact.from(
                                                        study,
                                                        isStudyLinked(experience, details, study)))
                                .toList());

        Set<Long> allowedDetailIds =
                details.stream().map(ExperienceDetail::getId).collect(Collectors.toSet());
        Set<Long> allowedStudyIds = studies.stream().map(Study::getId).collect(Collectors.toSet());

        return new PreparedGeneration(
                extractionContext,
                blankToNull(request.instruction()),
                allowedDetailIds,
                allowedStudyIds,
                baseContent,
                selectionConflicts);
    }

    private List<String> findSelectionConflicts(
            Experience experience,
            List<ExperienceDetail> details,
            List<Skill> skills,
            List<Study> studies,
            List<Competency> competencies) {
        if (experience == null) return List.of();
        List<String> conflicts = new ArrayList<>();
        studies.stream()
                .filter(study -> Boolean.FALSE.equals(isStudyLinked(experience, details, study)))
                .forEach(
                        study ->
                                conflicts.add(
                                        "학습 기록 '"
                                                + study.getTitle()
                                                + "'은 현재 프로젝트에 연결되어 있지 않습니다."));
        competencies.stream()
                .filter(
                        competency ->
                                Boolean.FALSE.equals(isCompetencyLinked(experience, competency)))
                .forEach(
                        competency ->
                                conflicts.add(
                                        "핵심 역량 '"
                                                + competency.getTitle()
                                                + "'은 현재 프로젝트 근거로 연결되어 있지 않습니다."));
        skills.stream()
                .filter(skill -> Boolean.FALSE.equals(isSkillLinked(experience, details, skill)))
                .forEach(
                        skill ->
                                conflicts.add(
                                        "기술 '"
                                                + skill.getName()
                                                + "'은 현재 프로젝트 사용 기술로 연결되어 있지 않습니다."));
        return conflicts;
    }

    private Boolean isSkillLinked(
            Experience experience, List<ExperienceDetail> details, Skill skill) {
        if (experience == null) return null;
        return safe(experience.getSkills()).stream()
                        .anyMatch(candidate -> candidate.getId().equals(skill.getId()))
                || details.stream()
                        .flatMap(detail -> safe(detail.getSkills()).stream())
                        .anyMatch(candidate -> candidate.getId().equals(skill.getId()));
    }

    private Boolean isStudyLinked(
            Experience experience, List<ExperienceDetail> details, Study study) {
        if (experience == null) return null;
        Set<Long> detailIds =
                details.stream().map(ExperienceDetail::getId).collect(Collectors.toSet());
        return safe(study.getExperiences()).stream()
                        .anyMatch(candidate -> candidate.getId().equals(experience.getId()))
                || safe(study.getExperienceDetails()).stream()
                        .anyMatch(detail -> detailIds.contains(detail.getId()));
    }

    private Boolean isCompetencyLinked(Experience experience, Competency competency) {
        if (experience == null) return null;
        return safe(competency.getEvidences()).stream()
                .anyMatch(evidence -> evidence.getExperience().getId().equals(experience.getId()));
    }

    private List<Competency> resolveCompetencies(Long workspaceId, List<Long> requestedIds) {
        if (requestedIds != null && !requestedIds.isEmpty()) {
            List<Competency> found =
                    workspaceId == null
                            ? competencyRepository.findAllById(requestedIds)
                            : competencyRepository.findAllByWorkspaceIdAndIdIn(
                                    workspaceId, requestedIds);
            return validateSubset(found, requestedIds, "역량");
        }
        return List.of();
    }

    private PortfolioCaseStudyContent readBaseContent(Long baseRevisionId, Long caseStudyId) {
        if (baseRevisionId == null) return null;
        PortfolioCaseStudyRevision revision =
                portfolioCaseStudyRevisionRepository
                        .findById(baseRevisionId)
                        .filter(candidate -> candidate.getCaseStudyId().equals(caseStudyId))
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "현재 케이스스터디에 속하지 않은 기준 revision입니다."));
        try {
            return objectMapper.readValue(
                    revision.getContentJson(), PortfolioCaseStudyContent.class);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "기준 포트폴리오 revision을 읽지 못했습니다.", exception);
        }
    }

    private <T> List<T> validateSubset(List<T> found, List<Long> requestedIds, String label) {
        if (found.size() != requestedIds.size()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "존재하지 않는 " + label + " ID가 포함되어 있습니다.");
        }
        return found;
    }

    private ReadinessAssessment normalizeAssessment(ReadinessAssessment assessment) {
        Coverage emptyCoverage =
                new Coverage(
                        missingCoverage("문제 상황 근거가 없습니다."),
                        missingCoverage("본인의 역할과 행동 근거가 없습니다."),
                        missingCoverage("판단 또는 트레이드오프 근거가 없습니다."),
                        missingCoverage("해결 방법 근거가 없습니다."),
                        missingCoverage("성과 근거가 없습니다."));
        if (assessment == null) {
            return new ReadinessAssessment(
                    "NEEDS_INPUT",
                    emptyCoverage,
                    List.of(),
                    List.of("부족한 사례 맥락을 대화로 보완해 주세요."),
                    List.of("문제, 역할, 판단, 해결, 성과를 각각 설명해 주세요."),
                    "선택한 근거만으로 사례 준비도를 확인하지 못했습니다. 부족한 맥락을 추가로 설명해 주세요.");
        }
        Coverage coverage =
                assessment.coverage() == null ? emptyCoverage : assessment.coverage().normalized();
        String readiness =
                Set.of("READY", "NEEDS_INPUT", "RESELECT").contains(assessment.readiness())
                        ? assessment.readiness()
                        : "NEEDS_INPUT";
        boolean downgraded = "READY".equals(readiness) && !coverage.isComplete();
        if (downgraded) readiness = "NEEDS_INPUT";
        return new ReadinessAssessment(
                readiness,
                coverage,
                safe(assessment.conflicts()).stream()
                        .filter(value -> hasText(value))
                        .limit(10)
                        .map(value -> limit(value, 300))
                        .toList(),
                safe(assessment.suggestions()).stream()
                        .filter(value -> hasText(value))
                        .limit(5)
                        .map(value -> limit(value, 300))
                        .toList(),
                safe(assessment.questions()).stream()
                        .filter(value -> hasText(value))
                        .limit(3)
                        .map(value -> limit(value, 300))
                        .toList(),
                downgraded
                        ? "문제, 역할, 판단, 해결, 성과 중 근거가 부족한 항목이 있습니다. 부족한 맥락을 추가로 설명해 주세요."
                        : hasText(assessment.message())
                                ? limit(assessment.message(), 500)
                                : "선택한 근거를 보완한 뒤 다시 시도해 주세요.");
    }

    private ReadinessAssessment reselectionAssessment(List<String> conflicts) {
        Coverage pendingCoverage =
                new Coverage(
                        pendingCoverage(),
                        pendingCoverage(),
                        pendingCoverage(),
                        pendingCoverage(),
                        pendingCoverage());
        return new ReadinessAssessment(
                "RESELECT",
                pendingCoverage,
                conflicts,
                List.of("현재 프로젝트에 직접 연결된 학습 기록·핵심 역량·기술로 교체해 주세요."),
                List.of(),
                "현재 프로젝트와 연결되지 않은 근거가 포함되어 있습니다. 해당 근거를 제거하거나 같은 프로젝트의 근거로 교체해 주세요.");
    }

    private CoverageItem missingCoverage(String reason) {
        return new CoverageItem("MISSING", reason);
    }

    private CoverageItem pendingCoverage() {
        return new CoverageItem("PARTIAL", "근거를 다시 선택한 뒤 준비도를 확인합니다.");
    }

    private List<Fact> normalizeExtraction(
            ExtractionResponse response, PreparedGeneration prepared) {
        List<Fact> facts =
                safe(response.facts()).stream()
                        .limit(20)
                        .filter(fact -> fact != null && hasText(fact.text()))
                        .filter(
                                fact ->
                                        (fact.experienceDetailId() == null
                                                        || prepared.allowedDetailIds()
                                                                .contains(
                                                                        fact.experienceDetailId()))
                                                && (fact.studyId() == null
                                                        || prepared.allowedStudyIds()
                                                                .contains(fact.studyId())))
                        .map(
                                fact ->
                                        new Fact(
                                                fact.experienceDetailId(),
                                                fact.studyId(),
                                                blankToNull(fact.aspect()),
                                                limit(fact.text(), 500)))
                        .toList();
        if (facts.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY, "1단계 사실관계 정리에서 충분한 근거를 찾지 못했습니다.");
        }
        return facts;
    }

    private PortfolioCaseStudyContent normalize(
            PortfolioCaseStudyContent content, PreparedGeneration prepared) {
        if (!hasText(content.summary())
                || !hasText(content.problem())
                || !hasText(content.solution())) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY, "2단계 초안 작성에서 적합한 결과를 만들지 못했습니다.");
        }
        List<PortfolioCaseStudyContent.Tradeoff> tradeoffs =
                safe(content.tradeoffs()).stream()
                        .limit(4)
                        .filter(t -> t != null && hasText(t.option()))
                        .map(
                                t ->
                                        new PortfolioCaseStudyContent.Tradeoff(
                                                limit(t.option(), 200),
                                                limit(t.pros(), 300),
                                                limit(t.cons(), 300),
                                                limit(t.chosenBecause(), 300)))
                        .toList();
        PortfolioCaseStudyContent.Outcome outcome =
                content.outcome() == null
                        ? new PortfolioCaseStudyContent.Outcome("", List.of())
                        : new PortfolioCaseStudyContent.Outcome(
                                limit(content.outcome().summary(), 300),
                                safe(content.outcome().metrics()).stream()
                                        .limit(6)
                                        .filter(m -> m != null && hasText(m.label()))
                                        .map(
                                                m ->
                                                        new PortfolioCaseStudyContent.Outcome
                                                                .Metric(
                                                                limit(m.label(), 100),
                                                                limit(m.before(), 100),
                                                                limit(m.after(), 100)))
                                        .toList());
        PortfolioCaseStudyContent.Architecture architecture =
                content.architecture() == null
                        ? new PortfolioCaseStudyContent.Architecture(null, List.of(), List.of())
                        : new PortfolioCaseStudyContent.Architecture(
                                blankToNull(content.architecture().mermaidSource()),
                                prepared.baseContent() == null
                                                || prepared.baseContent().architecture() == null
                                        ? List.of()
                                        : safe(
                                                prepared.baseContent()
                                                        .architecture()
                                                        .imageObjectKeys()),
                                List.of());

        List<Long> sourceStudyIds =
                safe(content.sourceStudyIds()).stream()
                        .filter(id -> id != null && prepared.allowedStudyIds().contains(id))
                        .distinct()
                        .toList();
        List<Long> sourceDetailIds =
                safe(content.sourceExperienceDetailIds()).stream()
                        .filter(id -> id != null && prepared.allowedDetailIds().contains(id))
                        .distinct()
                        .toList();

        return new PortfolioCaseStudyContent(
                limit(content.summary(), 150),
                limit(content.problem(), 800),
                limit(content.thoughtProcess(), 800),
                tradeoffs,
                limit(content.solution(), 800),
                outcome,
                architecture,
                sourceStudyIds,
                sourceDetailIds);
    }

    private <T> T parseJson(String raw, Class<T> type, String stage)
            throws JsonProcessingException {
        return AiJsonSupport.parseJson(objectMapper, raw, type, stage);
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

    private interface StreamSink {
        void stage(int stage, String message);

        void token(int stage, String text);

        void facts(List<Fact> facts);

        void readiness(ReadinessAssessment assessment);
    }

    private record PreparedGeneration(
            ExtractionContext extractionContext,
            String instruction,
            Set<Long> allowedDetailIds,
            Set<Long> allowedStudyIds,
            PortfolioCaseStudyContent baseContent,
            List<String> selectionConflicts) {}

    private record StageEvent(String type, int stage, String message) {}

    private record TokenEvent(String type, int stage, String text) {}

    private record FactsEvent(String type, int factCount) {}

    private record CompleteEvent(String type, PortfolioCaseStudyContent content) {}

    private record ReadinessEvent(String type, ReadinessAssessment assessment) {}

    private record ErrorEvent(String type, String message) {}

    private record ExtractionContext(
            String instruction,
            ExperienceFact project,
            List<ExperienceDetailFact> details,
            List<CompetencyFact> competencies,
            List<SkillFact> skills,
            List<StudyFact> studies) {}

    private record ExtractionResponse(List<Fact> facts, ReadinessAssessment assessment) {}

    private record ReadinessAssessment(
            String readiness,
            Coverage coverage,
            List<String> conflicts,
            List<String> suggestions,
            List<String> questions,
            String message) {}

    private record Coverage(
            CoverageItem problem,
            CoverageItem role,
            CoverageItem judgment,
            CoverageItem solution,
            CoverageItem outcome) {
        private boolean isComplete() {
            return isSatisfied(problem)
                    && isSatisfied(role)
                    && isSatisfied(judgment)
                    && isSatisfied(solution)
                    && isSatisfied(outcome);
        }

        private Coverage normalized() {
            return new Coverage(
                    normalizeItem(problem),
                    normalizeItem(role),
                    normalizeItem(judgment),
                    normalizeItem(solution),
                    normalizeItem(outcome));
        }

        private boolean isSatisfied(CoverageItem item) {
            return item != null && "SATISFIED".equals(item.status());
        }

        private CoverageItem normalizeItem(CoverageItem item) {
            if (item == null) return new CoverageItem("MISSING", "근거가 없습니다.");
            String status =
                    Set.of("SATISFIED", "PARTIAL", "MISSING").contains(item.status())
                            ? item.status()
                            : "MISSING";
            return new CoverageItem(status, limit(item.reason(), 300));
        }
    }

    private record CoverageItem(String status, String reason) {}

    private record Fact(Long experienceDetailId, Long studyId, String aspect, String text) {}

    private record WriterContext(
            String instruction, List<Fact> facts, PortfolioCaseStudyContent currentDraft) {}

    private static final class EvidenceReadinessException extends ResponseStatusException {
        private final ReadinessAssessment assessment;

        private EvidenceReadinessException(ReadinessAssessment assessment) {
            super(HttpStatus.UNPROCESSABLE_ENTITY, assessment.message());
            this.assessment = assessment;
        }

        private ReadinessAssessment assessment() {
            return assessment;
        }
    }

    private record ExperienceFact(String title, String summary, String takeaway) {
        static ExperienceFact from(Experience value) {
            return new ExperienceFact(value.getTitle(), value.getSummary(), value.getTakeaway());
        }
    }

    private record ExperienceDetailFact(
            Long id,
            String content,
            String situation,
            String task,
            String actionDetail,
            String outcome) {
        static ExperienceDetailFact from(ExperienceDetail value) {
            return new ExperienceDetailFact(
                    value.getId(),
                    value.getContent(),
                    value.getSituation(),
                    value.getTask(),
                    value.getActionDetail(),
                    value.getOutcome());
        }
    }

    private record SkillFact(Long id, String name, String category, Boolean linkedToProject) {
        static SkillFact from(Skill value, Boolean linkedToProject) {
            return new SkillFact(
                    value.getId(), value.getName(), value.getCategory(), linkedToProject);
        }
    }

    private record CompetencyFact(
            Long id,
            String title,
            String summary,
            List<String> evidences,
            Boolean linkedToProject) {
        static CompetencyFact from(Competency value, Boolean linkedToProject) {
            return new CompetencyFact(
                    value.getId(),
                    value.getTitle(),
                    value.getSummary(),
                    value.getEvidences().stream()
                            .map(evidence -> evidence.getEvidenceSummary())
                            .filter(summary -> summary != null && !summary.isBlank())
                            .toList(),
                    linkedToProject);
        }
    }

    private record StudyFact(
            Long id, String title, String summary, String contentExcerpt, Boolean linkedToProject) {
        static StudyFact from(Study value, Boolean linkedToProject) {
            return new StudyFact(
                    value.getId(),
                    value.getTitle(),
                    value.getSummary(),
                    limit(value.getContentMarkdown(), STUDY_CONTENT_EXCERPT_LIMIT),
                    linkedToProject);
        }
    }
}
