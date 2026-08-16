package com.selfintro.modules.jobposting.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.selfintro.SelfIntroApplication;
import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.entity.JobPostingSourceUrl;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPlatform;
import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterItemRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPositionChoiceRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceImageRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSourceUrlRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingStatusEventRepository;
import com.selfintro.modules.printtemplate.domain.repository.PrintTemplateRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(
        classes = SelfIntroApplication.class,
        properties = {
            "ADMIN_USERNAME=test-admin",
            "ADMIN_PASSWORD=test-password",
            "app.admin.username=test-admin",
            "app.admin.password=test-password",
            "app.visitor.cookie-secure=false",
            "spring.flyway.enabled=false",
            "spring.jpa.hibernate.ddl-auto=create-drop"
        })
@ActiveProfiles("test")
@Transactional
class JobPostingDedupMigrationServiceTest {

    @Autowired private JobPostingRepository jobPostingRepository;

    @Autowired private JobPostingSourceUrlRepository sourceUrlRepository;

    @Autowired private JobPostingSourceImageRepository sourceImageRepository;

    @Autowired private JobPostingPositionChoiceRepository positionChoiceRepository;

    @Autowired private JobPostingCoverLetterItemRepository coverLetterItemRepository;

    @Autowired private JobPostingStatusEventRepository statusEventRepository;

    @Autowired private PrintTemplateRepository printTemplateRepository;

    @Autowired private JobPostingDedupMigrationService migrationService;

    @Test
    @DisplayName("DB에 수집된 기존 중복 공고 및 사람인 기타/추적URL을 정규화하고 하나로 병합한다")
    void mergesDuplicatePostingsAndNormalizesUrlsInDatabase() {
        LocalDateTime now = LocalDateTime.now();

        // 1. 사람인 공고 생성 (기존 DB 상태 시뮬레이션: URL 2개 등록, 하나는 OTHER 로 잘못 분류된 경우)
        JobPosting saraminPosting =
                jobPostingRepository.save(
                        JobPosting.collect(
                                new JobPosting.Draft(
                                        "AI 개발 엔지니어",
                                        "(주)스카이웨어",
                                        "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=54566467&utm_source=mail#seq=0",
                                        null,
                                        JobPostingSource.URL_INGEST,
                                        null,
                                        "서울 마포구",
                                        "인턴",
                                        null,
                                        null,
                                        false,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null),
                                now));

        String mailUrl =
                "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=54566467&utm_source=mail#seq=0";
        String listUrl =
                "https://www.saramin.co.kr/zf_user/jobs/relay/view?view_type=list&rec_idx=54566467#seq=0";

        sourceUrlRepository.save(
                JobPostingSourceUrl.primary(
                        saraminPosting.getId(), mailUrl, JobPostingPlatform.OTHER, now));
        sourceUrlRepository.save(
                JobPostingSourceUrl.additional(
                        saraminPosting.getId(), listUrl, JobPostingPlatform.SARAMIN, now));

        // 2. 잡코리아 중복 공고 생성 (기존 DB 상태: 스카이웨어 동일 직무 공고가 별개 ID로 분리 저장된 경우)
        JobPosting jobkoreaPosting =
                jobPostingRepository.save(
                        JobPosting.collect(
                                new JobPosting.Draft(
                                        "(주)스카이웨어 채용 - AI 개발 엔지니어 채용(신입/Java개발)",
                                        "(주)스카이웨어",
                                        "https://www.jobkorea.co.kr/Recruit/GI_Read/49653580?Oem_Code=C1&sc=9",
                                        null,
                                        JobPostingSource.URL_INGEST,
                                        null,
                                        "서울 마포구 삼개로 16",
                                        "정규직",
                                        null,
                                        null,
                                        false,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null),
                                now));

        String jobkoreaUrl = "https://www.jobkorea.co.kr/Recruit/GI_Read/49653580?Oem_Code=C1&sc=9";
        sourceUrlRepository.save(
                JobPostingSourceUrl.primary(
                        jobkoreaPosting.getId(), jobkoreaUrl, JobPostingPlatform.JOBKOREA, now));

        // 3. 마이그레이션 실행
        JobPostingDedupMigrationService.MigrationResult result = migrationService.runMigration();

        assertThat(result.mergedPostingsCount()).isGreaterThanOrEqualTo(1);

        // 4. 검증: 스카이웨어 공고가 1개로 통합되었는지 확인
        List<JobPosting> skywarePostings =
                jobPostingRepository.findByCompanyNameNormalized("스카이웨어");
        assertThat(skywarePostings).hasSize(1);

        JobPosting winner = skywarePostings.getFirst();
        List<JobPostingSourceUrl> winnerUrls =
                sourceUrlRepository.findByJobPostingIdOrderByPrimaryDescCreatedAtAsc(
                        winner.getId());

        // 사람인 URL (canonicalized) 과 잡코리아 URL (canonicalized) 이 모두 승자 공고에 존재하는지 확인
        String expectedSaraminCanonical =
                "https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=54566467";
        String expectedJobkoreaCanonical = "https://www.jobkorea.co.kr/Recruit/GI_Read/49653580";

        List<String> actualUrls = winnerUrls.stream().map(JobPostingSourceUrl::getUrl).toList();
        assertThat(actualUrls).contains(expectedSaraminCanonical, expectedJobkoreaCanonical);

        // 사람인 URL의 플랫폼이 SARAMIN으로 재분류되었는지 확인
        JobPostingSourceUrl saraminSource =
                winnerUrls.stream()
                        .filter(u -> u.getUrl().equals(expectedSaraminCanonical))
                        .findFirst()
                        .orElseThrow();
        assertThat(saraminSource.getPlatform()).isEqualTo(JobPostingPlatform.SARAMIN);
    }

    @Test
    @DisplayName("서로 다른 공고에 동일한 공고의 수집 URL 파라미터가 다르게 등록되어도 전역 UK 에러 없이 마이그레이션한다")
    void handlesCrossPostingSameCanonicalUrlWithoutUniqueConstraintViolation() {
        LocalDateTime now = LocalDateTime.now();

        JobPosting p1 =
                jobPostingRepository.save(
                        JobPosting.collect(
                                new JobPosting.Draft(
                                        "백엔드 개발자",
                                        "A회사",
                                        "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=54637383&utm_source=mail",
                                        null,
                                        JobPostingSource.URL_INGEST,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        false,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null),
                                now));
        sourceUrlRepository.save(
                JobPostingSourceUrl.primary(
                        p1.getId(),
                        "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=54637383&utm_source=mail",
                        JobPostingPlatform.OTHER,
                        now));

        JobPosting p2 =
                jobPostingRepository.save(
                        JobPosting.collect(
                                new JobPosting.Draft(
                                        "백엔드 개발자",
                                        "A회사",
                                        "https://www.saramin.co.kr/zf_user/jobs/relay/view?view_type=list&rec_idx=54637383",
                                        null,
                                        JobPostingSource.URL_INGEST,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        false,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null),
                                now));
        sourceUrlRepository.save(
                JobPostingSourceUrl.primary(
                        p2.getId(),
                        "https://www.saramin.co.kr/zf_user/jobs/relay/view?view_type=list&rec_idx=54637383",
                        JobPostingPlatform.SARAMIN,
                        now));

        JobPostingDedupMigrationService.MigrationResult result = migrationService.runMigration();

        assertThat(result.duplicateUrlsDeletedCount()).isGreaterThanOrEqualTo(1);
        List<JobPosting> aPostings = jobPostingRepository.findByCompanyNameNormalized("A회사");
        assertThat(aPostings).hasSize(1);
    }
}
