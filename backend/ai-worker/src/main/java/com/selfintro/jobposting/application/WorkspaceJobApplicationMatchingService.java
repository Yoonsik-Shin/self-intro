package com.selfintro.jobposting.application;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobApplication;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPositionChoiceRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceImageRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkspaceJobApplicationMatchingService {

    private final WorkspaceJobApplicationRepository applicationRepository;
    private final JobPostingRepository jobPostingRepository;
    private final JobMatchingService matchingService;
    private final JobPostingSourceUrlRepository sourceUrlRepository;
    private final JobPostingPositionChoiceRepository positionChoiceRepository;
    private final JobPostingSourceImageRepository sourceImageRepository;

    @Transactional
    public JobPostingResponse rematch(Long workspaceId, Long jobPostingId) {
        WorkspaceJobApplication application =
                applicationRepository
                        .findByWorkspaceIdAndJobPostingId(workspaceId, jobPostingId)
                        .orElseGet(() -> createApplicationForCandidate(workspaceId, jobPostingId));
        JobPosting posting = application.getJobPosting();
        JobMatchingService.MatchResult match =
                matchingService.evaluate(
                        workspaceId, posting.getPositionTitle(), matchingText(posting));
        application.applyMatch(match.score(), match.reason(), LocalDateTime.now());
        return JobPostingResponse.from(
                posting,
                application,
                sourceUrlRepository.findByJobPostingIdOrderByPrimaryDescCreatedAtAsc(
                        posting.getId()),
                positionChoiceRepository.findByJobPostingIdOrderByRankOrderAsc(posting.getId()),
                sourceImageRepository.findByJobPostingIdOrderByDisplayOrderAsc(posting.getId()));
    }

    private WorkspaceJobApplication createApplicationForCandidate(
            Long workspaceId, Long jobPostingId) {
        JobPosting posting =
                jobPostingRepository
                        .findById(jobPostingId)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "채용 공고를 찾을 수 없습니다: " + jobPostingId));
        if (posting.getOwnerWorkspaceId() != null
                && !posting.getOwnerWorkspaceId().equals(workspaceId)) {
            throw new EntityNotFoundException("Workspace 지원 건을 찾을 수 없습니다: " + jobPostingId);
        }
        LocalDateTime now = LocalDateTime.now();
        JobPostingStatus initialStatus =
                posting.getStatus() != null ? posting.getStatus() : JobPostingStatus.SAVED;
        return applicationRepository.save(
                WorkspaceJobApplication.create(
                        workspaceId,
                        posting,
                        initialStatus,
                        posting.getAppliedAt(),
                        null,
                        null,
                        now));
    }

    private String matchingText(JobPosting posting) {
        return Stream.of(
                        posting.getRequiredSkillsRaw(),
                        posting.getJobDescription(),
                        posting.getRequiredQualifications(),
                        posting.getPreferredQualifications())
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.joining("\n"));
    }
}
