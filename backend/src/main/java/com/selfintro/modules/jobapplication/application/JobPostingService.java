package com.selfintro.modules.jobapplication.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingCandidate;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingSetting;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingCandidateStatus;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingCandidateRepository;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingSettingRepository;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingCandidateResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingCandidateUpdateRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingSettingRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingSettingResponse;
import jakarta.persistence.EntityNotFoundException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** 채용 공고를 URL로 수집해 "아직 지원하지 않은 후보" 상태로 관리한다. */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobPostingService {

    private static final long STREAM_TIMEOUT_MILLIS = 300_000L;

    // 제외(DISMISSED)해도 목록에서는 계속 보여준다 — 화면(리스트뷰)에서 걸러내는 게 아니라 여기서
    // 아예 안 내려주면 리스트에서도 사라지므로, "지금 수집" 정리로 EXPIRED가 되기 전까지는 포함한다.
    private static final List<JobPostingCandidateStatus> LISTABLE_STATUSES =
            List.of(
                    JobPostingCandidateStatus.NEW,
                    JobPostingCandidateStatus.SAVED,
                    JobPostingCandidateStatus.DISMISSED);

    private final JobPostingCandidateRepository candidateRepository;
    private final JobPostingSettingRepository settingRepository;
    private final JobApplicationService jobApplicationService;
    private final JobApplicationUrlParseService urlParseService;
    private final JobMatchingService matchingService;
    private final ObjectMapper objectMapper;
    private final AtomicBoolean ingesting = new AtomicBoolean(false);

    public List<JobPostingCandidateResponse> list() {
        return candidateRepository.findByStatusInOrderByFetchedAtDesc(LISTABLE_STATUSES).stream()
                .map(JobPostingCandidateResponse::from)
                .toList();
    }

    public JobPostingSettingResponse getSettings() {
        return JobPostingSettingResponse.from(settingRepository.getOrCreateDefault());
    }

    @Transactional
    public JobPostingSettingResponse updateSettings(JobPostingSettingRequest request) {
        String cron = request.collectorCron().trim();
        if (!CronExpression.isValidExpression(cron)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "유효하지 않은 cron 표현식입니다: " + cron);
        }

        JobPostingSetting setting = settingRepository.getOrCreateDefault();
        setting.update(
                request.saraminEnabled(),
                AiJsonSupport.blankToNull(request.searchKeywords()),
                request.searchCount(),
                request.searchSort().trim(),
                AiJsonSupport.blankToNull(request.locationCode()),
                AiJsonSupport.blankToNull(request.jobCode()),
                AiJsonSupport.blankToNull(request.industryCode()),
                request.collectorScheduledEnabled(),
                request.matchingKeywordThreshold(),
                cron,
                LocalDateTime.now());
        return JobPostingSettingResponse.from(setting);
    }

    public SseEmitter ingestUrlStream(String url) {
        String trimmed = url.trim();
        if (candidateRepository.existsByUrl(trimmed)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 수집된 공고입니다.");
        }
        if (!ingesting.compareAndSet(false, true)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "이미 공고를 수집하고 있습니다.");
        }
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual()
                .name("job-posting-ingest-stream")
                .start(() -> streamIngest(trimmed, emitter));
        return emitter;
    }

    private void streamIngest(String url, SseEmitter emitter) {
        try {
            JobPostingCandidateResponse response = ingestUrl(url);
            send(emitter, new CompleteEvent("complete", response));
            emitter.complete();
        } catch (ResponseStatusException exception) {
            log.warn("채용공고 수집 스트리밍 실패: {}", exception.getReason(), exception);
            fail(emitter, exception.getReason() == null ? "공고 수집에 실패했습니다." : exception.getReason());
        } catch (Exception exception) {
            log.warn("채용공고 수집 스트리밍 중 예상하지 못한 오류", exception);
            fail(emitter, "공고 수집 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            ingesting.set(false);
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

    private record CompleteEvent(String type, JobPostingCandidateResponse response) {}

    private record ErrorEvent(String type, String message) {}

    @Transactional
    public JobPostingCandidateResponse ingestUrl(String url) {
        String trimmed = url.trim();
        if (candidateRepository.existsByUrl(trimmed)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 수집된 공고입니다.");
        }

        JobApplicationUrlParseResponse parsed = urlParseService.parse(trimmed);
        if (!AiJsonSupport.hasText(parsed.companyName())
                || !AiJsonSupport.hasText(parsed.positionTitle())) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY, "공고에서 회사명/직무명을 추출하지 못했습니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        JobPostingCandidate.Draft draft =
                new JobPostingCandidate.Draft(
                        null,
                        parsed.positionTitle(),
                        parsed.companyName(),
                        trimmed,
                        JobPostingSource.URL_INGEST,
                        combineForMatching(parsed),
                        parsed.location(),
                        parsed.employmentType(),
                        parsed.deadline(),
                        parsed.salaryNote(),
                        parsed.jobDescription(),
                        parsed.requiredQualifications(),
                        parsed.preferredQualifications(),
                        parsed.hiringProcess(),
                        parsed.applicationMethod(),
                        parsed.compensationDetail());
        JobPostingCandidate candidate = JobPostingCandidate.create(draft, now);

        JobMatchingService.MatchResult match =
                matchingService.evaluate(candidate.getTitle(), candidate.getRequiredSkillsRaw());
        candidate.applyMatch(match.score(), match.reason(), now);

        return JobPostingCandidateResponse.from(candidateRepository.save(candidate));
    }

    @Transactional
    public void save(Long id) {
        findOrThrow(id).save(LocalDateTime.now());
    }

    @Transactional
    public void unsave(Long id) {
        findOrThrow(id).unsave(LocalDateTime.now());
    }

    @Transactional
    public void dismiss(Long id) {
        findOrThrow(id).dismiss(LocalDateTime.now());
    }

    @Transactional
    public void undismiss(Long id) {
        findOrThrow(id).undismiss(LocalDateTime.now());
    }

    @Transactional
    public void deleteCandidate(Long id) {
        JobPostingCandidate candidate = findOrThrow(id);
        if (candidate.getStatus() == JobPostingCandidateStatus.CONVERTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 지원 공고로 전환된 후보는 삭제할 수 없습니다.");
        }
        candidateRepository.delete(candidate);
    }

    @Transactional
    public JobPostingCandidateResponse updateCandidate(
            Long id, JobPostingCandidateUpdateRequest request) {
        JobPostingCandidate candidate = findOrThrow(id);
        candidate.updateDetails(
                request.title(),
                request.companyName(),
                request.deadline(),
                request.salaryNote(),
                request.location(),
                request.employmentType(),
                request.jobDescription(),
                request.requiredQualifications(),
                request.preferredQualifications(),
                request.hiringProcess(),
                request.applicationMethod(),
                request.compensationDetail(),
                LocalDateTime.now());
        return JobPostingCandidateResponse.from(candidate);
    }

    @Transactional
    public JobApplicationResponse convertToApplication(Long id) {
        JobPostingCandidate candidate = findOrThrow(id);
        JobApplicationRequest request =
                new JobApplicationRequest(
                        candidate.getCompanyName(),
                        candidate.getTitle(),
                        candidate.getUrl(),
                        sourceLabel(candidate.getSource()),
                        LocalDate.now(),
                        candidate.getDeadline(),
                        candidate.getSalaryNote(),
                        null,
                        candidate.getJobDescription(),
                        candidate.getRequiredQualifications(),
                        candidate.getPreferredQualifications(),
                        candidate.getHiringProcess(),
                        candidate.getApplicationMethod(),
                        candidate.getCompensationDetail());
        JobApplicationResponse response = jobApplicationService.create(request, candidate.getId());
        candidate.markConverted(LocalDateTime.now());
        return response;
    }

    /**
     * URL 수집은 사람인 API와 달리 별도의 "요구 기술" 필드가 없어, AI가 뽑아낸 자격요건/우대사항/ 직무상세 텍스트를 합쳐 매칭용 원문으로 쓴다 — 그래야
     * JobMatchingService의 키워드/AI 매칭이 제목만으로 판단하지 않고 실제 요건 텍스트를 근거로 삼을 수 있다.
     */
    private String combineForMatching(JobApplicationUrlParseResponse parsed) {
        return Stream.of(
                        parsed.jobDescription(),
                        parsed.requiredQualifications(),
                        parsed.preferredQualifications())
                .filter(AiJsonSupport::hasText)
                .collect(Collectors.joining("\n"));
    }

    private String sourceLabel(JobPostingSource source) {
        return switch (source) {
            case URL_INGEST -> "URL 수집";
            case SARAMIN -> "사람인";
        };
    }

    private JobPostingCandidate findOrThrow(Long id) {
        return candidateRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 수집 공고입니다: " + id));
    }
}
