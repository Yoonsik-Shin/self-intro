package com.selfintro.modules.jobapplication.application;

import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingSetting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingSourceUrl;
import com.selfintro.modules.jobposting.domain.entity.JobPostingStatusEvent;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPlatform;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSettingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingStatusEventRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingSettingRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingSettingResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingStatusEventResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * job_posting의 순수 CRUD/상태 관리만 담당한다. URL 파싱·크롤링·AI 매칭이 필요한 부분(수집/재수집/재매칭/백필 등)은
 * ai-worker의 {@code JobPostingService}가 그대로 맡는다 — 2026-08 job-posting CRUD/AI 분리 작업으로 쪼갠 절반이다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobPostingCrudService {

    private final JobPostingRepository jobPostingRepository;
    private final JobPostingSourceUrlRepository sourceUrlRepository;
    private final JobPostingStatusEventRepository statusEventRepository;
    private final JobPostingSettingRepository settingRepository;

    public List<JobPostingResponse> list() {
        List<JobPosting> postings =
                jobPostingRepository.findByStatusNotOrderByCreatedAtDesc(JobPostingStatus.EXPIRED);
        List<Long> ids = postings.stream().map(JobPosting::getId).toList();
        java.util.Map<Long, List<JobPostingSourceUrl>> sourceUrlsByPostingId =
                sourceUrlRepository.findByJobPostingIdInOrderByPrimaryDescCreatedAtAsc(ids).stream()
                        .collect(Collectors.groupingBy(JobPostingSourceUrl::getJobPostingId));
        return postings.stream()
                .map(
                        posting ->
                                JobPostingResponse.from(
                                        posting,
                                        sourceUrlsByPostingId.getOrDefault(
                                                posting.getId(), List.of())))
                .toList();
    }

    public JobPostingResponse get(Long id) {
        return toResponse(findOrThrow(id));
    }

    private JobPostingResponse toResponse(JobPosting posting) {
        return JobPostingResponse.from(
                posting,
                sourceUrlRepository.findByJobPostingIdOrderByPrimaryDescCreatedAtAsc(
                        posting.getId()));
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
        setting.updateHomeLocation(
                AiJsonSupport.blankToNull(request.homeAddress()),
                request.homeLatitude(),
                request.homeLongitude(),
                LocalDateTime.now());
        return JobPostingSettingResponse.from(setting);
    }

    /** "새 지원 공고 등록" — 수집 단계 없이 이미 지원 완료한 공고를 바로 기록한다. */
    @Transactional
    public JobPostingResponse create(JobPostingRequest request) {
        if (AiJsonSupport.hasText(request.postingUrl())
                && sourceUrlRepository.existsByUrl(request.postingUrl())) {
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
        if (AiJsonSupport.hasText(request.postingUrl())) {
            sourceUrlRepository.save(
                    JobPostingSourceUrl.primary(
                            posting.getId(),
                            request.postingUrl(),
                            JobPostingPlatform.fromUrl(request.postingUrl()),
                            now));
        }
        statusEventRepository.save(
                JobPostingStatusEvent.of(posting.getId(), JobPostingStatus.APPLIED, "지원 등록", now));
        return toResponse(posting);
    }

    /** 지원 전/후 어느 단계든 동일하게 편집한다(상태·지원일은 별도 엔드포인트가 담당). */
    @Transactional
    public JobPostingResponse update(Long id, JobPostingRequest request) {
        JobPosting posting = findOrThrow(id);
        LocalDateTime now = LocalDateTime.now();
        String previousUrl = posting.getPostingUrl();
        String newUrl = request.postingUrl();
        boolean urlChanged = !java.util.Objects.equals(previousUrl, newUrl);
        if (urlChanged && AiJsonSupport.hasText(newUrl) && sourceUrlRepository.existsByUrl(newUrl)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 등록된 URL의 공고입니다.");
        }
        posting.update(
                request.companyName(),
                request.positionTitle(),
                newUrl,
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
                now);
        try {
            // 회사명/직무명을 수정한 결과가 다른 기존 공고와 정규화 매칭 키가 겹치면(플랫폼 간 중복
            // 병합 제약, V155) 여기서 막는다 — dirty checking에만 맡기면 트랜잭션 커밋 시점에야
            // 제약 위반이 드러나 500으로 새 버릇 없이 노출된다.
            jobPostingRepository.saveAndFlush(posting);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "동일한 회사/직무의 다른 공고가 이미 있습니다.", exception);
        }
        if (urlChanged) {
            sourceUrlRepository.deleteByJobPostingIdAndPrimaryTrue(posting.getId());
            if (AiJsonSupport.hasText(newUrl)) {
                sourceUrlRepository.save(
                        JobPostingSourceUrl.primary(
                                posting.getId(), newUrl, JobPostingPlatform.fromUrl(newUrl), now));
            }
        }
        return toResponse(posting);
    }

    @Transactional
    public JobPostingResponse updateMemo(Long id, String memo) {
        JobPosting posting = findOrThrow(id);
        posting.updateMemo(memo, LocalDateTime.now());
        return toResponse(posting);
    }

    @Transactional
    public void delete(Long id) {
        jobPostingRepository.delete(findOrThrow(id));
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
        return toResponse(posting);
    }

    @Transactional
    public JobPostingResponse unapply(Long id) {
        JobPosting posting = findOrThrow(id);
        LocalDateTime now = LocalDateTime.now();
        posting.unapply(now);
        statusEventRepository.save(
                JobPostingStatusEvent.of(posting.getId(), JobPostingStatus.NEW, "지원 취소", now));
        return toResponse(posting);
    }

    @Transactional
    public JobPostingResponse changeStatus(Long id, JobPostingStatus status, String memo) {
        JobPosting posting = findOrThrow(id);
        LocalDateTime now = LocalDateTime.now();
        posting.changeStatus(status, now);
        statusEventRepository.save(JobPostingStatusEvent.of(posting.getId(), status, memo, now));
        return toResponse(posting);
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

        return toResponse(posting);
    }

    private JobPosting findOrThrow(Long id) {
        return jobPostingRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 채용 공고입니다: " + id));
    }
}
