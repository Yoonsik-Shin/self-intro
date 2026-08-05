package com.selfintro.jobposting.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPlatform;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import jakarta.persistence.EntityNotFoundException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 채용 공고 URL 수집(크롤링+AI 파싱)·재수집·재매칭을 담당한다. 순수 CRUD/상태 관리는 api 모듈의
 * {@code JobPostingCrudService}가 맡는다 — 2026-08 job-posting CRUD/AI 분리 작업으로 쪼갠 절반이다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobPostingService {

    private static final long STREAM_TIMEOUT_MILLIS = 360_000L;
    private static final long HEARTBEAT_INTERVAL_MILLIS = 20_000L;

    private final JobPostingRepository jobPostingRepository;
    private final JobPostingSourceUrlRepository sourceUrlRepository;
    private final JobApplicationUrlParseService urlParseService;
    private final JobMatchingService matchingService;
    private final JobPostingDedupService dedupService;
    private final ObjectMapper objectMapper;
    // 이 세마포어는 외부 AI의 전역 쿼터가 아니라 현재 JVM(Pod)의 수집 작업량을 제한한다.
    // bulk 입력 상한과 같은 5를 기본값으로 둬 한 요청의 모든 URL이 즉시 시작되게 한다.
    private Semaphore ingestSemaphore = new Semaphore(5, true);

    @Value("${app.job-posting.ingest-concurrency:5}")
    void configureIngestConcurrency(int concurrency) {
        if (concurrency < 1) {
            throw new IllegalArgumentException("공고 수집 동시성은 1 이상이어야 합니다.");
        }
        ingestSemaphore = new Semaphore(concurrency, true);
    }

    private JobPostingResponse toResponse(JobPosting posting) {
        return JobPostingResponse.from(
                posting,
                sourceUrlRepository.findByJobPostingIdOrderByPrimaryDescCreatedAtAsc(
                        posting.getId()));
    }

    public SseEmitter ingestUrlStream(String url) {
        String trimmed = url.trim();
        if (sourceUrlRepository.existsByUrl(trimmed)) {
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
        Thread heartbeat = startHeartbeat(emitter);
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
            heartbeat.interrupt();
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
        Thread heartbeat = startHeartbeat(emitter);
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
                                                // 한 번에 최대 3건만 AI 분석하되, 같은 bulk 요청 안의 나머지 URL은
                                                // 30초 뒤 실패시키지 않고 앞선 작업이 끝날 때까지 대기시킨다.
                                                // 최대 5건이라는 입력 상한이 있어 대기열이 무한히 늘어나지 않는다.
                                                ingestSemaphore.acquire();
                                                acquired = true;
                                                send(
                                                        emitter,
                                                        new BulkProgressEvent(
                                                                "progress",
                                                                total,
                                                                completed.get(),
                                                                url,
                                                                "processing"));

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
                                            } catch (InterruptedException ex) {
                                                Thread.currentThread().interrupt();
                                                errorCount.incrementAndGet();
                                                send(
                                                        emitter,
                                                        new BulkItemErrorEvent(
                                                                "item_error",
                                                                total,
                                                                completed.incrementAndGet(),
                                                                url,
                                                                "공고 수집 대기가 중단되었습니다."));
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
        } finally {
            heartbeat.interrupt();
        }
    }

    private Thread startHeartbeat(SseEmitter emitter) {
        return Thread.ofVirtual()
                .name("job-posting-sse-heartbeat")
                .start(
                        () -> {
                            try {
                                while (!Thread.currentThread().isInterrupted()) {
                                    Thread.sleep(HEARTBEAT_INTERVAL_MILLIS);
                                    emitter.send(SseEmitter.event().comment("keepalive"));
                                }
                            } catch (InterruptedException exception) {
                                Thread.currentThread().interrupt();
                            } catch (IOException | IllegalStateException exception) {
                                log.debug("채용공고 SSE heartbeat 종료", exception);
                            }
                        });
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

    public JobPostingResponse ingestUrl(String url) {
        String trimmed = url.trim();
        if (sourceUrlRepository.existsByUrl(trimmed)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 수집된 공고입니다.");
        }

        JobApplicationUrlParseResponse parsed = urlParseService.parse(trimmed);
        if (!AiJsonSupport.hasText(parsed.companyName())
                || !AiJsonSupport.hasText(parsed.positionTitle())) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY, "공고에서 회사명/직무명을 추출하지 못했습니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        JobPostingPlatform platform = JobPostingPlatform.fromUrl(trimmed);

        // 다른 플랫폼(원티드/잡코리아/사람인 등)에 이미 같은 회사+직무 공고가 있으면 새 행을 만들지
        // 않고 이번 URL을 그 공고의 출처로만 추가한다.
        java.util.Optional<JobPosting> existingMatch =
                dedupService.findExistingMatch(parsed.companyName(), parsed.positionTitle());
        if (existingMatch.isPresent()) {
            return toResponse(
                    dedupService.attachAdditionalUrl(
                            existingMatch.get().getId(), trimmed, platform, now));
        }

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

        try {
            return toResponse(dedupService.createNew(posting, trimmed, platform, now));
        } catch (DataIntegrityViolationException exception) {
            // 동시에 들어온 다른 URL(최대 5건 동시 수집)이 같은 회사+직무로 먼저 저장을 끝낸 경우다.
            // dedupService.createNew는 별도 빈의 트랜잭션이라 이 시점엔 이미 롤백이 끝나 있으므로,
            // 방금 커밋된 승자를 다시 찾아 이번 URL을 그쪽에 추가한다.
            JobPosting winner =
                    dedupService
                            .findExistingMatch(parsed.companyName(), parsed.positionTitle())
                            .orElseThrow(() -> exception);
            return toResponse(
                    dedupService.attachAdditionalUrl(winner.getId(), trimmed, platform, now));
        }
    }

    /**
     * 이미 수집/등록된 공고를 원본 URL에서 다시 읽어 최신 정보로 갱신한다. 회사명/직무명/URL/출처 라벨/메모는 사용자가 직접 관리하는 값이라 건드리지 않고, 그 외
     * 상세 항목은 이번에 새로 읽은 값이 있으면 그걸로 덮어쓰되 없으면(일시적 추출 실패 등) 기존 값을 그대로 둔다 — 재수집 한 번 실패했다고 이미 확보한 상세 정보를
     * 지우지 않기 위해서다. 다만 마감일/상시채용 여부는 이번 결과가 "확실한 정보"(날짜를 읽었거나 상시채용이라고 명시됨)일 때만 갱신한다.
     */
    public JobPostingResponse refresh(Long id) {
        JobPosting posting = findOrThrow(id);
        if (!AiJsonSupport.hasText(posting.getPostingUrl())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "등록된 공고 URL이 없어 다시 수집할 수 없습니다.");
        }

        JobApplicationUrlParseResponse parsed = urlParseService.parse(posting.getPostingUrl());
        return updateRefreshedPosting(id, parsed);
    }

    @Transactional
    public JobPostingResponse updateRefreshedPosting(
            Long id, JobApplicationUrlParseResponse parsed) {
        JobPosting posting = findOrThrow(id);
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
        return toResponse(posting);
    }

    private static String pick(String fresh, String existing) {
        return AiJsonSupport.hasText(fresh) ? fresh : existing;
    }

    /** 자동 매칭 점수를 현재 보유 기술 스택 기준으로 다시 계산한다(이미 점수가 있어도 덮어쓴다). */
    @Transactional
    public JobPostingResponse rematch(Long id) {
        JobPosting posting = findOrThrow(id);
        JobMatchingService.MatchResult match =
                matchingService.evaluate(
                        posting.getPositionTitle(), posting.getRequiredSkillsRaw());
        posting.applyMatch(match.score(), match.reason(), LocalDateTime.now());
        return toResponse(posting);
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
