package com.selfintro.jobposting.application;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingSourceUrl;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPlatform;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.domain.util.JobPostingNormalizer;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 회사명+직무명을 정규화해 완전일치하면 같은 공고로 보고, 새 URL은 새 행을 만들지 않고 기존 공고에 추가 등록한다(원티드/잡코리아/사람인 등 플랫폼이 달라도
 * 실제로는 같은 공고인 경우). URL 수집({@link JobPostingService})과 사람인 자동 수집({@link JobPostingCollectorService}) 양쪽에서
 * 공유해 쓴다. 트랜잭션이 있는 메서드를 별도 빈으로 분리해둔 이유는 호출자가 같은 클래스 self-invocation으로 트랜잭션 프록시를 우회하는 것을 막기
 * 위해서다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobPostingDedupService {

    private final JobPostingRepository jobPostingRepository;
    private final JobPostingSourceUrlRepository sourceUrlRepository;

    @Transactional(readOnly = true)
    public Optional<JobPosting> findExistingMatch(String companyName, String positionTitle) {
        String normalizedCompany = JobPostingNormalizer.normalizeCompanyName(companyName);
        String normalizedTitle = JobPostingNormalizer.normalizePositionTitle(positionTitle);
        return jobPostingRepository.findByCompanyNameNormalizedAndPositionTitleNormalized(
                normalizedCompany, normalizedTitle);
    }

    /** 새 공고를 저장하고, 수집에 쓰인 URL을 그 공고의 대표(primary) 출처로 함께 등록한다. */
    @Transactional
    public JobPosting createNew(
            JobPosting posting, String url, JobPostingPlatform platform, LocalDateTime now) {
        JobPosting saved = jobPostingRepository.save(posting);
        sourceUrlRepository.save(
                JobPostingSourceUrl.primary(saved.getId(), url, platform, now));
        return saved;
    }

    /**
     * 이미 존재하는 공고에 다른 플랫폼의 URL을 추가로 등록한다. 회사명/직무명 등 본문 필드는 건드리지 않는다 — 플랫폼마다 표현이 조금씩 달라 어느 쪽이 "더
     * 정확한" 값인지 판단할 수 없고, 최신 정보가 필요하면 기존 "정보 새로고침" 기능이 그 역할을 한다. 같은 URL이 동시 수집 등으로 이미 등록돼 있으면 조용히
     * 무시한다(멱등) — DB 제약 위반을 잡아 처리하면 같은 트랜잭션이 rollback-only 상태가 될 수 있어, 저장 전에 먼저 존재 여부를 확인한다.
     */
    @Transactional
    public JobPosting attachAdditionalUrl(
            Long existingJobPostingId, String url, JobPostingPlatform platform, LocalDateTime now) {
        JobPosting posting =
                jobPostingRepository
                        .findById(existingJobPostingId)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "존재하지 않는 채용 공고입니다: " + existingJobPostingId));
        posting.touch(now);
        if (!sourceUrlRepository.existsByUrl(url)) {
            sourceUrlRepository.save(
                    JobPostingSourceUrl.additional(posting.getId(), url, platform, now));
        } else {
            log.debug("이미 등록된 공고 URL이라 추가 등록을 건너뜁니다: {}", url);
        }
        return posting;
    }
}
