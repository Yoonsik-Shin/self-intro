package com.selfintro.modules.jobapplication.application;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.jobapplication.domain.entity.JobPosting;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingSetting;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingSettingRepository;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * 사람인 채용정보 검색 API(https://oapi.saramin.co.kr/job-search) 클라이언트. 요청/응답/에러코드 스펙은 사람인 공식 개발자
 * 문서(oapi.saramin.co.kr/guide/job-search, /guide/info) 기준. 일일 호출 한도는 500회(공식 문서 기준)이며, 수집 1회당 호출
 * 1번만 사용하므로 여유가 크다.
 *
 * <p>access-key는 비밀값이라 환경변수로만 관리하고, 검색 키워드/개수/정렬/지역·직무·업종 코드처럼 재배포 없이 바꾸고 싶은 값은 {@link
 * JobPostingSetting}(DB, 어드민 설정 화면)에서 매 호출마다 읽는다.
 */
@Component
public class SaraminJobPostingClient {

    private static final String BASE_URL = "https://oapi.saramin.co.kr/job-search";
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final int MAX_AUTO_KEYWORDS = 5;

    /** 사람인 개발자 문서(guide/info)에 명시된 에러 코드 → 사람이 읽을 수 있는 메시지. */
    private static final Map<String, String> ERROR_MESSAGES =
            Map.of(
                    "1", "access-key가 입력되지 않았습니다.",
                    "2", "유효하지 않은 access-key입니다.",
                    "3", "요청 파라미터가 유효하지 않습니다.",
                    "4", "사람인 API 일일 최대 호출 횟수를 초과했습니다.",
                    "99", "사람인 API에서 알 수 없는 오류가 발생했습니다.");

    private final ObjectMapper objectMapper;
    private final SkillRepository skillRepository;
    private final JobPostingSettingRepository settingRepository;
    private final String accessKey;

    public SaraminJobPostingClient(
            ObjectMapper objectMapper,
            SkillRepository skillRepository,
            JobPostingSettingRepository settingRepository,
            @Value("${app.job-posting.saramin.access-key:}") String accessKey) {
        this.objectMapper = objectMapper;
        this.skillRepository = skillRepository;
        this.settingRepository = settingRepository;
        this.accessKey = accessKey;
    }

    public List<JobPosting.Draft> fetchPostings() {
        if (accessKey.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "사람인 API access-key가 설정되지 않았습니다.");
        }

        JobPostingSetting setting = settingRepository.getOrCreateDefault();
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        HttpRequest request =
                HttpRequest.newBuilder(buildUri(setting))
                        .timeout(Duration.ofSeconds(8))
                        .header("Accept", "application/json")
                        .GET()
                        .build();
        try {
            HttpResponse<String> response =
                    client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "사람인 API 호출에 실패했습니다 (HTTP " + response.statusCode() + ").");
            }
            SaraminEnvelope envelope =
                    objectMapper.readValue(response.body(), SaraminEnvelope.class);
            if (envelope.error() != null) {
                throw translateError(envelope.error());
            }
            return toDrafts(envelope);
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "사람인 API 호출 중 오류가 발생했습니다.", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "사람인 API 호출 중 오류가 발생했습니다.", exception);
        }
    }

    private ResponseStatusException translateError(SaraminError error) {
        String message =
                ERROR_MESSAGES.getOrDefault(error.code(), "사람인 API 오류 (코드 " + error.code() + ")");
        HttpStatus status =
                switch (error.code() == null ? "" : error.code()) {
                    case "2" -> HttpStatus.UNAUTHORIZED;
                    case "3" -> HttpStatus.BAD_REQUEST;
                    case "4" -> HttpStatus.TOO_MANY_REQUESTS;
                    default -> HttpStatus.BAD_GATEWAY;
                };
        return new ResponseStatusException(status, message);
    }

    private URI buildUri(JobPostingSetting setting) {
        int count = Math.max(1, Math.min(setting.getSearchCount(), 110));
        String sort =
                setting.getSearchSort() == null || setting.getSearchSort().isBlank()
                        ? "pd"
                        : setting.getSearchSort();
        StringBuilder url =
                new StringBuilder(BASE_URL)
                        .append("?access-key=")
                        .append(encode(accessKey))
                        .append("&count=")
                        .append(count)
                        .append("&sort=")
                        .append(encode(sort));
        String keywords = setting.getSearchKeywords();
        String effectiveKeywords =
                (keywords == null || keywords.isBlank()) ? autoKeywordsFromSkills() : keywords;
        if (!effectiveKeywords.isBlank()) {
            url.append("&keywords=").append(encode(effectiveKeywords));
        }
        if (setting.getLocationCode() != null && !setting.getLocationCode().isBlank()) {
            url.append("&loc_cd=").append(encode(setting.getLocationCode()));
        }
        if (setting.getJobCode() != null && !setting.getJobCode().isBlank()) {
            url.append("&job_cd=").append(encode(setting.getJobCode()));
        }
        if (setting.getIndustryCode() != null && !setting.getIndustryCode().isBlank()) {
            url.append("&ind_cd=").append(encode(setting.getIndustryCode()));
        }
        return URI.create(url.toString());
    }

    /** 검색 키워드를 직접 설정하지 않았다면 내 보유 기술 상위 N개로 자동 구성한다 (사람인은 공백 구분 복수검색 지원). */
    private String autoKeywordsFromSkills() {
        return skillRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(Skill::getName)
                .limit(MAX_AUTO_KEYWORDS)
                .reduce((a, b) -> a + " " + b)
                .orElse("");
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private List<JobPosting.Draft> toDrafts(SaraminEnvelope envelope) {
        if (envelope.jobs() == null || envelope.jobs().job() == null) {
            return List.of();
        }
        return envelope.jobs().job().stream()
                .filter(SaraminJobPostingClient::isUsablePosting)
                .map(this::toDraft)
                .toList();
    }

    private static boolean isUsablePosting(SaraminJob job) {
        boolean isActive = job.active() == null || "1".equals(String.valueOf(job.active()));
        return isActive
                && job.position() != null
                && job.position().title() != null
                && job.company() != null
                && job.company().detail() != null
                && job.company().detail().name() != null
                && job.url() != null;
    }

    private JobPosting.Draft toDraft(SaraminJob job) {
        LocalDate deadline =
                job.expirationTimestamp() != null
                        ? Instant.ofEpochSecond(job.expirationTimestamp())
                                .atZone(SEOUL)
                                .toLocalDate()
                        : null;
        // 사람인은 상시채용 공고에도 별도 플래그 없이 만료 타임스탬프를 아예 내려주지 않는다.
        boolean alwaysOpen = deadline == null;
        String jobCodeName =
                job.position().jobCode() != null ? job.position().jobCode().name() : null;
        String requiredSkillsRaw = String.join(" ", safe(jobCodeName), safe(job.keyword())).trim();
        String location =
                job.position().location() != null ? job.position().location().name() : null;
        String employmentType =
                job.position().jobType() != null ? job.position().jobType().name() : null;
        String salaryNote = job.salary() != null ? job.salary().name() : null;

        return new JobPosting.Draft(
                job.position().title(),
                job.company().detail().name(),
                job.url(),
                job.id(),
                JobPostingSource.SARAMIN,
                requiredSkillsRaw.isBlank() ? null : requiredSkillsRaw,
                location,
                employmentType,
                deadline,
                alwaysOpen,
                salaryNote,
                null,
                null,
                null,
                null,
                null,
                null);
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    private record SaraminEnvelope(SaraminJobs jobs, SaraminError error) {}

    private record SaraminError(String code, String message) {}

    private record SaraminJobs(List<SaraminJob> job) {}

    private record SaraminJob(
            String id,
            String url,
            Object active,
            String keyword,
            SaraminCompany company,
            SaraminPosition position,
            SaraminCode salary,
            @JsonProperty("expiration-timestamp") Long expirationTimestamp) {}

    private record SaraminCompany(SaraminCompanyDetail detail) {}

    private record SaraminCompanyDetail(String name) {}

    private record SaraminPosition(
            String title,
            SaraminCode location,
            @JsonProperty("job-type") SaraminCode jobType,
            @JsonProperty("job-code") SaraminCode jobCode) {}

    private record SaraminCode(String code, String name) {}
}
