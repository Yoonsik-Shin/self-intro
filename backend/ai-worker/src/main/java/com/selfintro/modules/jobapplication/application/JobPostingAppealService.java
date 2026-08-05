package com.selfintro.modules.jobapplication.application;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 채용 공고 하나(지원 전 후보든 이미 지원한 공고든)를 지원자의 경력/프로젝트/핵심역량 데이터와 대조해, 어떤 경험을 근거로 무엇을 어필하면 좋을지 AI로 정리해 저장한다.
 * 온디맨드(버튼 클릭 시)로만 호출되며, 자동수집 시점에는 실행되지 않는다 — 모든 후보에 대해 매번 AI를 돌리면 비용/지연이 커지기 때문이다.
 */
@Service
@RequiredArgsConstructor
public class JobPostingAppealService {

    private final JobPostingRepository jobPostingRepository;
    private final JobPostingSourceUrlRepository sourceUrlRepository;
    private final CareerAppealAnalyzer careerAppealAnalyzer;
    private final JobMatchingService jobMatchingService;

    @Transactional
    public JobPostingResponse analyzeAppeal(Long id) {
        JobPosting posting =
                jobPostingRepository
                        .findById(id)
                        .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 채용 공고입니다: " + id));

        LocalDateTime now = LocalDateTime.now();
        String analysis =
                careerAppealAnalyzer.analyze(
                        posting.getCompanyName(),
                        posting.getPositionTitle(),
                        posting.getJobDescription(),
                        posting.getRequiredQualifications(),
                        posting.getPreferredQualifications());

        posting.applyAppealAnalysis(analysis, now);

        if (posting.getMatchScore() == null) {
            JobMatchingService.MatchResult match =
                    jobMatchingService.evaluate(
                            posting.getPositionTitle(), posting.getRequiredSkillsRaw());
            posting.applyMatch(match.score(), match.reason(), now);
        }

        return JobPostingResponse.from(
                posting,
                sourceUrlRepository.findByJobPostingIdOrderByPrimaryDescCreatedAtAsc(
                        posting.getId()));
    }
}
