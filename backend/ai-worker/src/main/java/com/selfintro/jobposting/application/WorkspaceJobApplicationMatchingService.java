package com.selfintro.jobposting.application;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobApplication;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPositionChoiceRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceImageRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkspaceJobApplicationMatchingService {

    private final WorkspaceJobApplicationRepository applicationRepository;
    private final JobMatchingService matchingService;
    private final JobPostingSourceUrlRepository sourceUrlRepository;
    private final JobPostingPositionChoiceRepository positionChoiceRepository;
    private final JobPostingSourceImageRepository sourceImageRepository;

    @Transactional
    public JobPostingResponse rematch(Long workspaceId, Long jobPostingId) {
        WorkspaceJobApplication application =
                applicationRepository
                        .findByWorkspaceIdAndJobPostingId(workspaceId, jobPostingId)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "Workspace 지원 건을 찾을 수 없습니다: " + jobPostingId));
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

    private String matchingText(JobPosting posting) {
        return java.util.stream.Stream.of(
                        posting.getRequiredSkillsRaw(),
                        posting.getJobDescription(),
                        posting.getRequiredQualifications(),
                        posting.getPreferredQualifications())
                .filter(value -> value != null && !value.isBlank())
                .collect(java.util.stream.Collectors.joining("\n"));
    }
}
