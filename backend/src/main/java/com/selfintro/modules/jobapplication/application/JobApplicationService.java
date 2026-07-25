package com.selfintro.modules.jobapplication.application;

import com.selfintro.modules.jobapplication.domain.entity.JobApplication;
import com.selfintro.modules.jobapplication.domain.entity.JobApplicationStageEvent;
import com.selfintro.modules.jobapplication.domain.enums.JobApplicationStage;
import com.selfintro.modules.jobapplication.domain.repository.JobApplicationRepository;
import com.selfintro.modules.jobapplication.domain.repository.JobApplicationStageEventRepository;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingCandidateRepository;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationStageEventResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobApplicationService {

    private final JobApplicationRepository jobApplicationRepository;
    private final JobApplicationStageEventRepository stageEventRepository;
    private final JobPostingCandidateRepository jobPostingCandidateRepository;

    public List<JobApplicationResponse> list() {
        return jobApplicationRepository.findAllByOrderByAppliedAtDesc().stream()
                .map(JobApplicationResponse::from)
                .toList();
    }

    public JobApplicationResponse get(Long id) {
        return JobApplicationResponse.from(findOrThrow(id));
    }

    @Transactional
    public JobApplicationResponse create(JobApplicationRequest request) {
        return create(request, null);
    }

    @Transactional
    public JobApplicationResponse create(
            JobApplicationRequest request, Long jobPostingCandidateId) {
        LocalDateTime now = LocalDateTime.now();
        JobApplication saved =
                jobApplicationRepository.save(
                        JobApplication.create(
                                request.companyName(),
                                request.positionTitle(),
                                request.postingUrl(),
                                request.source(),
                                request.appliedAt(),
                                request.deadline(),
                                request.salaryNote(),
                                request.memo(),
                                request.jobDescription(),
                                request.requiredQualifications(),
                                request.preferredQualifications(),
                                request.hiringProcess(),
                                request.applicationMethod(),
                                request.compensationDetail(),
                                jobPostingCandidateId,
                                now));
        stageEventRepository.save(
                JobApplicationStageEvent.of(
                        saved.getId(), JobApplicationStage.APPLIED, "지원 등록", now));
        return JobApplicationResponse.from(saved);
    }

    @Transactional
    public JobApplicationResponse update(Long id, JobApplicationRequest request) {
        JobApplication jobApplication = findOrThrow(id);
        jobApplication.update(
                request.companyName(),
                request.positionTitle(),
                request.postingUrl(),
                request.source(),
                request.appliedAt(),
                request.deadline(),
                request.salaryNote(),
                request.memo(),
                request.jobDescription(),
                request.requiredQualifications(),
                request.preferredQualifications(),
                request.hiringProcess(),
                request.applicationMethod(),
                request.compensationDetail(),
                LocalDateTime.now());
        return JobApplicationResponse.from(jobApplication);
    }

    @Transactional
    public void delete(Long id) {
        JobApplication jobApplication = findOrThrow(id);
        Long candidateId = jobApplication.getJobPostingCandidateId();
        jobApplicationRepository.delete(jobApplication);
        if (candidateId != null) {
            jobPostingCandidateRepository
                    .findById(candidateId)
                    .ifPresent(candidate -> candidate.revertToNew(LocalDateTime.now()));
        }
    }

    @Transactional
    public JobApplicationResponse changeStage(Long id, JobApplicationStage stage, String memo) {
        JobApplication jobApplication = findOrThrow(id);
        LocalDateTime now = LocalDateTime.now();
        jobApplication.changeStage(stage, now);
        stageEventRepository.save(
                JobApplicationStageEvent.of(jobApplication.getId(), stage, memo, now));
        return JobApplicationResponse.from(jobApplication);
    }

    public List<JobApplicationStageEventResponse> stageEvents(Long id) {
        findOrThrow(id);
        return stageEventRepository.findByJobApplicationIdOrderByChangedAtAsc(id).stream()
                .map(JobApplicationStageEventResponse::from)
                .toList();
    }

    private JobApplication findOrThrow(Long id) {
        return jobApplicationRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 지원 공고입니다: " + id));
    }
}
