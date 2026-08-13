package com.selfintro.modules.jobapplication.application;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.service.JobPostingGeocodingService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 좌표 백필은 기동 시점(ApplicationReadyEvent)에 자동으로 돌지 않는다 — {@code @EnableAsync} 없이 배포됐던 시절 이 리스너가
 * ApplicationReadyEvent를 동기로 붙잡고 있어서, 같은 이벤트로 readiness를 ACCEPTING_TRAFFIC으로 올리는 Boot 내부 리스너가 대기하고,
 * 백필이 끝나는 몇 분간 파드가 Service 엔드포인트에서 빠지는 사고가 있었다(2026-08-06). 지금은 관리자가 {@code POST
 * /api/admin/job-postings/backfill-coordinates}로 수동 트리거하고, 여기서 진짜 비동기(@EnableAsync)로 돈다 — 재배포마다 매번
 * 재시도되는 낭비도 함께 없앤다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JobPostingGeocodingBackfillRunner {

    private final JobPostingRepository jobPostingRepository;
    private final JobPostingGeocodingService geocodingService;

    @Async
    @Transactional
    public void backfillCoordinates() {
        try {
            List<JobPosting> unlocatedPostings =
                    jobPostingRepository.findAllByOwnerWorkspaceIdIsNull().stream()
                            .filter(p -> p.getLocation() != null && !p.getLocation().isBlank())
                            .filter(p -> p.getLatitude() == null || p.getLongitude() == null)
                            .toList();

            if (unlocatedPostings.isEmpty()) {
                log.info("모든 채용 공고에 좌표 정보가 이미 존재합니다.");
                return;
            }

            log.info("채용 공고 좌표 백필 작업을 시작합니다. 대상 건수: {}건", unlocatedPostings.size());
            int successCount = 0;
            for (JobPosting posting : unlocatedPostings) {
                var coords = geocodingService.geocode(posting.getLocation());
                if (coords.isPresent()) {
                    posting.updateCoordinates(coords.get().latitude(), coords.get().longitude());
                    successCount++;
                }
                // 요청 보조 딜레이 (Rate limiting 고려)
                Thread.sleep(100);
            }
            log.info("채용 공고 좌표 백필 완료: 총 {}건 중 {}건 성공", unlocatedPostings.size(), successCount);
        } catch (Exception e) {
            log.warn("채용 공고 좌표 백필 중 오류 발생", e);
        }
    }
}
