package com.selfintro.modules.jobapplication.application;

import com.selfintro.modules.jobapplication.domain.entity.JobPosting;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingSetting;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingStatus;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingSettingRepository;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 사람인 Open API 자동 수집을 오케스트레이션한다. 워크넷/고용24는 개인 자격으로는 채용정보 목록/상세 API를 이용할 수 없어 대상에서 제외했다 (공채속보 등 제한된
 * API만 허용됨). 만료된 후보를 EXPIRED로 정리하는 배치는 매 실행 시 함께 수행한다.
 *
 * <p>사람인 사용 여부/자동 스케줄 사용 여부/스케줄 주기(cron)는 재배포 없이 바꾸고 싶은 값이라 {@link JobPostingSetting}(DB, 어드민 설정
 * 화면)에서 매 실행마다 읽는다. cron 재조회는 {@link JobPostingSchedulingConfig}가 담당한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobPostingCollectorService {

    private static final List<JobPostingStatus> EXPIRABLE_STATUSES =
            List.of(JobPostingStatus.NEW, JobPostingStatus.SAVED);

    private final JobPostingRepository jobPostingRepository;
    private final JobPostingSettingRepository settingRepository;
    private final SkillRepository skillRepository;
    private final SaraminJobPostingClient saraminJobPostingClient;
    private final JobMatchingService matchingService;
    private final AtomicBoolean collecting = new AtomicBoolean(false);

    public JobPostingCollectionResult collectNow() {
        if (!collecting.compareAndSet(false, true)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "이미 공고 수집이 진행 중입니다.");
        }
        try {
            JobPostingSetting setting = settingRepository.getOrCreateDefault();
            int saraminCollected = setting.isSaraminEnabled() ? collectFromSaramin() : 0;
            int expiredCount = expireOverdueCandidates();
            return new JobPostingCollectionResult(
                    setting.isSaraminEnabled(), saraminCollected, expiredCount);
        } finally {
            collecting.set(false);
        }
    }

    public void scheduledCollect() {
        if (!settingRepository.getOrCreateDefault().isCollectorScheduledEnabled()) return;
        log.info("공고 자동 수집 스케줄 실행");
        collectNow();
    }

    @Transactional
    public int expireOverdueCandidates() {
        List<JobPosting> overdue =
                jobPostingRepository.findByStatusInAndDeadlineBefore(
                        EXPIRABLE_STATUSES, LocalDate.now());
        LocalDateTime now = LocalDateTime.now();
        overdue.forEach(posting -> posting.markExpired(now));
        return overdue.size();
    }

    private int collectFromSaramin() {
        List<JobPosting.Draft> drafts;
        try {
            drafts = saraminJobPostingClient.fetchPostings();
        } catch (ResponseStatusException exception) {
            log.warn("사람인 공고 수집 실패: {}", exception.getReason());
            return 0;
        }

        int savedCount = 0;
        LocalDateTime now = LocalDateTime.now();
        List<String> mySkillNames = skillRepository.findAll().stream().map(Skill::getName).toList();
        int keywordThreshold = settingRepository.getOrCreateDefault().getMatchingKeywordThreshold();

        for (JobPosting.Draft draft : drafts) {
            if (jobPostingRepository.existsByCollectionMethodAndExternalId(
                    JobPostingSource.SARAMIN, draft.externalId())) {
                continue;
            }
            JobPosting posting = JobPosting.collect(draft, now);
            JobMatchingService.MatchResult match =
                    matchingService.evaluate(
                            posting.getPositionTitle(),
                            posting.getRequiredSkillsRaw(),
                            mySkillNames,
                            keywordThreshold);
            posting.applyMatch(match.score(), match.reason(), now);
            jobPostingRepository.save(posting);
            savedCount++;
        }
        return savedCount;
    }

    public record JobPostingCollectionResult(
            boolean saraminEnabled, int saraminCollected, int expiredCount) {}
}
