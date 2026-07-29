package com.selfintro.modules.jobapplication.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.modules.jobapplication.domain.entity.JobPosting;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingSetting;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingStatusEvent;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingStatus;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingSettingRepository;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingStatusEventRepository;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingSettingRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingSettingResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingStatusEventResponse;
import jakarta.persistence.EntityNotFoundException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
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

/**
 * 채용 공고 하나를 발견(수집)부터 지원 결과까지 관리한다. 예전에는 "아직 지원 안 한 후보"와 "이미 지원한 공고"를 서로 다른 서비스가 다뤘지만, {@link
 * JobPosting}이 하나의 생애주기 엔티티로 통합되면서 이 서비스도 하나로 합쳤다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobPostingService {

    private static final long STREAM_TIMEOUT_MILLIS = 300_000L;

    private final JobPostingRepository jobPostingRepository;
    private final JobPostingStatusEventRepository statusEventRepository;
    private final JobPostingSettingRepository settingRepository;
    private final JobApplicationUrlParseService urlParseService;
    private final JobMatchingService matchingService;
    private final ObjectMapper objectMapper;
    private final Semaphore ingestSemaphore = new Semaphore(3);

    public List<JobPostingResponse> list() {
        return jobPostingRepository
                .findByStatusNotOrderByCreatedAtDesc(JobPostingStatus.EXPIRED)
                .stream()
                .map(JobPostingResponse::from)
                .toList();
    }

    public JobPostingResponse get(Long id) {
        return JobPostingResponse.from(findOrThrow(id));
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

    /** "새 지원 공고 등록" — 수집 단계 없이 이미 지원 완료한 공고를 바로 기록한다. */
    @Transactional
    public JobPostingResponse create(JobPostingRequest request) {
        if (AiJsonSupport.hasText(request.postingUrl())
                && jobPostingRepository.existsByPostingUrl(request.postingUrl())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 등록된 URL의 공고입니다.");
        }
        LocalDateTime now = LocalDateTime.now();
        JobPosting posting =
                jobPostingRepository.save(
                        JobPosting.registerApplied(
                                request.companyName(),
                                request.positionTitle(),
                                request.postingUrl(),
                                request.source(),
                                request.appliedAt(),
                                request.deadline(),
                                request.alwaysOpen(),
                                request.salaryNote(),
                                request.location(),
                                request.employmentType(),
                                request.memo(),
                                request.jobDescription(),
                                request.requiredQualifications(),
                                request.preferredQualifications(),
                                request.hiringProcess(),
                                request.applicationMethod(),
                                request.compensationDetail(),
                                now));
        statusEventRepository.save(
                JobPostingStatusEvent.of(posting.getId(), JobPostingStatus.APPLIED, "지원 등록", now));
        return JobPostingResponse.from(posting);
    }

    /** 지원 전/후 어느 단계든 동일하게 편집한다(상태·지원일은 별도 엔드포인트가 담당). */
    @Transactional
    public JobPostingResponse update(Long id, JobPostingRequest request) {
        JobPosting posting = findOrThrow(id);
        posting.update(
                request.companyName(),
                request.positionTitle(),
                request.postingUrl(),
                request.source(),
                request.deadline(),
                request.alwaysOpen(),
                request.salaryNote(),
                request.location(),
                request.employmentType(),
                request.memo(),
                request.jobDescription(),
                request.requiredQualifications(),
                request.preferredQualifications(),
                request.hiringProcess(),
                request.applicationMethod(),
                request.compensationDetail(),
                LocalDateTime.now());
        return JobPostingResponse.from(posting);
    }

    @Transactional
    public JobPostingResponse updateMemo(Long id, String memo) {
        JobPosting posting = findOrThrow(id);
        posting.updateMemo(memo, LocalDateTime.now());
        return JobPostingResponse.from(posting);
    }

    @Transactional
    public void delete(Long id) {
        jobPostingRepository.delete(findOrThrow(id));
    }

    public SseEmitter ingestUrlStream(String url) {
        String trimmed = url.trim();
        if (jobPostingRepository.existsByPostingUrl(trimmed)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 수집된 공고입니다.");
        }
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual()
                .name("job-posting-ingest-stream")
                .start(() -> streamIngest(trimmed, emitter));
        return emitter;
    }

    private void streamIngest(String url, SseEmitter emitter) {
        boolean acquired = false;
        try {
            if (!ingestSemaphore.tryAcquire(10, TimeUnit.SECONDS)) {
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "현재 처리 중인 공고 수집 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
            }
            acquired = true;
            JobPostingResponse response = ingestUrl(url);
            send(emitter, new CompleteEvent("complete", response));
            emitter.complete();
        } catch (ResponseStatusException exception) {
            log.warn("채용공고 수집 스트리밍 실패: {}", exception.getReason(), exception);
            fail(emitter, exception.getReason() == null ? "공고 수집에 실패했습니다." : exception.getReason());
        } catch (Exception exception) {
            log.warn("채용공고 수집 스트리밍 중 예상하지 못한 오류", exception);
            fail(emitter, "공고 수집 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            if (acquired) {
                ingestSemaphore.release();
            }
        }
    }

    public SseEmitter ingestUrlsStream(List<String> urls) {
        List<String> cleanedUrls =
                urls.stream()
                        .filter(u -> u != null && !u.trim().isBlank())
                        .map(String::trim)
                        .distinct()
                        .toList();

        if (cleanedUrls.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수집할 URL이 없습니다.");
        }
        if (cleanedUrls.size() > 5) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "한 번에 최대 5개의 URL까지 수집할 수 있습니다.");
        }

        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual()
                .name("job-posting-bulk-ingest-stream")
                .start(() -> streamBulkIngest(cleanedUrls, emitter));
        return emitter;
    }

    private void streamBulkIngest(List<String> urls, SseEmitter emitter) {
        int total = urls.size();
        java.util.concurrent.atomic.AtomicInteger completed =
                new java.util.concurrent.atomic.AtomicInteger(0);
        java.util.concurrent.atomic.AtomicInteger successCount =
                new java.util.concurrent.atomic.AtomicInteger(0);
        java.util.concurrent.atomic.AtomicInteger errorCount =
                new java.util.concurrent.atomic.AtomicInteger(0);

        try {
            List<Thread> threads = new ArrayList<>();
            for (String url : urls) {
                Thread t =
                        Thread.ofVirtual()
                                .start(
                                        () -> {
                                            boolean acquired = false;
                                            try {
                                                send(
                                                        emitter,
                                                        new BulkProgressEvent(
                                                                "progress",
                                                                total,
                                                                completed.get(),
                                                                url,
                                                                "processing"));
                                                if (!ingestSemaphore.tryAcquire(
                                                        30, TimeUnit.SECONDS)) {
                                                    errorCount.incrementAndGet();
                                                    send(
                                                            emitter,
                                                            new BulkItemErrorEvent(
                                                                    "item_error",
                                                                    total,
                                                                    completed.incrementAndGet(),
                                                                    url,
                                                                    "서버가 바빠 수집을 시작하지 못했습니다."));
                                                    return;
                                                }
                                                acquired = true;

                                                JobPostingResponse response = ingestUrl(url);
                                                successCount.incrementAndGet();
                                                send(
                                                        emitter,
                                                        new BulkItemSuccessEvent(
                                                                "item_success",
                                                                total,
                                                                completed.incrementAndGet(),
                                                                url,
                                                                response));
                                            } catch (ResponseStatusException ex) {
                                                errorCount.incrementAndGet();
                                                String msg =
                                                        ex.getReason() != null
                                                                ? ex.getReason()
                                                                : "수집 실패";
                                                send(
                                                        emitter,
                                                        new BulkItemErrorEvent(
                                                                "item_error",
                                                                total,
                                                                completed.incrementAndGet(),
                                                                url,
                                                                msg));
                                            } catch (Exception ex) {
                                                log.warn("다중 공고 수집 중 오류: url={}", url, ex);
                                                errorCount.incrementAndGet();
                                                send(
                                                        emitter,
                                                        new BulkItemErrorEvent(
                                                                "item_error",
                                                                total,
                                                                completed.incrementAndGet(),
                                                                url,
                                                                "공고 수집 중 오류가 발생했습니다."));
                                            } finally {
                                                if (acquired) {
                                                    ingestSemaphore.release();
                                                }
                                            }
                                        });
                threads.add(t);
            }

            for (Thread t : threads) {
                try {
                    t.join();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }

            send(
                    emitter,
                    new BulkCompleteEvent("complete", total, successCount.get(), errorCount.get()));
            emitter.complete();
        } catch (Exception ex) {
            log.warn("다중 공고 수집 스트림 중 예외 발생", ex);
            fail(emitter, "다중 공고 수집 처리 중 오류가 발생했습니다.");
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

    private record CompleteEvent(String type, JobPostingResponse response) {}

    private record ErrorEvent(String type, String message) {}

    private record BulkProgressEvent(
            String type, int total, int current, String url, String status) {}

    private record BulkItemSuccessEvent(
            String type, int total, int current, String url, JobPostingResponse response) {}

    private record BulkItemErrorEvent(
            String type, int total, int current, String url, String message) {}

    private record BulkCompleteEvent(String type, int total, int successCount, int errorCount) {}

    @Transactional
    public JobPostingResponse ingestUrl(String url) {
        String trimmed = url.trim();
        if (jobPostingRepository.existsByPostingUrl(trimmed)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 수집된 공고입니다.");
        }

        JobApplicationUrlParseResponse parsed = urlParseService.parse(trimmed);
        if (!AiJsonSupport.hasText(parsed.companyName())
                || !AiJsonSupport.hasText(parsed.positionTitle())) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY, "공고에서 회사명/직무명을 추출하지 못했습니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        JobPosting.Draft draft =
                new JobPosting.Draft(
                        parsed.positionTitle(),
                        parsed.companyName(),
                        trimmed,
                        null,
                        JobPostingSource.URL_INGEST,
                        combineForMatching(parsed),
                        parsed.location(),
                        parsed.employmentType(),
                        parsed.deadline(),
                        parsed.alwaysOpen(),
                        parsed.salaryNote(),
                        parsed.jobDescription(),
                        parsed.requiredQualifications(),
                        parsed.preferredQualifications(),
                        parsed.hiringProcess(),
                        parsed.applicationMethod(),
                        parsed.compensationDetail());
        JobPosting posting = JobPosting.collect(draft, now);

        JobMatchingService.MatchResult match =
                matchingService.evaluate(
                        posting.getPositionTitle(), posting.getRequiredSkillsRaw());
        posting.applyMatch(match.score(), match.reason(), now);

        return JobPostingResponse.from(jobPostingRepository.save(posting));
    }

    /**
     * 이미 수집/등록된 공고를 원본 URL에서 다시 읽어 최신 정보로 갱신한다. 회사명/직무명/URL/출처 라벨/메모는 사용자가 직접 관리하는 값이라 건드리지 않고, 그 외
     * 상세 항목은 이번에 새로 읽은 값이 있으면 그걸로 덮어쓰되 없으면(일시적 추출 실패 등) 기존 값을 그대로 둔다 — 재수집 한 번 실패했다고 이미 확보한 상세 정보를
     * 지우지 않기 위해서다. 다만 마감일/상시채용 여부는 이번 결과가 "확실한 정보"(날짜를 읽었거나 상시채용이라고 명시됨)일 때만 갱신한다.
     */
    @Transactional
    public JobPostingResponse refresh(Long id) {
        JobPosting posting = findOrThrow(id);
        if (!AiJsonSupport.hasText(posting.getPostingUrl())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "등록된 공고 URL이 없어 다시 수집할 수 없습니다.");
        }

        JobApplicationUrlParseResponse parsed = urlParseService.parse(posting.getPostingUrl());
        boolean deadlineKnown = parsed.deadline() != null || parsed.alwaysOpen();
        posting.update(
                posting.getCompanyName(),
                posting.getPositionTitle(),
                posting.getPostingUrl(),
                posting.getSource(),
                deadlineKnown ? parsed.deadline() : posting.getDeadline(),
                deadlineKnown ? parsed.alwaysOpen() : posting.isAlwaysOpen(),
                pick(parsed.salaryNote(), posting.getSalaryNote()),
                pick(parsed.location(), posting.getLocation()),
                pick(parsed.employmentType(), posting.getEmploymentType()),
                posting.getMemo(),
                pick(parsed.jobDescription(), posting.getJobDescription()),
                pick(parsed.requiredQualifications(), posting.getRequiredQualifications()),
                pick(parsed.preferredQualifications(), posting.getPreferredQualifications()),
                pick(parsed.hiringProcess(), posting.getHiringProcess()),
                pick(parsed.applicationMethod(), posting.getApplicationMethod()),
                pick(parsed.compensationDetail(), posting.getCompensationDetail()),
                LocalDateTime.now());
        return JobPostingResponse.from(posting);
    }

    private static String pick(String fresh, String existing) {
        return AiJsonSupport.hasText(fresh) ? fresh : existing;
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
        JobPosting posting = findOrThrow(id);
        LocalDateTime now = LocalDateTime.now();
        posting.dismiss(now);
        statusEventRepository.save(
                JobPostingStatusEvent.of(
                        posting.getId(), JobPostingStatus.DISMISSED, "숨김 처리", now));
    }

    @Transactional
    public void undismiss(Long id) {
        JobPosting posting = findOrThrow(id);
        if (posting.getStatus() == JobPostingStatus.DISMISSED) {
            LocalDateTime now = LocalDateTime.now();
            List<JobPostingStatusEvent> events =
                    statusEventRepository.findByJobPostingIdOrderByChangedAtAsc(id);
            JobPostingStatus restoreStatus = JobPostingStatus.NEW;
            for (int i = events.size() - 1; i >= 0; i--) {
                JobPostingStatus s = events.get(i).getStatus();
                if (s != JobPostingStatus.DISMISSED) {
                    restoreStatus = s;
                    break;
                }
            }
            if (posting.getAppliedAt() != null && restoreStatus == JobPostingStatus.NEW) {
                restoreStatus = JobPostingStatus.APPLIED;
            }
            posting.changeStatus(restoreStatus, now);
            statusEventRepository.save(
                    JobPostingStatusEvent.of(posting.getId(), restoreStatus, "숨김 해제", now));
        }
    }

    /** 지원 전 후보를 "지원 완료" 상태로 전환한다("전환" 버튼) — 새 행을 만들지 않고 이 행 자체의 상태를 바꾼다. */
    @Transactional
    public JobPostingResponse apply(Long id) {
        JobPosting posting = findOrThrow(id);
        LocalDateTime now = LocalDateTime.now();
        posting.apply(LocalDate.now(), now);
        statusEventRepository.save(
                JobPostingStatusEvent.of(posting.getId(), JobPostingStatus.APPLIED, "지원 전환", now));
        return JobPostingResponse.from(posting);
    }

    @Transactional
    public JobPostingResponse unapply(Long id) {
        JobPosting posting = findOrThrow(id);
        LocalDateTime now = LocalDateTime.now();
        posting.unapply(now);
        statusEventRepository.save(
                JobPostingStatusEvent.of(posting.getId(), JobPostingStatus.NEW, "지원 취소", now));
        return JobPostingResponse.from(posting);
    }

    @Transactional
    public JobPostingResponse changeStatus(Long id, JobPostingStatus status, String memo) {
        JobPosting posting = findOrThrow(id);
        LocalDateTime now = LocalDateTime.now();
        posting.changeStatus(status, now);
        statusEventRepository.save(JobPostingStatusEvent.of(posting.getId(), status, memo, now));
        return JobPostingResponse.from(posting);
    }

    public List<JobPostingStatusEventResponse> statusEvents(Long id) {
        findOrThrow(id);
        return statusEventRepository.findByJobPostingIdOrderByChangedAtAsc(id).stream()
                .map(JobPostingStatusEventResponse::from)
                .toList();
    }

    @Transactional
    public JobPostingResponse deleteStatusEvent(Long id, Long eventId) {
        JobPosting posting = findOrThrow(id);
        JobPostingStatusEvent event =
                statusEventRepository
                        .findById(eventId)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "상태 이력을 찾을 수 없습니다. id=" + eventId));

        if (!event.getJobPostingId().equals(id)) {
            throw new IllegalArgumentException("해당 공고의 상태 이력이 아닙니다.");
        }

        statusEventRepository.delete(event);

        List<JobPostingStatusEvent> remainingEvents =
                statusEventRepository.findByJobPostingIdOrderByChangedAtAsc(id);
        if (!remainingEvents.isEmpty()) {
            JobPostingStatusEvent latestEvent = remainingEvents.get(remainingEvents.size() - 1);
            posting.changeStatus(latestEvent.getStatus(), latestEvent.getChangedAt());
        }

        return JobPostingResponse.from(posting);
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

    private JobPosting findOrThrow(Long id) {
        return jobPostingRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 채용 공고입니다: " + id));
    }
}
