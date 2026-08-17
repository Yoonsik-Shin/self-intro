package com.selfintro.jobposting.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingSourceImage;
import com.selfintro.modules.jobposting.domain.entity.JobPostingSourceUrl;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPlatform;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPositionChoiceRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceImageRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.domain.util.JobPostingUrlNormalizer;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingBulkIngestRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingImageIngestRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import jakarta.persistence.EntityNotFoundException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
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
 * 채용 공고 URL 수집(크롤링+AI 파싱)·재수집·재매칭을 담당한다. 순수 CRUD/상태 관리는 api 모듈의 {@code JobPostingCrudService}가 맡는다
 * — 2026-08 job-posting CRUD/AI 분리 작업으로 쪼갠 절반이다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobPostingService {

    private static final long STREAM_TIMEOUT_MILLIS = 360_000L;
    private static final long HEARTBEAT_INTERVAL_MILLIS = 20_000L;
    // vision 호출 1회의 토큰/타임아웃 한도(VISION_MAX_OUTPUT_TOKENS, VISION_AI_TIMEOUT)를 넘지
    // 않도록 스크린샷(스크롤 캡처) 장수를 제한한다.
    private static final int MAX_INGEST_IMAGE_COUNT = 6;

    private final JobPostingRepository jobPostingRepository;
    private final JobPostingSourceUrlRepository sourceUrlRepository;
    private final JobPostingPositionChoiceRepository positionChoiceRepository;
    private final JobPostingSourceImageRepository sourceImageRepository;
    private final JobApplicationUrlParseService urlParseService;
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
                        posting.getId()),
                positionChoiceRepository.findByJobPostingIdOrderByRankOrderAsc(posting.getId()),
                sourceImageRepository.findByJobPostingIdOrderByDisplayOrderAsc(posting.getId()));
    }

    private SseEmitter createSseEmitter(long timeoutMillis) {
        SseEmitter emitter = new SseEmitter(timeoutMillis);
        emitter.onTimeout(
                () -> {
                    log.info("채용공고 SSE 스트림 타임아웃 발생");
                    emitter.complete();
                });
        emitter.onError(
                ex -> {
                    log.debug("채용공고 SSE 스트림 에러: {}", ex.getMessage());
                });
        return emitter;
    }

    public SseEmitter ingestUrlStream(String url) {
        String trimmed = url.trim();
        String normalized = JobPostingUrlNormalizer.normalizeUrl(trimmed);
        String targetUrl = normalized != null ? normalized : trimmed;
        if (sourceUrlRepository.existsByScopeKeyAndUrl(JobPosting.PLATFORM_SCOPE, targetUrl)
                || sourceUrlRepository.existsByScopeKeyAndUrl(JobPosting.PLATFORM_SCOPE, trimmed)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 수집된 공고입니다.");
        }
        SseEmitter emitter = createSseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual()
                .name("job-posting-ingest-stream")
                .start(() -> streamIngest(targetUrl, emitter));
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
            IngestResult result = ingestUrlInternal(url);
            send(
                    emitter,
                    new CompleteEvent(
                            "complete",
                            result.response(),
                            result.detectedAdditionalPositionTitles()));
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

    /**
     * 스크린샷 등록(기능 B)의 SSE 진입점. vision 호출이 최대 {@link
     * JobApplicationUrlParseService#VISION_AI_TIMEOUT}(120초)까지 걸릴 수 있어, 응답이 아예 없는 구간이 nginx
     * ingress의 기본 프록시 타임아웃보다 길어질 위험이 있다 — {@code ingestUrlStream}과 동일하게 heartbeat로 연결을 유지한다.
     */
    public SseEmitter ingestImagesStream(
            List<JobPostingImageIngestRequest.ImageRef> images, String sourceUrl) {
        SseEmitter emitter = createSseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual()
                .name("job-posting-ingest-images-stream")
                .start(() -> streamImageIngest(images, sourceUrl, emitter));
        return emitter;
    }

    private void streamImageIngest(
            List<JobPostingImageIngestRequest.ImageRef> images,
            String sourceUrl,
            SseEmitter emitter) {
        boolean acquired = false;
        Thread heartbeat = startHeartbeat(emitter);
        try {
            if (!ingestSemaphore.tryAcquire(10, TimeUnit.SECONDS)) {
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "현재 처리 중인 공고 수집 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
            }
            acquired = true;
            IngestResult result = ingestImagesInternal(images, sourceUrl);
            send(
                    emitter,
                    new CompleteEvent(
                            "complete",
                            result.response(),
                            result.detectedAdditionalPositionTitles()));
            emitter.complete();
        } catch (ResponseStatusException exception) {
            log.warn("채용공고 스크린샷 등록 스트리밍 실패: {}", exception.getReason(), exception);
            fail(emitter, exception.getReason() == null ? "공고 등록에 실패했습니다." : exception.getReason());
        } catch (Exception exception) {
            log.warn("채용공고 스크린샷 등록 스트리밍 중 예상하지 못한 오류", exception);
            fail(emitter, "공고 등록 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            heartbeat.interrupt();
            if (acquired) {
                ingestSemaphore.release();
            }
        }
    }

    public SseEmitter ingestUrlsStream(List<JobPostingBulkIngestRequest.Row> rows) {
        List<JobPostingBulkIngestRequest.Row> cleanedRows =
                rows.stream()
                        .map(
                                row ->
                                        new JobPostingBulkIngestRequest.Row(
                                                AiJsonSupport.hasText(row.url())
                                                        ? row.url().trim()
                                                        : null,
                                                row.images()))
                        .filter(row -> AiJsonSupport.hasText(row.url()) || row.hasImages())
                        .toList();

        if (cleanedRows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수집할 공고가 없습니다.");
        }
        if (cleanedRows.size() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "한 번에 최대 5개까지 수집할 수 있습니다.");
        }

        SseEmitter emitter = createSseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual()
                .name("job-posting-bulk-ingest-stream")
                .start(() -> streamBulkIngest(cleanedRows, emitter));
        return emitter;
    }

    private void streamBulkIngest(List<JobPostingBulkIngestRequest.Row> rows, SseEmitter emitter) {
        Thread heartbeat = startHeartbeat(emitter);
        int total = rows.size();
        AtomicInteger completed = new AtomicInteger(0);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);

        try {
            List<Thread> threads = new ArrayList<>();
            for (JobPostingBulkIngestRequest.Row row : rows) {
                // 진행상황/결과 이벤트에 붙이는 라벨. url이 있으면 그걸, 스크린샷만 있는 행이면
                // "스크린샷 N장"으로 표시한다.
                String label =
                        AiJsonSupport.hasText(row.url())
                                ? row.url()
                                : "스크린샷 " + row.images().size() + "장";
                Thread t =
                        Thread.ofVirtual()
                                .start(
                                        () -> {
                                            boolean acquired = false;
                                            try {
                                                // 한 번에 최대 3건만 AI 분석하되, 같은 bulk 요청 안의 나머지 행은
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
                                                                label,
                                                                "processing"));

                                                JobPostingResponse response =
                                                        row.hasImages()
                                                                ? ingestImages(
                                                                        row.images(), row.url())
                                                                : ingestUrl(row.url());
                                                successCount.incrementAndGet();
                                                send(
                                                        emitter,
                                                        new BulkItemSuccessEvent(
                                                                "item_success",
                                                                total,
                                                                completed.incrementAndGet(),
                                                                label,
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
                                                                label,
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
                                                                label,
                                                                "공고 수집 대기가 중단되었습니다."));
                                            } catch (Exception ex) {
                                                log.warn("다중 공고 수집 중 오류: label={}", label, ex);
                                                errorCount.incrementAndGet();
                                                send(
                                                        emitter,
                                                        new BulkItemErrorEvent(
                                                                "item_error",
                                                                total,
                                                                completed.incrementAndGet(),
                                                                label,
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

    private record CompleteEvent(
            String type,
            JobPostingResponse response,
            List<String> detectedAdditionalPositionTitles) {}

    /**
     * 한 페이지/이미지에 직무가 여러 개 나열돼 자동 감지된 경우, 1지망(positionTitle)으로 쓰인 것 외 나머지를 담는다. 자동 저장되지 않으며 SSE
     * complete 이벤트에만 실려 프론트가 지망 선택 UI를 띄울지 판단하는 데 쓰인다.
     */
    private record IngestResult(
            JobPostingResponse response, List<String> detectedAdditionalPositionTitles) {}

    private record ErrorEvent(String type, String message) {}

    private record BulkProgressEvent(
            String type, int total, int current, String label, String status) {}

    private record BulkItemSuccessEvent(
            String type, int total, int current, String label, JobPostingResponse response) {}

    private record BulkItemErrorEvent(
            String type, int total, int current, String label, String message) {}

    private record BulkCompleteEvent(String type, int total, int successCount, int errorCount) {}

    public JobPostingResponse ingestUrl(String url) {
        return ingestUrlInternal(url).response();
    }

    private IngestResult ingestUrlInternal(String url) {
        String trimmed = url.trim();
        String normalized = JobPostingUrlNormalizer.normalizeUrl(trimmed);
        String targetUrl = normalized != null ? normalized : trimmed;
        if (sourceUrlRepository.existsByScopeKeyAndUrl(JobPosting.PLATFORM_SCOPE, targetUrl)
                || sourceUrlRepository.existsByScopeKeyAndUrl(JobPosting.PLATFORM_SCOPE, trimmed)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 수집된 공고입니다.");
        }

        JobApplicationUrlParseResponse parsed = urlParseService.parse(targetUrl);
        if (!AiJsonSupport.hasText(parsed.companyName())
                || !AiJsonSupport.hasText(parsed.positionTitle())) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY, "공고에서 회사명/직무명을 추출하지 못했습니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        JobPostingPlatform platform = JobPostingPlatform.fromUrl(targetUrl);

        // 다른 플랫폼(원티드/잡코리아/사람인 등)에 이미 같은 회사+직무 공고가 있으면 새 행을 만들지
        // 않고 이번 URL을 그 공고의 출처로만 추가한다.
        Optional<JobPosting> existingMatch =
                dedupService.findExistingMatch(parsed.companyName(), parsed.positionTitle());
        if (existingMatch.isPresent()) {
            return new IngestResult(
                    toResponse(
                            dedupService.attachAdditionalUrl(
                                    existingMatch.get().getId(), targetUrl, platform, now)),
                    parsed.additionalPositionTitles());
        }

        JobPosting.Draft draft =
                new JobPosting.Draft(
                        parsed.positionTitle(),
                        parsed.companyName(),
                        targetUrl,
                        null,
                        JobPostingSource.URL_INGEST,
                        combineForMatching(parsed),
                        parsed.location(),
                        parsed.employmentType(),
                        parsed.deadline(),
                        parsed.deadlineTime(),
                        parsed.alwaysOpen(),
                        parsed.salaryNote(),
                        parsed.jobDescription(),
                        parsed.requiredQualifications(),
                        parsed.preferredQualifications(),
                        parsed.hiringProcess(),
                        parsed.applicationMethod(),
                        parsed.compensationDetail());
        JobPosting posting = JobPosting.collect(draft, now);

        try {
            return new IngestResult(
                    toResponse(dedupService.createNew(posting, targetUrl, platform, now)),
                    parsed.additionalPositionTitles());
        } catch (DataIntegrityViolationException exception) {
            // 동시에 들어온 다른 URL(최대 5건 동시 수집)이 같은 회사+직무로 먼저 저장을 끝낸 경우다.
            // dedupService.createNew는 별도 빈의 트랜잭션이라 이 시점엔 이미 롤백이 끝나 있으므로,
            // 방금 커밋된 승자를 다시 찾아 이번 URL을 그쪽에 추가한다.
            JobPosting winner =
                    dedupService
                            .findExistingMatch(parsed.companyName(), parsed.positionTitle())
                            .orElseThrow(() -> exception);
            return new IngestResult(
                    toResponse(
                            dedupService.attachAdditionalUrl(
                                    winner.getId(), targetUrl, platform, now)),
                    parsed.additionalPositionTitles());
        }
    }

    /**
     * URL 파싱이 불가능한 공고를 JD 스크린샷으로 등록한다. URL 자동수집과 동일하게 파싱 즉시 저장하고(사람이 확인은 사후에), 파싱에 쓴 원본 이미지도
     * job_posting_source_image에 영구 보관해 상세 드로어에서 다시 볼 수 있게 한다. 회사명+직무명이 기존 공고와 완전일치하면 새 행을 만들지 않고 그
     * 공고에 이미지만 추가한다({@link JobPostingDedupService}의 URL 버전과 같은 원칙).
     *
     * <p>클래스 기본이 읽기 전용 트랜잭션이라 {@code refresh()}와 같은 이유로 이 메서드에 {@code @Transactional}을 명시해야
     * 한다(2026-08-06 self-invocation 사고 재발 방지).
     */
    @Transactional
    public JobPostingResponse ingestImages(
            List<JobPostingImageIngestRequest.ImageRef> images, String sourceUrl) {
        return ingestImagesInternal(images, sourceUrl).response();
    }

    private IngestResult ingestImagesInternal(
            List<JobPostingImageIngestRequest.ImageRef> images, String sourceUrl) {
        if (images.isEmpty() || images.size() > MAX_INGEST_IMAGE_COUNT) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "이미지는 1장 이상 " + MAX_INGEST_IMAGE_COUNT + "장 이하만 가능합니다.");
        }

        List<NvidiaNimClient.ImagePart> parts =
                images.stream()
                        .map(
                                image ->
                                        urlParseService.downloadImagePart(
                                                image.url(), image.contentType()))
                        .toList();
        JobApplicationUrlParseResponse parsed = urlParseService.parseFromImages(parts);
        String companyName =
                AiJsonSupport.hasText(parsed.companyName()) ? parsed.companyName() : "회사명 미상";
        String positionTitle =
                AiJsonSupport.hasText(parsed.positionTitle())
                        ? parsed.positionTitle()
                        : "수집 공고 (직무 미상)";

        LocalDateTime now = LocalDateTime.now();
        JobPosting posting =
                dedupService
                        .findExistingMatch(companyName, positionTitle)
                        .map(
                                existing -> {
                                    existing.touch(now);
                                    return existing;
                                })
                        .orElseGet(
                                () -> {
                                    JobPosting.Draft draft =
                                            new JobPosting.Draft(
                                                    positionTitle,
                                                    companyName,
                                                    null,
                                                    null,
                                                    JobPostingSource.IMAGE_INGEST,
                                                    combineForMatching(parsed),
                                                    parsed.location(),
                                                    parsed.employmentType(),
                                                    parsed.deadline(),
                                                    parsed.deadlineTime(),
                                                    parsed.alwaysOpen(),
                                                    parsed.salaryNote(),
                                                    parsed.jobDescription(),
                                                    parsed.requiredQualifications(),
                                                    parsed.preferredQualifications(),
                                                    parsed.hiringProcess(),
                                                    parsed.applicationMethod(),
                                                    parsed.compensationDetail());
                                    JobPosting draftEntity = JobPosting.collect(draft, now);
                                    return jobPostingRepository.save(draftEntity);
                                });

        int baseOrder =
                sourceImageRepository
                        .findByJobPostingIdOrderByDisplayOrderAsc(posting.getId())
                        .size();
        for (int i = 0; i < images.size(); i++) {
            JobPostingImageIngestRequest.ImageRef image = images.get(i);
            sourceImageRepository.save(
                    JobPostingSourceImage.of(
                            posting.getId(), image.objectKey(), image.url(), baseOrder + i, now));
        }

        // sourceUrl은 "원본 보기" 링크로만 저장한다 — 이 URL의 텍스트를 다시 파싱해 내용에
        // 섞지 않는다(URL 파싱을 못 믿을 상황이라 스크린샷을 쓴 것이므로, 섞으면 다시
        // 오염된다). job_posting.posting_url(엔티티 컬럼)도 그대로 null로 둬서 "정보
        // 새로고침"이 이 URL을 다시 긁어오지 않게 막는다.
        if (AiJsonSupport.hasText(sourceUrl)) {
            String trimmedUrl = sourceUrl.trim();
            if (!sourceUrlRepository.existsByScopeKeyAndUrl(
                    JobPosting.PLATFORM_SCOPE, trimmedUrl)) {
                JobPostingPlatform platform = JobPostingPlatform.fromUrl(trimmedUrl);
                boolean hasNoSourceUrlYet =
                        sourceUrlRepository
                                .findByJobPostingIdOrderByPrimaryDescCreatedAtAsc(posting.getId())
                                .isEmpty();
                sourceUrlRepository.save(
                        hasNoSourceUrlYet
                                ? JobPostingSourceUrl.primary(
                                        posting.getId(), trimmedUrl, platform, now)
                                : JobPostingSourceUrl.additional(
                                        posting.getId(), trimmedUrl, platform, now));
            }
        }

        return new IngestResult(toResponse(posting), parsed.additionalPositionTitles());
    }

    /**
     * 이미 수집/등록된 공고를 원본 URL에서 다시 읽어 최신 정보로 갱신한다. 회사명/직무명/URL/출처 라벨/메모는 사용자가 직접 관리하는 값이라 건드리지 않고, 그 외
     * 상세 항목은 이번에 새로 읽은 값이 있으면 그걸로 덮어쓰되 없으면(일시적 추출 실패 등) 기존 값을 그대로 둔다 — 재수집 한 번 실패했다고 이미 확보한 상세 정보를
     * 지우지 않기 위해서다. 다만 마감일/상시채용 여부는 이번 결과가 "확실한 정보"(날짜를 읽었거나 상시채용이라고 명시됨)일 때만 갱신한다.
     *
     * <p>클래스 기본이 {@code @Transactional(readOnly = true)}라, 이 메서드에 쓰기 트랜잭션을 명시하지 않으면 아래 {@code
     * updateRefreshedPosting()} 호출이 (같은 빈 안에서의 self-invocation이라 그 메서드 자신의 {@code @Transactional}이
     * 프록시를 못 타고) 이 메서드가 물려받은 읽기 전용 트랜잭션 안에서 그대로 실행된다. 그러면 엔티티 필드는 메모리상 바뀌어 응답엔 새 값이 찍히지만 DB에는 플러시되지
     * 않아, 다음 조회에선 그대로 예전 값(특히 jobDescription 이하 상세 항목)이 나오는 조용한 데이터 유실이 생긴다(2026-08-06 발견).
     */
    public record JobPostingBulkRefreshResult(
            int totalTarget,
            int successCount,
            int failedCount,
            int skippedCount,
            List<String> logs) {}

    /** 등록된 모든 공고(또는 활성 공고)를 원본 URL에서 일괄 다시 읽어 최신 정보(마감시간 등)로 갱신하는 백필 메서드. */
    public JobPostingBulkRefreshResult refreshAll(boolean onlyActive) {
        List<JobPosting> list = jobPostingRepository.findAllByOwnerWorkspaceIdIsNull();
        int total = 0;
        int success = 0;
        int failed = 0;
        int skipped = 0;
        List<String> logs = new ArrayList<>();

        for (JobPosting posting : list) {
            String url = posting.getPostingUrl();
            if (!AiJsonSupport.hasText(url)) {
                skipped++;
                continue;
            }
            if (onlyActive
                    && (posting.getStatus()
                                    == com.selfintro.modules.jobposting.domain.enums
                                            .JobPostingStatus.DISMISSED
                            || posting.getStatus()
                                    == com.selfintro.modules.jobposting.domain.enums
                                            .JobPostingStatus.EXPIRED)) {
                skipped++;
                continue;
            }
            total++;
            try {
                refresh(posting.getId());
                success++;
                logs.add(
                        String.format(
                                "SUCCESS [ID:%d] %s (%s)",
                                posting.getId(),
                                posting.getCompanyName(),
                                posting.getPositionTitle()));
            } catch (Exception e) {
                failed++;
                log.warn(
                        "공고 일괄 갱신 실패 id={}, company={}: {}",
                        posting.getId(),
                        posting.getCompanyName(),
                        e.getMessage());
                logs.add(
                        String.format(
                                "FAILED [ID:%d] %s: %s",
                                posting.getId(), posting.getCompanyName(), e.getMessage()));
            }
        }
        return new JobPostingBulkRefreshResult(total, success, failed, skipped, logs);
    }

    public SseEmitter refreshAllStream(boolean onlyActive) {
        SseEmitter emitter = createSseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual()
                .name("job-posting-refresh-all-stream")
                .start(() -> streamRefreshAll(onlyActive, emitter));
        return emitter;
    }

    private void streamRefreshAll(boolean onlyActive, SseEmitter emitter) {
        Thread heartbeat = startHeartbeat(emitter);
        List<JobPosting> list =
                jobPostingRepository.findAllByOwnerWorkspaceIdIsNull().stream()
                        .filter(p -> AiJsonSupport.hasText(p.getPostingUrl()))
                        .filter(
                                p ->
                                        !onlyActive
                                                || (p.getStatus()
                                                                != com.selfintro.modules.jobposting
                                                                        .domain.enums
                                                                        .JobPostingStatus.DISMISSED
                                                        && p.getStatus()
                                                                != com.selfintro.modules.jobposting
                                                                        .domain.enums
                                                                        .JobPostingStatus.EXPIRED))
                        .toList();

        int total = list.size();
        AtomicInteger completed = new AtomicInteger(0);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);

        try {
            send(
                    emitter,
                    new BulkProgressEvent(
                            "progress",
                            total,
                            0,
                            "전체 공고 재수집 백필 준비 완료 (" + total + "건)",
                            "processing"));

            for (JobPosting posting : list) {
                String label = posting.getCompanyName() + " - " + posting.getPositionTitle();
                boolean acquired = false;
                try {
                    ingestSemaphore.acquire();
                    acquired = true;
                    send(
                            emitter,
                            new BulkProgressEvent(
                                    "progress", total, completed.get(), label, "processing"));

                    JobPostingResponse response = refresh(posting.getId());
                    successCount.incrementAndGet();
                    send(
                            emitter,
                            new BulkItemSuccessEvent(
                                    "item_success",
                                    total,
                                    completed.incrementAndGet(),
                                    label,
                                    response));

                    // 원격 사이트 WAF/IP 차단(Rate Limiting) 방지를 위한 요청 간 500ms 딜레이
                    Thread.sleep(500);
                } catch (Exception ex) {
                    errorCount.incrementAndGet();
                    String msg =
                            ex instanceof ResponseStatusException rse && rse.getReason() != null
                                    ? rse.getReason()
                                    : ex.getMessage();
                    send(
                            emitter,
                            new BulkItemErrorEvent(
                                    "item_error",
                                    total,
                                    completed.incrementAndGet(),
                                    label,
                                    msg != null ? msg : "재수집 실패"));
                } finally {
                    if (acquired) {
                        ingestSemaphore.release();
                    }
                }
            }
            send(
                    emitter,
                    new BulkCompleteEvent("complete", total, successCount.get(), errorCount.get()));
            emitter.complete();
        } catch (Exception ex) {
            fail(emitter, "전체 공고 재수집 중 오류 발생: " + ex.getMessage());
        } finally {
            heartbeat.interrupt();
        }
    }

    @Transactional
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
        LocalDateTime now = LocalDateTime.now();
        boolean deadlineKnown = parsed.deadline() != null || parsed.alwaysOpen();
        posting.update(
                posting.getCompanyName(),
                posting.getPositionTitle(),
                posting.getPostingUrl(),
                posting.getSource(),
                deadlineKnown ? parsed.deadline() : posting.getDeadline(),
                deadlineKnown && parsed.deadlineTime() != null
                        ? parsed.deadlineTime()
                        : posting.getDeadlineTime(),
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
                now);
        // 공용 카탈로그 새로고침은 공고 원문만 갱신한다. Workspace별 매칭 점수는
        // WorkspaceJobApplicationMatchingService에서 해당 Workspace 기술만 사용해 별도로 계산한다.
        posting.refreshRequiredSkillsRaw(
                combineForMatching(
                        posting.getJobDescription(),
                        posting.getRequiredQualifications(),
                        posting.getPreferredQualifications()));
        return toResponse(posting);
    }

    private static String pick(String fresh, String existing) {
        return AiJsonSupport.hasText(fresh) ? fresh : existing;
    }

    /**
     * URL 수집은 사람인 API와 달리 별도의 "요구 기술" 필드가 없어, AI가 뽑아낸 자격요건/우대사항/ 직무상세 텍스트를 합쳐 매칭용 원문으로 쓴다 — 그래야
     * JobMatchingService의 키워드/AI 매칭이 제목만으로 판단하지 않고 실제 요건 텍스트를 근거로 삼을 수 있다.
     */
    private String combineForMatching(JobApplicationUrlParseResponse parsed) {
        return combineForMatching(
                parsed.jobDescription(),
                parsed.requiredQualifications(),
                parsed.preferredQualifications());
    }

    private String combineForMatching(
            String jobDescription, String requiredQualifications, String preferredQualifications) {
        return Stream.of(jobDescription, requiredQualifications, preferredQualifications)
                .filter(AiJsonSupport::hasText)
                .collect(Collectors.joining("\n"));
    }

    private JobPosting findOrThrow(Long id) {
        return jobPostingRepository
                .findByIdAndOwnerWorkspaceIdIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 채용 공고입니다: " + id));
    }
}
