package com.selfintro.modules.jobapplication.application;

import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingCandidate;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingCandidateStatus;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingCandidateRepository;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingCandidateResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** 채용 공고를 URL로 수집해 "아직 지원하지 않은 후보" 상태로 관리한다. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobPostingService {

    private static final List<JobPostingCandidateStatus> ACTIVE_STATUSES =
            List.of(JobPostingCandidateStatus.NEW, JobPostingCandidateStatus.SAVED);

    private final JobPostingCandidateRepository candidateRepository;
    private final JobApplicationService jobApplicationService;
    private final JobApplicationUrlParseService urlParseService;
    private final JobMatchingService matchingService;

    public List<JobPostingCandidateResponse> list() {
        return candidateRepository.findActiveByStatuses(ACTIVE_STATUSES, LocalDate.now()).stream()
                .map(JobPostingCandidateResponse::from)
                .toList();
    }

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
                        null,
                        null,
                        null,
                        parsed.deadline(),
                        parsed.salaryNote());
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
    public void dismiss(Long id) {
        findOrThrow(id).dismiss(LocalDateTime.now());
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
                        null);
        JobApplicationResponse response = jobApplicationService.create(request, candidate.getId());
        candidate.markConverted(LocalDateTime.now());
        return response;
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
