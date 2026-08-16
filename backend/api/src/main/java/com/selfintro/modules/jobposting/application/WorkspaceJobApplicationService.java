package com.selfintro.modules.jobposting.application;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobApplication;
import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobApplicationStatusEvent;
import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobMapSetting;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPlatform;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPositionChoiceRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceImageRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationStatusEventRepository;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobMapSettingRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCatalogResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobApplicationRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobApplicationStatusEventResponse;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobApplicationStatusRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobMapSettingRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobMapSettingResponse;
import com.selfintro.modules.jobposting.presentation.dto.WorkspacePrivateJobPostingRequest;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceJobApplicationService {

    private final JobPostingRepository jobPostingRepository;
    private final WorkspaceJobApplicationRepository workspaceJobApplicationRepository;
    private final WorkspaceJobApplicationStatusEventRepository statusEventRepository;
    private final JobPostingSourceUrlRepository sourceUrlRepository;
    private final JobPostingPositionChoiceRepository positionChoiceRepository;
    private final JobPostingSourceImageRepository sourceImageRepository;
    private final WorkspaceJobMapSettingRepository workspaceJobMapSettingRepository;

    public WorkspaceJobMapSettingResponse mapSetting(Long workspaceId) {
        return workspaceJobMapSettingRepository
                .findById(workspaceId)
                .map(WorkspaceJobMapSettingResponse::from)
                .orElseGet(WorkspaceJobMapSettingResponse::empty);
    }

    @Transactional
    public WorkspaceJobMapSettingResponse updateMapSetting(
            Long workspaceId, WorkspaceJobMapSettingRequest request) {
        LocalDateTime now = LocalDateTime.now();
        WorkspaceJobMapSetting setting =
                workspaceJobMapSettingRepository
                        .findById(workspaceId)
                        .orElseGet(() -> WorkspaceJobMapSetting.create(workspaceId, now));
        setting.update(
                request.homeAddress().trim(), request.homeLatitude(), request.homeLongitude(), now);
        return WorkspaceJobMapSettingResponse.from(workspaceJobMapSettingRepository.save(setting));
    }

    public List<JobPostingResponse> list(Long workspaceId) {
        return workspaceJobApplicationRepository
                .findAllByWorkspaceIdOrderByUpdatedAtDesc(workspaceId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public JobPostingResponse get(Long workspaceId, Long jobPostingId) {
        return toResponse(findApplication(workspaceId, jobPostingId));
    }

    public List<JobPostingCatalogResponse> catalog(Long workspaceId, String keyword) {
        Set<Long> savedIds =
                workspaceJobApplicationRepository
                        .findAllByWorkspaceIdOrderByUpdatedAtDesc(workspaceId)
                        .stream()
                        .map(application -> application.getJobPosting().getId())
                        .collect(java.util.stream.Collectors.toSet());
        String normalized =
                StringUtils.hasText(keyword) ? keyword.trim().toLowerCase(Locale.ROOT) : null;
        LocalDateTime now = LocalDateTime.now();
        return jobPostingRepository.findAllByOwnerWorkspaceIdIsNull().stream()
                .filter(posting -> posting.isSharedCatalogEligible(now))
                .filter(
                        posting ->
                                normalized == null
                                        || contains(posting.getCompanyName(), normalized)
                                        || contains(posting.getPositionTitle(), normalized)
                                        || contains(posting.getJobDescription(), normalized))
                .sorted(
                        java.util.Comparator.comparing(JobPosting::getCreatedAt)
                                .reversed()
                                .thenComparing(JobPosting::getId))
                .map(
                        posting ->
                                JobPostingCatalogResponse.from(
                                        posting, savedIds.contains(posting.getId())))
                .toList();
    }

    @Transactional
    public JobPostingResponse save(
            Long workspaceId, Long jobPostingId, WorkspaceJobApplicationRequest request) {
        if (workspaceJobApplicationRepository.existsByWorkspaceIdAndJobPostingId(
                workspaceId, jobPostingId)) {
            throw new IllegalArgumentException("Job posting is already saved in Workspace.");
        }
        JobPosting posting = findPosting(jobPostingId);
        if (!posting.isSharedCatalogEligible(LocalDateTime.now())) {
            throw new IllegalArgumentException("공통 카탈로그 재노출 권한이 검증되지 않았거나 만료된 공고입니다.");
        }
        LocalDateTime now = LocalDateTime.now();
        WorkspaceJobApplication application =
                workspaceJobApplicationRepository.save(
                        WorkspaceJobApplication.create(
                                workspaceId,
                                posting,
                                request.status(),
                                normalizeAppliedAt(request.status(), request.appliedAt()),
                                blankToNull(request.memo()),
                                request.interestLevel(),
                                now));
        application.updatePersonalState(
                blankToNull(request.memo()),
                request.interestLevel(),
                request.matchScore(),
                blankToNull(request.matchReason()));
        statusEventRepository.save(
                WorkspaceJobApplicationStatusEvent.of(
                        application.getId(), request.status(), "Workspace에 저장", now));
        return toResponse(application);
    }

    @Transactional
    public JobPostingResponse createPrivateSource(
            Long workspaceId, WorkspacePrivateJobPostingRequest request) {
        String postingUrl = blankToNull(request.postingUrl());
        String scopeKey = "WORKSPACE:" + workspaceId;
        LocalDateTime now = LocalDateTime.now();
        JobPosting posting =
                postingUrl == null
                        ? null
                        : jobPostingRepository
                                .findByScopeKeyAndPostingUrl(scopeKey, postingUrl)
                                .orElse(null);
        if (posting != null
                && workspaceJobApplicationRepository.existsByWorkspaceIdAndJobPostingId(
                        workspaceId, posting.getId())) {
            throw new IllegalArgumentException("이미 이 Workspace의 지원 현황에 있는 원본 URL입니다.");
        }

        if (posting == null) {
            posting =
                    JobPosting.collect(
                            new JobPosting.Draft(
                                    request.positionTitle().trim(),
                                    request.companyName().trim(),
                                    postingUrl,
                                    null,
                                    resolvePrivateSource(request.source(), postingUrl),
                                    blankToNull(request.requiredSkillsRaw()),
                                    blankToNull(request.location()),
                                    blankToNull(request.employmentType()),
                                    request.deadline(),
                                    request.deadlineTime(),
                                    request.alwaysOpen(),
                                    blankToNull(request.salaryNote()),
                                    blankToNull(request.jobDescription()),
                                    blankToNull(request.requiredQualifications()),
                                    blankToNull(request.preferredQualifications()),
                                    blankToNull(request.hiringProcess()),
                                    blankToNull(request.applicationMethod()),
                                    blankToNull(request.compensationDetail())),
                            now);
            posting.assignToWorkspace(workspaceId);
            posting = jobPostingRepository.save(posting);

            if (postingUrl != null) {
                sourceUrlRepository.save(
                        com.selfintro.modules.jobposting.domain.entity.JobPostingSourceUrl.primary(
                                posting.getId(),
                                scopeKey,
                                postingUrl,
                                JobPostingPlatform.fromUrl(postingUrl),
                                now));
            }
        } else {
            posting.updatePrivateSource(
                    workspaceId,
                    request.companyName().trim(),
                    request.positionTitle().trim(),
                    postingUrl,
                    resolvePrivateSource(request.source(), postingUrl),
                    blankToNull(request.requiredSkillsRaw()),
                    request.deadline(),
                    request.deadlineTime(),
                    request.alwaysOpen(),
                    blankToNull(request.salaryNote()),
                    blankToNull(request.location()),
                    blankToNull(request.employmentType()),
                    blankToNull(request.jobDescription()),
                    blankToNull(request.requiredQualifications()),
                    blankToNull(request.preferredQualifications()),
                    blankToNull(request.hiringProcess()),
                    blankToNull(request.applicationMethod()),
                    blankToNull(request.compensationDetail()),
                    now);
        }

        WorkspaceJobApplication application =
                workspaceJobApplicationRepository.save(
                        WorkspaceJobApplication.create(
                                workspaceId,
                                posting,
                                request.status(),
                                normalizeAppliedAt(request.status(), request.appliedAt()),
                                blankToNull(request.memo()),
                                request.interestLevel(),
                                now));
        application.updatePersonalState(
                blankToNull(request.memo()),
                request.interestLevel(),
                request.matchScore(),
                blankToNull(request.matchReason()));
        statusEventRepository.save(
                WorkspaceJobApplicationStatusEvent.of(
                        application.getId(), request.status(), "Workspace 비공개 원본 등록", now));
        return toResponse(application);
    }

    private JobPostingSource resolvePrivateSource(JobPostingSource requested, String postingUrl) {
        if (requested == JobPostingSource.IMAGE_INGEST) {
            return JobPostingSource.IMAGE_INGEST;
        }
        return postingUrl == null ? JobPostingSource.MANUAL : JobPostingSource.URL_INGEST;
    }

    @Transactional
    public JobPostingResponse update(
            Long workspaceId, Long jobPostingId, WorkspaceJobApplicationRequest request) {
        WorkspaceJobApplication application = findApplication(workspaceId, jobPostingId);
        application.updatePersonalState(
                blankToNull(request.memo()),
                request.interestLevel(),
                request.matchScore(),
                blankToNull(request.matchReason()));
        if (application.getStatus() != request.status()
                || !java.util.Objects.equals(
                        application.getAppliedAt(),
                        normalizeAppliedAt(request.status(), request.appliedAt()))) {
            changeStatus(application, request.status(), request.appliedAt(), "지원 정보 수정");
        }
        return toResponse(application);
    }

    @Transactional
    public JobPostingResponse changeStatus(
            Long workspaceId, Long jobPostingId, WorkspaceJobApplicationStatusRequest request) {
        WorkspaceJobApplication application = findApplication(workspaceId, jobPostingId);
        changeStatus(application, request.status(), request.appliedAt(), request.memo());
        return toResponse(application);
    }

    @Transactional
    public void remove(Long workspaceId, Long jobPostingId) {
        workspaceJobApplicationRepository.delete(findApplication(workspaceId, jobPostingId));
    }

    public List<WorkspaceJobApplicationStatusEventResponse> statusEvents(
            Long workspaceId, Long jobPostingId) {
        WorkspaceJobApplication application = findApplication(workspaceId, jobPostingId);
        return statusEventRepository
                .findAllByWorkspaceJobApplicationIdOrderByChangedAtAsc(application.getId())
                .stream()
                .map(WorkspaceJobApplicationStatusEventResponse::from)
                .toList();
    }

    private void changeStatus(
            WorkspaceJobApplication application,
            com.selfintro.modules.jobposting.domain.enums.JobPostingStatus status,
            LocalDate appliedAt,
            String memo) {
        LocalDateTime now = LocalDateTime.now();
        application.changeStatus(status, normalizeAppliedAt(status, appliedAt), now);
        statusEventRepository.save(
                WorkspaceJobApplicationStatusEvent.of(
                        application.getId(), status, blankToNull(memo), now));
    }

    private LocalDate normalizeAppliedAt(
            com.selfintro.modules.jobposting.domain.enums.JobPostingStatus status,
            LocalDate appliedAt) {
        if (status.isPreApplication()) {
            return null;
        }
        return appliedAt == null ? LocalDate.now() : appliedAt;
    }

    private WorkspaceJobApplication findApplication(Long workspaceId, Long jobPostingId) {
        return workspaceJobApplicationRepository
                .findByWorkspaceIdAndJobPostingId(workspaceId, jobPostingId)
                .orElseThrow(
                        () ->
                                new EntityNotFoundException(
                                        "Workspace job application not found: " + jobPostingId));
    }

    private JobPosting findPosting(Long jobPostingId) {
        return jobPostingRepository
                .findByIdAndOwnerWorkspaceIdIsNull(jobPostingId)
                .orElseThrow(
                        () ->
                                new EntityNotFoundException(
                                        "Job posting not found: " + jobPostingId));
    }

    private JobPostingResponse toResponse(WorkspaceJobApplication application) {
        JobPosting posting = application.getJobPosting();
        return JobPostingResponse.from(
                posting,
                application,
                sourceUrlRepository.findByJobPostingIdOrderByPrimaryDescCreatedAtAsc(
                        posting.getId()),
                positionChoiceRepository.findByJobPostingIdOrderByRankOrderAsc(posting.getId()),
                sourceImageRepository.findByJobPostingIdOrderByDisplayOrderAsc(posting.getId()));
    }

    private boolean contains(String source, String lowerCaseNeedle) {
        return source != null && source.toLowerCase(Locale.ROOT).contains(lowerCaseNeedle);
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
