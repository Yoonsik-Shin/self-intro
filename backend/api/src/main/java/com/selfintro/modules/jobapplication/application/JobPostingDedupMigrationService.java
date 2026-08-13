package com.selfintro.modules.jobapplication.application;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingSourceUrl;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPlatform;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterItemRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPositionChoiceRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceImageRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingStatusEventRepository;
import com.selfintro.modules.jobposting.domain.util.JobPostingNormalizer;
import com.selfintro.modules.jobposting.domain.util.JobPostingUrlNormalizer;
import com.selfintro.modules.printtemplate.domain.repository.PrintTemplateRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** DB에 등록되어 있는 기존 공고 데이터를 점검하고 정규화/중복 병합을 수행하는 마이그레이션 서비스. */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobPostingDedupMigrationService {

    private final JobPostingRepository jobPostingRepository;
    private final JobPostingSourceUrlRepository sourceUrlRepository;
    private final JobPostingSourceImageRepository sourceImageRepository;
    private final JobPostingPositionChoiceRepository positionChoiceRepository;
    private final JobPostingCoverLetterItemRepository coverLetterItemRepository;
    private final JobPostingStatusEventRepository statusEventRepository;
    private final PrintTemplateRepository printTemplateRepository;

    public record MigrationResult(
            int totalPostingsProcessed,
            int mergedPostingsCount,
            int urlsNormalizedCount,
            int duplicateUrlsDeletedCount) {}

    @Transactional
    public MigrationResult runMigration() {
        log.info("채용공고 DB 정규화 및 중복 병합 마이그레이션 시작");

        // 1. 모든 JobPostingSourceUrl 정규화 및 중복 제거
        List<JobPostingSourceUrl> allSourceUrls = sourceUrlRepository.findAll();
        int urlsNormalizedCount = 0;
        int duplicateUrlsDeletedCount = 0;

        Set<String> globalCanonicalUrls = new HashSet<>();

        for (JobPostingSourceUrl sourceUrl : allSourceUrls) {
            String rawUrl = sourceUrl.getUrl();
            String canonicalUrl = JobPostingUrlNormalizer.normalizeUrl(rawUrl);
            if (canonicalUrl == null || canonicalUrl.isBlank()) {
                canonicalUrl = rawUrl != null ? rawUrl.trim() : null;
            }
            JobPostingPlatform newPlatform = JobPostingPlatform.fromUrl(canonicalUrl);

            if (canonicalUrl != null && globalCanonicalUrls.contains(canonicalUrl)) {
                // job_posting_source_url.url의 전역 UNIQUE 제약조건(uk_job_posting_source_url_url)을
                // 위반하지 않도록 이미 가공된 동일 Canonical URL이 테이블 전체에 존재하면 해당 행 삭제
                sourceUrlRepository.delete(sourceUrl);
                duplicateUrlsDeletedCount++;
            } else {
                if (canonicalUrl != null) {
                    globalCanonicalUrls.add(canonicalUrl);
                }
                if (canonicalUrl != null
                        && (!canonicalUrl.equals(rawUrl)
                                || sourceUrl.getPlatform() != newPlatform)) {
                    sourceUrl.updateUrlAndPlatform(canonicalUrl, newPlatform);
                    urlsNormalizedCount++;
                }
            }
        }
        sourceUrlRepository.flush();

        // 2. 모든 JobPosting 정규화 필드 재계산
        List<JobPosting> allPostings = jobPostingRepository.findAllByOwnerWorkspaceIdIsNull();
        for (JobPosting posting : allPostings) {
            posting.updateNormalizedFields(
                    JobPostingNormalizer.normalizeCompanyName(posting.getCompanyName()),
                    JobPostingNormalizer.normalizePositionTitle(posting.getPositionTitle()));
        }

        // 3. 동일 회사의 동일 직무 중복 공고 감지 및 병합
        int mergedPostingsCount = 0;
        Map<String, List<JobPosting>> groupedByCompany =
                allPostings.stream()
                        .filter(
                                p ->
                                        p.getCompanyNameNormalized() != null
                                                && !p.getCompanyNameNormalized().isBlank())
                        .collect(Collectors.groupingBy(JobPosting::getCompanyNameNormalized));

        for (Map.Entry<String, List<JobPosting>> entry : groupedByCompany.entrySet()) {
            List<JobPosting> companyPostings = entry.getValue();
            if (companyPostings.size() < 2) {
                continue;
            }

            Map<String, List<JobPosting>> titleGroups = new HashMap<>();
            for (JobPosting posting : companyPostings) {
                String titleKey =
                        JobPostingNormalizer.normalizePositionTitleKey(posting.getPositionTitle());
                titleGroups.computeIfAbsent(titleKey, k -> new ArrayList<>()).add(posting);
            }

            for (List<JobPosting> duplicates : titleGroups.values()) {
                if (duplicates.size() < 2) {
                    continue;
                }

                // Winner 선정: 1. appliedAt != null 또는 status != NEW 우선, 2. ID 오름차순
                JobPosting winner =
                        duplicates.stream()
                                .min(
                                        Comparator.comparing(
                                                        (JobPosting p) ->
                                                                p.getAppliedAt() != null
                                                                                || p.getStatus()
                                                                                        != JobPostingStatus
                                                                                                .NEW
                                                                        ? 0
                                                                        : 1)
                                                .thenComparing(JobPosting::getId))
                                .orElseThrow();

                for (JobPosting loser : duplicates) {
                    if (loser.getId().equals(winner.getId())) {
                        continue;
                    }

                    mergePostingData(loser, winner);
                    jobPostingRepository.delete(loser);
                    mergedPostingsCount++;
                }
            }
        }

        log.info(
                "채용공고 DB 마이그레이션 완료: 총 공고={}건, 병합된 공고={}건, 정규화된 URL={}건, 중복 삭제된 URL={}건",
                allPostings.size(),
                mergedPostingsCount,
                urlsNormalizedCount,
                duplicateUrlsDeletedCount);

        return new MigrationResult(
                allPostings.size(),
                mergedPostingsCount,
                urlsNormalizedCount,
                duplicateUrlsDeletedCount);
    }

    private void mergePostingData(JobPosting loser, JobPosting winner) {
        Long loserId = loser.getId();
        Long winnerId = winner.getId();

        List<JobPostingSourceUrl> loserUrls =
                sourceUrlRepository.findByJobPostingIdOrderByPrimaryDescCreatedAtAsc(loserId);
        List<JobPostingSourceUrl> winnerUrls =
                sourceUrlRepository.findByJobPostingIdOrderByPrimaryDescCreatedAtAsc(winnerId);
        Set<String> winnerUrlSet =
                winnerUrls.stream().map(JobPostingSourceUrl::getUrl).collect(Collectors.toSet());

        for (JobPostingSourceUrl loserUrl : loserUrls) {
            if (winnerUrlSet.contains(loserUrl.getUrl())) {
                sourceUrlRepository.delete(loserUrl);
            } else {
                loserUrl.reassignTo(winnerId, false);
                winnerUrlSet.add(loserUrl.getUrl());
            }
        }

        sourceImageRepository.reassignToWinner(loserId, winnerId);
        positionChoiceRepository.reassignToWinner(loserId, winnerId);
        coverLetterItemRepository.reassignToWinner(loserId, winnerId);
        statusEventRepository.reassignToWinner(loserId, winnerId);
        printTemplateRepository.reassignToWinner(loserId, winnerId);
    }
}
