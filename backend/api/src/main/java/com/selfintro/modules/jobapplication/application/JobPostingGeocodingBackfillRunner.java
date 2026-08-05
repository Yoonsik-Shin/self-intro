package com.selfintro.modules.jobapplication.application;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.service.JobPostingGeocodingService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class JobPostingGeocodingBackfillRunner {

    private final JobPostingRepository jobPostingRepository;
    private final JobPostingGeocodingService geocodingService;

    @Async
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void backfillCoordinates() {
        try {
            List<JobPosting> unlocatedPostings = jobPostingRepository.findAll().stream()
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
