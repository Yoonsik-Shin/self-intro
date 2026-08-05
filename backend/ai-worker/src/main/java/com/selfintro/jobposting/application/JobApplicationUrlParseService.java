package com.selfintro.jobposting.application;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Frame;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.PlaywrightException;
import com.microsoft.playwright.options.WaitUntilState;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;
import javax.imageio.ImageIO;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Connection;
import org.jsoup.HttpStatusException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 채용공고 URL 하나를 서버에서 단건으로 가져와 AI로 회사명/직무명/마감일 등을 추출한다. 별도의 on/off 플래그 없이 {@link NvidiaNimClient}에
 * API 키가 설정되어 있으면 바로 동작한다.
 *
 * <p>일부 채용 사이트는 마감일·지원자격 같은 정보를 텍스트가 아니라 배너 이미지로만 제공한다. 텍스트 추출 결과가 빈약하면(직무명이 없거나 상세 항목이 거의 안 채워지면)
 * 페이지에서 가장 큰 이미지를 찾아 비전 모델로 한 번 더 읽어 빈 필드를 보충한다.
 */
@Slf4j
@Service
public class JobApplicationUrlParseService {

    private static final String PARSE_PROMPT =
            """
            당신은 채용 공고 페이지의 본문 텍스트에서 사실만 추출하는 편집 보조입니다.
            입력으로 공고 URL과 페이지 본문 텍스트가 주어집니다. 본문에 실제로 있는 내용만 사실로 인정하고,
            없는 내용은 만들어내지 마세요. 알 수 없는 값은 null로 두세요.
            source는 URL의 도메인이나 페이지 내용으로 미루어 알 수 있는 채용 플랫폼/회사 채용 페이지 이름입니다
            (예: 사람인, 원티드, 잡코리아, 회사 채용 사이트 등).
            deadline은 지원 마감일을 YYYY-MM-DD 형식으로 반환하세요. "접수기간 2026.7.20~8.2"처럼
            기간으로 표기되어 있으면 마지막 날짜(종료일)를 마감일로 사용하세요. 날짜를 알 수 없으면
            null로 반환하세요.
            alwaysOpen은 본문에 "상시채용", "채용시 마감", "수시채용"처럼 정해진 마감일 없이 계속
            모집한다는 내용이 명시된 경우에만 true로 반환하세요. 그 경우 deadline은 항상 null이어야
            합니다. 그런 표현이 없고 단순히 마감일을 못 찾은 경우에는 false로 반환하세요.
            jobDescription은 담당 업무/직무 상세 설명, requiredQualifications는 지원자격(필수 요건),
            preferredQualifications는 우대사항, applicationMethod는 지원방법(접수 방식, 제출 서류 등),
            compensationDetail은 급여를 제외한 처우조건(근무형태, 복리후생 등)입니다.
            hiringProcess는 전형절차입니다. 서류전형·필기시험·실무면접·임원면접·최종합격 등 각 단계
            이름을 순서대로 나열하고, 그 단계에 해당하는 날짜나 기간이 본문에 있으면 반드시 단계
            이름 뒤에 붙여서 함께 적으세요(예: "서류접수: 2026.7.20 ~ 8.2", "필기시험: 2026.8.19(예정)",
            "실무면접: 2026.8.25(예정)", "인턴십: 2026.8.31 ~ 10.8", "최종합격자 발표: 2026.10.15(예정)").
            날짜가 본문에 없는 단계는 이름만 적으세요. 날짜를 지어내지 마세요.
            각 항목은 본문에 있는 내용만 줄바꿈으로 구분된 목록 형태로 정리하고, 본문에 해당 내용이
            없으면 null로 두세요.
            location은 근무지입니다. 본문에 있는 표현을 그대로 짧게 옮기세요(예: "서울특별시 종로구",
            "서울/경기", "재택근무"). employmentType은 고용형태입니다(예: "정규직", "계약직", "인턴",
            "프리랜서"). 둘 다 본문에 명시되어 있지 않으면 null로 두세요.
            설명이나 마크다운 없이 반드시 아래 JSON 구조만 반환하세요.
            {"companyName":null,"positionTitle":null,"source":null,"deadline":null,"alwaysOpen":false,"salaryNote":null,"location":null,"employmentType":null,"jobDescription":null,"requiredQualifications":null,"preferredQualifications":null,"hiringProcess":null,"applicationMethod":null,"compensationDetail":null}
            """;

    private static final String VISION_PARSE_PROMPT =
            """
            당신은 채용 공고 이미지(포스터/배너)에서 사실만 추출하는 편집 보조입니다.
            이미지가 여러 장 주어지면 위에서 아래로 이어지는 하나의 긴 배너를 순서대로 잘라놓은
            조각들이니, 전체를 하나의 문서로 이어서 읽고 정보를 종합해 답하세요.
            이미지에 실제로 보이는 텍스트만 사실로 인정하고, 보이지 않는 내용은 만들어내지 마세요.
            알 수 없는 값은 null로 두세요.
            deadline은 지원 마감일을 YYYY-MM-DD 형식으로 반환하세요. "2026.7.20(월)~8.2(일)"처럼
            기간으로 표기되어 있으면 마지막 날짜(종료일)를 마감일로 사용하세요. 날짜를 알 수 없으면
            null로 반환하세요.
            alwaysOpen은 이미지에 "상시채용", "채용시 마감", "수시채용"처럼 정해진 마감일 없이 계속
            모집한다는 내용이 명시된 경우에만 true로 반환하세요. 그 경우 deadline은 항상 null이어야
            합니다. 그런 표현이 없고 단순히 마감일이 안 보이는 경우에는 false로 반환하세요.
            채용 공고 이미지는 보통 "모집 부문/담당 업무", "지원 자격", "우대 사항", "전형절차 및 일정",
            "지원 방법", "처우"처럼 섹션 제목이 붙은 표나 구획으로 나뉘어 있습니다. 각 필드는 반드시 그
            섹션 제목 아래에 있는 내용만 담고, 다른 섹션의 내용을 섞어 넣지 마세요:
            jobDescription은 "모집 부문/담당 업무" 섹션, requiredQualifications는 "지원 자격"(필수 요건)
            섹션, preferredQualifications는 "우대 사항" 섹션(자격증·수상 경력 등이 있으면 반드시 이 필드에),
            applicationMethod는 "지원 방법/접수" 섹션, compensationDetail은 "처우/근무조건"(급여 제외,
            정규직 전환 시 연봉 수준·복리후생 등) 섹션입니다.
            hiringProcess는 "전형절차/전형 일정" 섹션입니다. 서류전형·필기시험·실무면접·임원면접·
            최종합격 등 각 단계 이름을 순서대로 나열하고, 그 단계 옆이나 아래에 날짜/기간이 이미지에
            보이면 반드시 단계 이름 뒤에 붙여서 함께 적으세요(예: "서류접수: 2026.7.20 ~ 8.2",
            "필기시험: 2026.8.19(예정)", "실무면접: 2026.8.25(예정)", "최종합격자 발표: 2026.10.15(예정)").
            날짜가 보이지 않는 단계는 이름만 적으세요. 날짜를 지어내지 마세요.
            각 항목은 이미지에 있는 내용만 줄바꿈으로 구분된 목록 형태로 정리하고, 이미지에
            해당 섹션이 없으면 null로 두세요.
            location은 근무지, employmentType은 고용형태(정규직/계약직/인턴 등)입니다. 이미지에 보이는
            표현을 그대로 짧게 옮기고, 없으면 null로 두세요.
            설명이나 마크다운 없이 반드시 아래 JSON 구조만 반환하세요.
            {"companyName":null,"positionTitle":null,"source":null,"deadline":null,"alwaysOpen":false,"salaryNote":null,"location":null,"employmentType":null,"jobDescription":null,"requiredQualifications":null,"preferredQualifications":null,"hiringProcess":null,"applicationMethod":null,"compensationDetail":null}
            """;

    private static final int MAX_PAGE_TEXT_LENGTH = 12000;
    // job_posting.company_name/position_title 컬럼 길이(각각 varchar(100)/varchar(150))와 맞춘다.
    // AI가 부제목이나 회사 소개 문구까지 붙여 넘길 때가 있어, DB에 넣기 전에 여기서 한 번 잘라야
    // 저장 시점의 DataIntegrityViolationException(Data truncation)을 막을 수 있다.
    private static final int MAX_COMPANY_NAME_LENGTH = 100;
    private static final int MAX_POSITION_TITLE_LENGTH = 150;
    // 한글은 토크나이저 특성상 음절당 소모 토큰이 커서, 상세 항목(업무/자격/전형절차 등)이
    // 많은 공고는 4096 토큰으로도 LENGTH(토큰 한도)에 걸려 JSON을 못 닫는 사례가 있었다.
    private static final int PARSE_MAX_OUTPUT_TOKENS = 8192;
    private static final int VISION_MAX_OUTPUT_TOKENS = 2048;
    private static final Duration PARSE_AI_TIMEOUT = Duration.ofSeconds(90);
    private static final Duration VISION_AI_TIMEOUT = Duration.ofSeconds(120);
    private static final int MAX_RAW_BODY_SIZE = 2_000_000;
    private static final int FETCH_TIMEOUT_MILLIS = 8000;
    private static final List<DateTimeFormatter> DEADLINE_FORMATTERS =
            List.of(
                    DateTimeFormatter.ISO_LOCAL_DATE,
                    DateTimeFormatter.ISO_OFFSET_DATE_TIME,
                    DateTimeFormatter.ISO_LOCAL_DATE_TIME,
                    DateTimeFormatter.ofPattern("yyyy.MM.dd"),
                    DateTimeFormatter.ofPattern("yyyy/MM/dd"),
                    DateTimeFormatter.ofPattern("yyyy년 MM월 dd일"));

    private static final String USER_AGENT =
            "Mozilla/5.0 (compatible; SelfIntroJobApplicationBot/1.0)";
    private static final Set<String> IMAGE_EXCLUDE_KEYWORDS =
            Set.of(
                    "logo", "icon", "favicon", "sprite", "btn", "button", "arrow", "gnb", "header",
                    "footer", "nav", "pixel", "blank", "close", "bullet");
    private static final int MIN_BANNER_IMAGE_BYTES = 15_000;
    private static final int MAX_BANNER_IMAGE_BYTES = 8_000_000;
    private static final int MAX_IMAGE_CANDIDATES = 8;
    // 비전 모델이 한 장으로 편하게 읽을 수 있는 세로 길이 상한을 넘는 배너는 여러 장으로 잘라 보낸다
    // (모델 카드 기준 최대 1k×2k 해상도 이미지 4장까지 지원). 겹침을 둬서 타일 경계에서 글자 줄이
    // 잘리는 걸 방지한다.
    private static final int TILE_THRESHOLD_PX = 1800;
    private static final int TILE_MAX_HEIGHT_PX = 1600;
    private static final int TILE_OVERLAP_PX = 150;
    private static final int MIN_FILLED_DETAIL_FIELDS = 2;
    private static final int MIN_MEANINGFUL_TEXT_LENGTH = 200;
    // 상세요강 내용이 있는 채용 공고라면 거의 항상 등장하는 표제어. 잡코리아처럼 정적 HTML은
    // 텍스트가 충분해도(내비게이션·추천공고 등) 정작 상세요강 본문은 iframe으로 분리되어 있어
    // 이 표제어들이 하나도 없을 수 있다 — 그런 경우엔 헤드리스 렌더링으로 다시 시도한다.
    private static final Set<String> DETAIL_SECTION_MARKERS =
            Set.of("담당업무", "수행업무", "주요업무", "우대사항", "전형절차", "채용전형");
    private static final long STREAM_TIMEOUT_MILLIS = 360_000L;
    private static final double HEADLESS_NAVIGATE_TIMEOUT_MILLIS = 20_000;
    private static final ExtractedFields EMPTY_EXTRACTED_FIELDS =
            new ExtractedFields(
                    null, null, null, null, null, null, null, null, null, null, null, null, null,
                    null);

    private final NvidiaNimClient nvidiaNimClient;
    private final ObjectMapper objectMapper;
    private final String visionModel;
    private final java.util.concurrent.Semaphore parseSemaphore =
            new java.util.concurrent.Semaphore(3);

    public JobApplicationUrlParseService(
            NvidiaNimClient nvidiaNimClient,
            ObjectMapper objectMapper,
            @Value("${app.ai.vision-model}") String visionModel) {
        this.nvidiaNimClient = nvidiaNimClient;
        this.objectMapper = objectMapper;
        this.visionModel = visionModel;
    }

    public SseEmitter parseStream(String url) {
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual()
                .name("job-application-parse-stream")
                .start(() -> streamParse(url, emitter));
        return emitter;
    }

    private void streamParse(String url, SseEmitter emitter) {
        boolean acquired = false;
        try {
            if (!parseSemaphore.tryAcquire(10, java.util.concurrent.TimeUnit.SECONDS)) {
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "현재 처리 중인 공고 분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
            }
            acquired = true;
            JobApplicationUrlParseResponse response = parse(url);
            send(emitter, new CompleteEvent("complete", response));
            emitter.complete();
        } catch (ResponseStatusException exception) {
            log.warn("채용공고 URL 분석 스트리밍 실패: {}", exception.getReason(), exception);
            fail(emitter, exception.getReason() == null ? "AI 분석에 실패했습니다." : exception.getReason());
        } catch (Exception exception) {
            log.warn("채용공고 URL 분석 스트리밍 중 예상하지 못한 오류", exception);
            fail(emitter, "AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            if (acquired) {
                parseSemaphore.release();
            }
        }
    }

    private void send(SseEmitter emitter, Object payload) {
        try {
            emitter.send(
                    SseEmitter.event()
                            .data(
                                    objectMapper.writeValueAsString(payload),
                                    MediaType.APPLICATION_JSON));
        } catch (IOException exception) {
            throw new UncheckedIOException("SSE 이벤트 전송에 실패했습니다.", exception);
        }
    }

    private void fail(SseEmitter emitter, String message) {
        try {
            send(emitter, new ErrorEvent("error", message));
            emitter.complete();
        } catch (RuntimeException ignored) {
        }
    }

    private record CompleteEvent(String type, JobApplicationUrlParseResponse response) {}

    private record ErrorEvent(String type, String message) {}

    public JobApplicationUrlParseResponse parse(String url) {
        long startedAt = System.nanoTime();
        URI uri = normalizeSaraminRelayUrl(validateUrl(url));
        long fetchStartedAt = System.nanoTime();
        Document document = fetchDocument(uri);
        long fetchMillis = elapsedMillis(fetchStartedAt);
        Optional<JobApplicationUrlParseResponse> greetingHrResponse =
                parseGreetingHrDocument(uri, document, url);
        if (greetingHrResponse.isPresent()) {
            return logGreetingHrResult(uri, fetchMillis, startedAt, greetingHrResponse.get());
        }
        Optional<JobApplicationUrlParseResponse> jobkoreaResponse =
                parseJobkoreaDocument(uri, document, url);
        if (jobkoreaResponse.isPresent()) {
            log.info(
                    "잡코리아 공고 직접 구조 파싱 완료: host={}, fetch={}ms, total={}ms",
                    uri.getHost(),
                    fetchMillis,
                    elapsedMillis(startedAt));
            return jobkoreaResponse.get();
        }
        if (document.text().trim().length() < MIN_MEANINGFUL_TEXT_LENGTH
                || looksLikeMissingDetailSection(document.text())) {
            // 정적 HTML에 실제 내용이 거의 없으면 SPA(클라이언트 렌더링) 페이지일 가능성이 높고,
            // 텍스트 자체는 충분해도 상세요강 표제어가 하나도 없으면 본문이 iframe 등으로 분리되어
            // 정적 fetch에 아예 안 실렸을 가능성이 높다 — 두 경우 모두 헤드리스 브라우저로 JS를
            // 실행한 뒤의 DOM을 대신 사용한다. 렌더링에 실패하면 원래 정적 문서를 그대로 써서
            // 이후 흐름(이미지 배너 폴백 등)이 기존과 동일하게 동작하게 둔다.
            document = renderWithHeadlessBrowser(uri).orElse(document);
        }
        greetingHrResponse = parseGreetingHrDocument(uri, document, url);
        if (greetingHrResponse.isPresent()) {
            return logGreetingHrResult(uri, fetchMillis, startedAt, greetingHrResponse.get());
        }
        String pageText = extractPageText(uri, document);
        String userPrompt = "URL: " + url + "\n\n본문:\n" + pageText;

        try {
            // 텍스트가 아주 짧아도(예: "OO 채용사이트" 한 줄) 회사명 같은 확실한 신호가 있을 수 있어
            // 텍스트 모델은 항상 먼저 실행한다. merge()가 텍스트 값을 우선하므로, 비전 모델은 어디까지나
            // 텍스트가 못 채운 항목을 보충하는 역할만 한다 — 세로로 긴 배너 이미지는 축소되면서
            // 작은 글씨(로고 등)를 오독하기 쉬워, 텍스트로 이미 확인된 값을 이미지 결과로 덮어쓰지 않는다.
            long parseAiStartedAt = System.nanoTime();
            ExtractedFields extracted = extractFields(userPrompt);
            long parseAiMillis = elapsedMillis(parseAiStartedAt);
            if ((looksIncomplete(extracted)
                    || pageText.trim().length() < MIN_MEANINGFUL_TEXT_LENGTH)) {
                extracted = enrichFromBannerImage(extracted, document);
            }
            LocalDate deadline = parseDate(extracted.deadline());
            boolean alwaysOpen = deadline == null && Boolean.TRUE.equals(extracted.alwaysOpen());
            JobApplicationUrlParseResponse response =
                    new JobApplicationUrlParseResponse(
                            AiJsonSupport.blankToNull(
                                    AiJsonSupport.limit(
                                            extracted.companyName(), MAX_COMPANY_NAME_LENGTH)),
                            AiJsonSupport.blankToNull(
                                    AiJsonSupport.limit(
                                            extracted.positionTitle(), MAX_POSITION_TITLE_LENGTH)),
                            AiJsonSupport.blankToNull(extracted.source()),
                            deadline,
                            alwaysOpen,
                            AiJsonSupport.blankToNull(extracted.salaryNote()),
                            AiJsonSupport.blankToNull(extracted.location()),
                            AiJsonSupport.blankToNull(extracted.employmentType()),
                            AiJsonSupport.blankToNull(extracted.jobDescription()),
                            AiJsonSupport.blankToNull(extracted.requiredQualifications()),
                            AiJsonSupport.blankToNull(extracted.preferredQualifications()),
                            AiJsonSupport.blankToNull(extracted.hiringProcess()),
                            AiJsonSupport.blankToNull(extracted.applicationMethod()),
                            AiJsonSupport.blankToNull(extracted.compensationDetail()),
                            url);
            log.info(
                    "채용공고 URL 분석 완료: host={}, fetch={}ms, parseAi={}ms, total={}ms",
                    uri.getHost(),
                    fetchMillis,
                    parseAiMillis,
                    elapsedMillis(startedAt));
            return response;
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "AI 응답을 처리하지 못했습니다. 다시 시도해주세요.", exception);
        }
    }

    private ExtractedFields extractFields(String userPrompt) throws JsonProcessingException {
        return AiJsonSupport.generateAndParse(
                () ->
                        nvidiaNimClient.generateJsonOnce(
                                PARSE_PROMPT,
                                userPrompt,
                                PARSE_MAX_OUTPUT_TOKENS,
                                PARSE_AI_TIMEOUT),
                raw ->
                        AiJsonSupport.parseJson(
                                objectMapper, raw, ExtractedFields.class, "채용공고 URL 분석"),
                2);
    }

    private static JobApplicationUrlParseResponse logGreetingHrResult(
            URI uri, long fetchMillis, long startedAt, JobApplicationUrlParseResponse response) {
        log.info(
                "GreetingHR 공고 구조 분석 완료: host={}, fetch={}ms, total={}ms",
                uri.getHost(),
                fetchMillis,
                elapsedMillis(startedAt));
        return response;
    }

    /**
     * GreetingHR 공고는 제목, 회사명, 요약 정보와 Quill 본문을 정적 HTML에 모두 포함한다. 이 정보를 다시 LLM에 보내면 결과가 달라지지 않으면서 외부
     * AI 장애의 영향을 받고 수집 시간이 길어지므로 DOM을 직접 구조화한다. 필수 값이나 본문이 없는 예외적인 페이지만 기존 AI 경로로 되돌린다.
     */
    Optional<JobApplicationUrlParseResponse> parseGreetingHrDocument(
            URI uri, Document document, String postingUrl) {
        if (!isGreetingHr(uri)) {
            return Optional.empty();
        }

        String companyName =
                AiJsonSupport.blankToNull(
                        AiJsonSupport.limit(
                                document.selectFirst("meta[property=og:site_name]") == null
                                        ? null
                                        : document.selectFirst("meta[property=og:site_name]")
                                                .attr("content"),
                                MAX_COMPANY_NAME_LENGTH));
        String positionTitle =
                AiJsonSupport.blankToNull(
                        AiJsonSupport.limit(
                                document.selectFirst("meta[property=og:title]") == null
                                        ? null
                                        : document.selectFirst("meta[property=og:title]")
                                                .attr("content"),
                                MAX_POSITION_TITLE_LENGTH));
        Element editor = document.selectFirst(".ql-editor");
        if (!AiJsonSupport.hasText(companyName)
                || !AiJsonSupport.hasText(positionTitle)
                || editor == null
                || !AiJsonSupport.hasText(editor.text())) {
            return Optional.empty();
        }

        String location = greetingHrSummaryValue(document, "근무지");
        String employmentType = greetingHrSummaryValue(document, "고용형태");
        GreetingHrSections sections = extractGreetingHrSections(editor);
        boolean alwaysOpen =
                Stream.of("상시채용", "상시 채용", "채용시 마감", "수시채용", "수시 채용")
                        .anyMatch(editor.text()::contains);

        return Optional.of(
                new JobApplicationUrlParseResponse(
                        companyName,
                        positionTitle,
                        "그리팅",
                        null,
                        alwaysOpen,
                        null,
                        location,
                        employmentType,
                        pickSection(sections.jobDescription(), editor.text()),
                        sections.requiredQualifications(),
                        sections.preferredQualifications(),
                        sections.hiringProcess(),
                        sections.applicationMethod(),
                        sections.compensationDetail(),
                        postingUrl));
    }

    private static String greetingHrSummaryValue(Document document, String wantedLabel) {
        for (Element item : document.select("[data-testid=공고_요약_컴포넌트]")) {
            Element label = item.selectFirst("[data-testid=공고_요약_컴포넌트_제목]");
            Element value = item.selectFirst("[data-testid=공고_요약_컴포넌트_내용]");
            if (label != null && value != null && wantedLabel.equals(label.text().trim())) {
                return AiJsonSupport.blankToNull(value.text());
            }
        }
        return null;
    }

    private static GreetingHrSections extractGreetingHrSections(Element editor) {
        List<String> job = new ArrayList<>();
        List<String> required = new ArrayList<>();
        List<String> preferred = new ArrayList<>();
        List<String> hiring = new ArrayList<>();
        List<String> application = new ArrayList<>();
        List<String> compensation = new ArrayList<>();
        List<String> current = null;

        for (Element child : editor.children()) {
            String text = child.text().trim();
            if (!AiJsonSupport.hasText(text)) {
                continue;
            }
            if (child.tagName().matches("h[1-6]")) {
                current =
                        classifyGreetingHrSection(
                                text, job, required, preferred, application, compensation);
                continue;
            }
            if (current != null) {
                addDistinct(current, text);
            }
        }

        // GreetingHR는 지원 섹션 안에 전형 과정·제출 서류·채용 조건을 함께 넣는 경우가 많다.
        // 해당 줄은 목적별 필드에도 복사해 사용자가 수집 후 바로 확인할 수 있게 한다.
        for (String line : List.copyOf(application)) {
            if (line.contains("채용 과정") || line.contains("전형 과정") || line.contains("전형절차")) {
                addDistinct(hiring, line);
            }
            if (line.contains("채용 조건") || line.contains("근무 조건")) {
                addDistinct(compensation, line);
            }
        }

        return new GreetingHrSections(
                joinSection(job),
                joinSection(required),
                joinSection(preferred),
                joinSection(hiring),
                joinSection(application),
                joinSection(compensation));
    }

    private static List<String> classifyGreetingHrSection(
            String heading,
            List<String> job,
            List<String> required,
            List<String> preferred,
            List<String> application,
            List<String> compensation) {
        String normalized = heading.replace(" ", "");
        if (normalized.contains("주요업무") || normalized.contains("담당업무")) {
            return job;
        }
        if (normalized.contains("자격요건")
                || normalized.contains("지원자격")
                || normalized.contains("필수요건")) {
            return required;
        }
        if (normalized.contains("우대사항") || normalized.contains("우대요건")) {
            return preferred;
        }
        if (normalized.contains("혜택") || normalized.contains("복지") || normalized.contains("근무조건")) {
            return compensation;
        }
        if (normalized.contains("지원")
                || normalized.contains("채용절차")
                || normalized.contains("전형절차")) {
            return application;
        }
        return null;
    }

    private static String joinSection(List<String> lines) {
        return lines.isEmpty() ? null : String.join("\n", lines);
    }

    private static String pickSection(String section, String fallback) {
        return AiJsonSupport.hasText(section)
                ? section
                : AiJsonSupport.limit(fallback, MAX_PAGE_TEXT_LENGTH);
    }

    private static boolean isJobkorea(URI uri) {
        String host = uri.getHost();
        return host != null && host.toLowerCase(Locale.ROOT).endsWith("jobkorea.co.kr");
    }

    Optional<JobApplicationUrlParseResponse> parseJobkoreaDocument(
            URI uri, Document document, String postingUrl) {
        if (!isJobkorea(uri)) {
            return Optional.empty();
        }

        String html = document.html();
        String positionTitleRaw = null;
        Element metaOgTitle = document.selectFirst("meta[property=og:title]");
        if (metaOgTitle != null && AiJsonSupport.hasText(metaOgTitle.attr("content"))) {
            positionTitleRaw = metaOgTitle.attr("content");
        } else {
            Element titleEl = document.selectFirst("title");
            if (titleEl != null) {
                positionTitleRaw = titleEl.text();
            }
        }

        String companyName = extractRegexGroup(html, "(?:\\\\?&quot;|\\\\?\")companyName(?:\\\\?&quot;|\\\\?\")\\s*:\\s*(?:\\\\?&quot;|\\\\?\")([^\"&\\\\]+?)(?:\\\\?&quot;|\\\\?\")");
        if (!AiJsonSupport.hasText(companyName) && positionTitleRaw != null) {
            companyName = extractRegexGroup(positionTitleRaw, "^\\[([^\\]]+)\\]");
        }
        if (!AiJsonSupport.hasText(companyName)) {
            companyName = extractRegexGroup(html, "pinTitle=([^&\"\\s]+)");
            if (AiJsonSupport.hasText(companyName)) {
                try {
                    companyName = java.net.URLDecoder.decode(companyName, StandardCharsets.UTF_8);
                } catch (Exception ignored) {
                }
            }
        }
        if (!AiJsonSupport.hasText(companyName)) {
            Element metaOgSite = document.selectFirst("meta[property=og:site_name]");
            if (metaOgSite != null) {
                companyName = metaOgSite.attr("content");
            }
        }
        if (!AiJsonSupport.hasText(companyName)) {
            Element coNameEl = document.selectFirst(".coName, .header .name, #company-section span");
            if (coNameEl != null) {
                companyName = coNameEl.text();
            }
        }

        String positionTitle = positionTitleRaw;
        if (positionTitle != null) {
            positionTitle =
                    positionTitle
                            .replace("| 잡코리아", "")
                            .replace("- 잡코리아", "")
                            .replace("잡코리아 - ", "")
                            .trim();
            if (companyName != null
                    && !companyName.isBlank()
                    && positionTitle.startsWith("[" + companyName + "]")) {
                positionTitle =
                        positionTitle.substring(("[" + companyName + "]").length()).trim();
            }
        }

        String deadlineText =
                extractRegexGroup(
                        html,
                        "(?:\\\\?&quot;|\\\\?\")endDate(?:\\\\?&quot;|\\\\?\")\\s*:\\s*(?:\\\\?&quot;|\\\\?\")([^\"&\\\\]+?)(?:\\\\?&quot;|\\\\?\")");
        if (!AiJsonSupport.hasText(deadlineText)) {
            deadlineText = extractRegexGroup(html, "마감일</span>.*?<span[^>]*>([^<]+)</span>");
        }
        LocalDate deadline = parseDate(deadlineText);

        String location =
                extractRegexGroup(
                        html,
                        "(?:\\\\?&quot;|\\\\?\")description(?:\\\\?&quot;|\\\\?\")\\s*:\\s*(?:\\\\?&quot;|\\\\?\")(서울[^\"&\\\\]+|경기[^\"&\\\\]+|인천[^\"&\\\\]+|부산[^\"&\\\\]+|대구[^\"&\\\\]+|광주[^\"&\\\\]+|대전[^\"&\\\\]+|울산[^\"&\\\\]+|세종[^\"&\\\\]+|강원[^\"&\\\\]+|충북[^\"&\\\\]+|충남[^\"&\\\\]+|전북[^\"&\\\\]+|전남[^\"&\\\\]+|경북[^\"&\\\\]+|경남[^\"&\\\\]+|제주[^\"&\\\\]+)(?:\\\\?&quot;|\\\\?\")");
        if (!AiJsonSupport.hasText(location)) {
            Element locEl = document.selectFirst(".emoji--basicemoji-place ~ span, .place");
            if (locEl != null) {
                location = locEl.text();
            }
        }

        // 잡코리아 상 상세 iframe (GI_Read_Frame) 정적 fetch를 통한 상세 본문 보강
        String giNo = extractRegexGroup(postingUrl, "(?:GI_Read/|GI_No=)(\\d+)");
        String frameContent = null;
        if (AiJsonSupport.hasText(giNo)) {
            try {
                Document frameDoc =
                        fetchDocument(
                                URI.create(
                                        "https://www.jobkorea.co.kr/Recruit/GI_Read/GI_Read_Frame?GI_No="
                                                + giNo));
                frameContent = frameDoc.text();
            } catch (Exception e) {
                log.debug("잡코리아 frame fetch 실패 giNo={}", giNo);
            }
        }

        if (!AiJsonSupport.hasText(companyName) || !AiJsonSupport.hasText(positionTitle)) {
            return Optional.empty();
        }

        return Optional.of(
                new JobApplicationUrlParseResponse(
                        AiJsonSupport.blankToNull(
                                AiJsonSupport.limit(companyName, MAX_COMPANY_NAME_LENGTH)),
                        AiJsonSupport.blankToNull(
                                AiJsonSupport.limit(positionTitle, MAX_POSITION_TITLE_LENGTH)),
                        "잡코리아",
                        deadline,
                        deadline == null && (html.contains("상시채용") || html.contains("채용시 마감")),
                        null,
                        AiJsonSupport.blankToNull(location),
                        null,
                        AiJsonSupport.blankToNull(frameContent),
                        null,
                        null,
                        null,
                        null,
                        null,
                        postingUrl));
    }

    private static String extractRegexGroup(String text, String regex) {
        if (text == null) return null;
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(regex);
        java.util.regex.Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    private record GreetingHrSections(
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String hiringProcess,
            String applicationMethod,
            String compensationDetail) {}

    // 공고 본문과 무관한 영역(내비게이션/푸터/광고/'다른 추천 공고' 위젯 등)이 같은 페이지에
    // 섞여 있으면 AI에 넘기는 텍스트가 불필요하게 길어지고, 출력에도 엉뚱한 내용이 섞이거나
    // 토큰 한도를 더 빨리 소진하는 원인이 된다. 실제 공고 텍스트를 건드리지 않도록 원본
    // document는 그대로 두고 복제본에서만 이런 영역을 제거한다.
    private static final String NOISE_SELECTOR =
            "script, style, noscript, iframe, nav, header, footer, aside, form, "
                    + "[class*=gnb], [class*=lnb], [class*=snb], [class*=header], [class*=footer], "
                    + "[class*=nav], [class*=banner], [class*=ad-], [class*=recommend], "
                    + "[class*=similar], [id*=ad-]";

    String extractPageText(URI uri, Document document) {
        if (!isGreetingHr(uri)) {
            Document cleaned = document.clone();
            cleaned.select(NOISE_SELECTOR).remove();
            return AiJsonSupport.limit(cleaned.text(), MAX_PAGE_TEXT_LENGTH);
        }

        List<String> sections = new ArrayList<>();
        addLabeled(sections, "회사명", document.select("meta[property=og:site_name]").attr("content"));
        addLabeled(sections, "직무명", document.select("meta[property=og:title]").attr("content"));
        document.select("[data-testid=공고_상세_정보], .ql-editor").stream()
                .map(element -> element.text().trim())
                .filter(AiJsonSupport::hasText)
                .forEach(text -> addDistinct(sections, text));

        String focusedText = String.join("\n", sections);
        return AiJsonSupport.limit(
                AiJsonSupport.hasText(focusedText) ? focusedText : document.text(),
                MAX_PAGE_TEXT_LENGTH);
    }

    private static void addLabeled(List<String> sections, String label, String value) {
        if (AiJsonSupport.hasText(value)) {
            addDistinct(sections, label + ": " + value.trim());
        }
    }

    private static void addDistinct(List<String> sections, String value) {
        if (AiJsonSupport.hasText(value) && !sections.contains(value.trim())) {
            sections.add(value.trim());
        }
    }

    private static boolean isGreetingHr(URI uri) {
        String host = uri.getHost();
        return host != null && host.toLowerCase(Locale.ROOT).endsWith("greetinghr.com");
    }

    private static long elapsedMillis(long startedAt) {
        return java.util.concurrent.TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
    }

    boolean looksLikeMissingDetailSection(String pageText) {
        return DETAIL_SECTION_MARKERS.stream().noneMatch(pageText::contains);
    }

    private boolean looksIncomplete(ExtractedFields fields) {
        long filledDetailCount =
                Stream.of(
                                fields.jobDescription(),
                                fields.requiredQualifications(),
                                fields.preferredQualifications(),
                                fields.hiringProcess(),
                                fields.applicationMethod(),
                                fields.compensationDetail())
                        .filter(AiJsonSupport::hasText)
                        .count();
        return !AiJsonSupport.hasText(fields.positionTitle())
                || filledDetailCount < MIN_FILLED_DETAIL_FIELDS;
    }

    private ExtractedFields enrichFromBannerImage(ExtractedFields base, Document document) {
        return findBannerImage(document)
                .map(image -> merge(base, visionExtractOrEmpty(image)))
                .orElse(base);
    }

    private ExtractedFields visionExtractOrEmpty(ImageCandidate image) {
        try {
            List<NvidiaNimClient.ImagePart> parts = sliceForVision(image.bytes(), image.mimeType());
            String userPrompt =
                    parts.size() > 1
                            ? "채용 공고 배너를 위에서 아래로 "
                                    + parts.size()
                                    + "장으로 나눈 이미지입니다. 전체를 하나로 이어서 읽고 정보를 추출하세요."
                            : "채용 공고 이미지에서 정보를 추출하세요.";
            String raw =
                    nvidiaNimClient.generateWithImages(
                            VISION_PARSE_PROMPT,
                            userPrompt,
                            visionModel,
                            parts,
                            VISION_MAX_OUTPUT_TOKENS,
                            VISION_AI_TIMEOUT);
            return AiJsonSupport.parseJson(objectMapper, raw, ExtractedFields.class, "채용공고 이미지 분석");
        } catch (Exception exception) {
            log.warn("채용공고 배너 이미지 분석 실패", exception);
            return EMPTY_EXTRACTED_FIELDS;
        }
    }

    /**
     * 세로로 매우 긴 배너는 비전 모델에 한 장으로 넘기면 내부적으로 축소되며 작은 글씨를 오독하기 쉬워, {@link #TILE_THRESHOLD_PX}를 넘으면 겹치는
     * 여러 조각으로 잘라 반환한다. 디코딩에 실패하거나 임계값 이하면 원본 이미지 그대로 1장짜리 리스트를 반환한다.
     */
    List<NvidiaNimClient.ImagePart> sliceForVision(byte[] bytes, String mimeType) {
        BufferedImage source;
        try {
            source = ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (IOException exception) {
            source = null;
        }
        if (source == null || source.getHeight() <= TILE_THRESHOLD_PX) {
            return List.of(new NvidiaNimClient.ImagePart(bytes, mimeType));
        }

        int width = source.getWidth();
        int height = source.getHeight();
        List<NvidiaNimClient.ImagePart> tiles = new ArrayList<>();
        int y = 0;
        while (y < height) {
            int tileHeight = Math.min(TILE_MAX_HEIGHT_PX, height - y);
            byte[] tileBytes = encodePng(source.getSubimage(0, y, width, tileHeight));
            if (tileBytes != null) {
                tiles.add(new NvidiaNimClient.ImagePart(tileBytes, "image/png"));
            }
            if (y + tileHeight >= height) break;
            y += TILE_MAX_HEIGHT_PX - TILE_OVERLAP_PX;
        }
        return tiles.isEmpty() ? List.of(new NvidiaNimClient.ImagePart(bytes, mimeType)) : tiles;
    }

    private static byte[] encodePng(BufferedImage image) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException exception) {
            return null;
        }
    }

    private static ExtractedFields merge(ExtractedFields base, ExtractedFields fromImage) {
        return new ExtractedFields(
                pick(base.companyName(), fromImage.companyName()),
                pick(base.positionTitle(), fromImage.positionTitle()),
                pick(base.source(), fromImage.source()),
                pick(base.deadline(), fromImage.deadline()),
                base.alwaysOpen() != null ? base.alwaysOpen() : fromImage.alwaysOpen(),
                pick(base.salaryNote(), fromImage.salaryNote()),
                pick(base.location(), fromImage.location()),
                pick(base.employmentType(), fromImage.employmentType()),
                pick(base.jobDescription(), fromImage.jobDescription()),
                pick(base.requiredQualifications(), fromImage.requiredQualifications()),
                pick(base.preferredQualifications(), fromImage.preferredQualifications()),
                pick(base.hiringProcess(), fromImage.hiringProcess()),
                pick(base.applicationMethod(), fromImage.applicationMethod()),
                pick(base.compensationDetail(), fromImage.compensationDetail()));
    }

    private static String pick(String primary, String fallback) {
        return AiJsonSupport.hasText(primary) ? primary : fallback;
    }

    private URI validateUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL을 입력해주세요.");
        }
        // \p{Cf}는 유니코드 "서식(Format)" 카테고리로 zero-width space/joiner, BOM, 방향 표시자 등
        // 눈에 안 보이는 문자를 폭넓게 잡아낸다. 일부 채용 사이트는 스크래핑 방지 목적으로 URL
        // 중간에 이런 문자를 끼워 넣는다.
        String cleaned = url.replaceAll("[\\p{Cf}\\u00A0]", "").replace("&amp;", "&").trim();
        if (!cleaned.contains("://")) {
            cleaned = "https://" + cleaned;
        }
        URI uri;
        try {
            uri = new URI(cleaned);
        } catch (URISyntaxException exception) {
            try {
                // new URI(String)이 실패하는 전형적인 원인은 쿼리스트링 등에 인코딩되지 않은 문자가
                // 섞여 있는 경우다. UriComponentsBuilder로 느슨하게 파싱한 뒤 encode()로 문제
                // 문자만 퍼센트 인코딩해 재시도한다.
                uri =
                        org.springframework.web.util.UriComponentsBuilder.fromUriString(cleaned)
                                .build(false)
                                .encode()
                                .toUri();
            } catch (Exception ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바르지 않은 URL입니다.");
            }
        }
        String scheme = uri.getScheme();
        if (scheme == null
                || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "http(s) URL만 지원합니다.");
        }
        return uri;
    }

    /**
     * 사람인 공고를 목록에서 열람할 때 쓰는 relay/view URL(예: zf_user/jobs/relay/view?rec_idx=123)은 상세요강을 정적 HTML에
     * 내려주지 않고 페이지 로드 후 별도 AJAX 호출로 채운다. 같은 공고의 정식 상세 페이지 URL(zf_user/jobs/view?rec_idx=123)은 로그인
     * 없이도 상세요강이 정적 HTML에 그대로 포함되어 있으므로, relay/view는 rec_idx만 뽑아 정식 URL로 바꿔 가져온다.
     */
    private URI normalizeSaraminRelayUrl(URI uri) {
        String host = uri.getHost();
        if (host == null
                || !host.toLowerCase(Locale.ROOT).endsWith("saramin.co.kr")
                || uri.getPath() == null
                || !uri.getPath().contains("/relay/view")) {
            return uri;
        }
        String recIdx = queryParam(uri, "rec_idx");
        if (recIdx == null || recIdx.isBlank()) {
            return uri;
        }
        return URI.create("https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=" + encode(recIdx));
    }

    private static String queryParam(URI uri, String name) {
        String query = uri.getQuery();
        if (query == null) return null;
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            String key = eq >= 0 ? pair.substring(0, eq) : pair;
            if (name.equals(key)) {
                return eq >= 0 ? pair.substring(eq + 1) : "";
            }
        }
        return null;
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private Document fetchDocument(URI uri) {
        try {
            return Jsoup.connect(uri.toString())
                    .userAgent(USER_AGENT)
                    .timeout(FETCH_TIMEOUT_MILLIS)
                    .maxBodySize(MAX_RAW_BODY_SIZE)
                    .get();
        } catch (HttpStatusException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "채용공고 페이지를 불러오지 못했습니다 (HTTP " + exception.getStatusCode() + ").");
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "채용공고 페이지에 접속하지 못했습니다.", exception);
        }
    }

    /**
     * 정적 HTML에서 의미 있는 텍스트를 거의 얻지 못했을 때(전형적으로 Angular/React/Vue 등으로 클라이언트에서만 렌더링되는 SPA) 헤드리스
     * Chromium으로 페이지를 실제로 열어 JS 실행이 끝난 뒤의 DOM을 가져온다. 브라우저 실행 자체가 실패하거나(설치 안 됨 등) 타임아웃이 나면 빈 값을 반환해
     * 호출부가 기존 정적 문서로 계속 진행하도록 한다.
     */
    private Optional<Document> renderWithHeadlessBrowser(URI uri) {
        try (Playwright playwright = Playwright.create();
                Browser browser =
                        playwright
                                .chromium()
                                .launch(new BrowserType.LaunchOptions().setHeadless(true))) {
            try (Page page =
                    browser.newPage(new Browser.NewPageOptions().setUserAgent(USER_AGENT))) {
                try {
                    page.navigate(
                            uri.toString(),
                            new Page.NavigateOptions()
                                    .setTimeout(HEADLESS_NAVIGATE_TIMEOUT_MILLIS)
                                    .setWaitUntil(WaitUntilState.NETWORKIDLE));
                } catch (PlaywrightException timeoutLikeException) {
                    // 채팅 위젯·광고·polling 등 백그라운드 네트워크가 계속 있는 페이지는
                    // networkidle이 영영 오지 않아 타임아웃이 난다. 그래도 페이지 자체는 이미
                    // load 이벤트까지 끝나 있는 경우가 대부분이라, 지금까지 렌더링된 DOM을 그대로
                    // 쓴다 — 여기서 예외를 던지면 애써 로딩된 콘텐츠를 버리고 빈 문서로 되돌아간다.
                    log.debug("헤드리스 렌더링 networkidle 대기 타임아웃, 현재 DOM으로 계속 진행: {}", uri);
                }
                Document document = Jsoup.parse(readContentTolerant(page), uri.toString());
                prependIframeText(page, document);
                return Optional.of(document);
            }
        } catch (Exception exception) {
            log.warn("헤드리스 브라우저 렌더링 실패: {}", uri, exception);
            return Optional.empty();
        }
    }

    /**
     * 일부 채용 사이트(잡코리아 등)는 상세요강 본문을 메인 문서가 아니라 별도 iframe 문서로 렌더링한다. page.content()에는 iframe 태그의 src만
     * 남고 내부 내용은 포함되지 않으므로, 하위 프레임 각각의 본문 텍스트를 모아 메인 문서 맨 앞에 이어 붙인다 — 뒤에 붙이면 내비게이션·추천공고 등 다른 텍스트가 먼저
     * 채워진 뒤 {@link #MAX_PAGE_TEXT_LENGTH} 자르기에서 정작 중요한 내용이 잘릴 수 있어, 이 보강 텍스트를 최우선으로 둔다.
     */
    private void prependIframeText(Page page, Document document) {
        for (Frame frame : page.frames()) {
            if (frame.equals(page.mainFrame())) continue;
            try {
                String frameText = Jsoup.parse(frame.content()).text();
                if (AiJsonSupport.hasText(frameText)) {
                    document.body().prependElement("div").text(frameText);
                }
            } catch (PlaywrightException ignored) {
                // 프레임 콘텐츠를 가져오지 못하면(로딩 실패, 이미 닫힌 프레임 등) 건너뛰고 계속 진행한다
            }
        }
    }

    /**
     * networkidle 대기가 타임아웃된 직후에는 페이지가 여전히 내부적으로 리다이렉트/전환 중이라 content() 호출 자체가 "page is navigating
     * and changing the content" 오류로 실패할 수 있다. 짧게 한 번 더 기다렸다가 재시도한다.
     */
    private String readContentTolerant(Page page) {
        try {
            return page.content();
        } catch (PlaywrightException exception) {
            page.waitForTimeout(1000);
            return page.content();
        }
    }

    private Optional<ImageCandidate> findBannerImage(Document document) {
        List<String> candidates =
                document.select("img[src]").stream()
                        .map(img -> img.absUrl("src"))
                        .filter(AiJsonSupport::hasText)
                        .filter(src -> !src.startsWith("data:"))
                        .filter(
                                src ->
                                        IMAGE_EXCLUDE_KEYWORDS.stream()
                                                .noneMatch(src.toLowerCase(Locale.ROOT)::contains))
                        .distinct()
                        .limit(MAX_IMAGE_CANDIDATES)
                        .toList();

        if (candidates.isEmpty()) {
            return Optional.empty();
        }

        List<java.util.concurrent.CompletableFuture<ImageCandidate>> futures =
                candidates.stream()
                        .map(
                                src ->
                                        java.util.concurrent.CompletableFuture.supplyAsync(
                                                () -> {
                                                    try {
                                                        byte[] bytes = downloadImage(src);
                                                        if (bytes.length >= MIN_BANNER_IMAGE_BYTES
                                                                && bytes.length
                                                                        <= MAX_BANNER_IMAGE_BYTES) {
                                                            return new ImageCandidate(
                                                                    bytes, guessMimeType(src));
                                                        }
                                                    } catch (Exception ignored) {
                                                    }
                                                    return null;
                                                }))
                        .toList();

        java.util.concurrent.CompletableFuture.allOf(
                        futures.toArray(new java.util.concurrent.CompletableFuture[0]))
                .join();

        ImageCandidate best = null;
        for (java.util.concurrent.CompletableFuture<ImageCandidate> future : futures) {
            ImageCandidate candidate = future.join();
            if (candidate != null) {
                if (best == null || candidate.bytes().length > best.bytes().length) {
                    best = candidate;
                }
            }
        }
        return Optional.ofNullable(best);
    }

    private byte[] downloadImage(String url) throws IOException {
        Connection.Response response =
                Jsoup.connect(url)
                        .userAgent(USER_AGENT)
                        .timeout(FETCH_TIMEOUT_MILLIS)
                        .maxBodySize(MAX_BANNER_IMAGE_BYTES)
                        .ignoreContentType(true)
                        .execute();
        return response.bodyAsBytes();
    }

    private static String guessMimeType(String url) {
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
    }

    private record ImageCandidate(byte[] bytes, String mimeType) {}

    LocalDate parseDate(String value) {
        if (!AiJsonSupport.hasText(value)) return null;
        String trimmed = value.trim();
        for (DateTimeFormatter formatter : DEADLINE_FORMATTERS) {
            try {
                return LocalDate.from(formatter.parse(trimmed));
            } catch (Exception ignored) {
            }
        }
        if (trimmed.contains("T")) {
            trimmed = trimmed.substring(0, trimmed.indexOf("T")).trim();
        } else if (trimmed.contains(" ")) {
            trimmed = trimmed.split("\\s+")[0].trim();
        }
        for (DateTimeFormatter formatter : DEADLINE_FORMATTERS) {
            try {
                return LocalDate.from(formatter.parse(trimmed));
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private record ExtractedFields(
            @JsonDeserialize(using = LenientStringDeserializer.class) String companyName,
            @JsonDeserialize(using = LenientStringDeserializer.class) String positionTitle,
            @JsonDeserialize(using = LenientStringDeserializer.class) String source,
            @JsonDeserialize(using = LenientStringDeserializer.class) String deadline,
            Boolean alwaysOpen,
            @JsonDeserialize(using = LenientStringDeserializer.class) String salaryNote,
            @JsonDeserialize(using = LenientStringDeserializer.class) String location,
            @JsonDeserialize(using = LenientStringDeserializer.class) String employmentType,
            @JsonDeserialize(using = LenientStringDeserializer.class) String jobDescription,
            @JsonDeserialize(using = LenientStringDeserializer.class) String requiredQualifications,
            @JsonDeserialize(using = LenientStringDeserializer.class)
                    String preferredQualifications,
            @JsonDeserialize(using = LenientStringDeserializer.class) String hiringProcess,
            @JsonDeserialize(using = LenientStringDeserializer.class) String applicationMethod,
            @JsonDeserialize(using = LenientStringDeserializer.class) String compensationDetail) {}

    /** 비전 모델이 목록형 항목(우대사항 등)을 문자열 대신 JSON 배열로 반환하는 경우가 있어, 배열이면 줄바꿈으로 합쳐 문자열로 취급한다. */
    private static final class LenientStringDeserializer extends JsonDeserializer<String> {
        @Override
        public String deserialize(JsonParser parser, DeserializationContext context)
                throws IOException {
            JsonNode node = parser.getCodec().readTree(parser);
            if (node.isArray()) {
                List<String> items = new ArrayList<>();
                node.forEach(
                        item -> {
                            String text = item.asText(null);
                            if (AiJsonSupport.hasText(text)) items.add(text.trim());
                        });
                return items.isEmpty() ? null : String.join("\n", items);
            }
            return node.isNull() || node.isMissingNode() ? null : node.asText(null);
        }
    }
}
