package com.selfintro.modules.jobapplication.application;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.PlaywrightException;
import com.microsoft.playwright.options.WaitUntilState;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationUrlParseResponse;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Stream;
import javax.imageio.ImageIO;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Connection;
import org.jsoup.HttpStatusException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
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
            기간으로 표기되어 있으면 마지막 날짜(종료일)를 마감일로 사용하세요. 상시채용이거나 날짜를
            알 수 없으면 null로 반환하세요.
            jobDescription은 담당 업무/직무 상세 설명, requiredQualifications는 지원자격(필수 요건),
            preferredQualifications는 우대사항, hiringProcess는 전형절차(서류·면접 등 단계와 일정),
            applicationMethod는 지원방법(접수 방식, 제출 서류 등), compensationDetail은 급여를 제외한
            처우조건(근무지, 근무형태, 복리후생 등)입니다. 각 항목은 본문에 있는 내용만 줄바꿈으로 구분된
            목록 형태로 정리하고, 본문에 해당 내용이 없으면 null로 두세요.
            설명이나 마크다운 없이 반드시 아래 JSON 구조만 반환하세요.
            {"companyName":null,"positionTitle":null,"source":null,"deadline":null,"salaryNote":null,"jobDescription":null,"requiredQualifications":null,"preferredQualifications":null,"hiringProcess":null,"applicationMethod":null,"compensationDetail":null}
            """;

    private static final String VISION_PARSE_PROMPT =
            """
            당신은 채용 공고 이미지(포스터/배너)에서 사실만 추출하는 편집 보조입니다.
            이미지가 여러 장 주어지면 위에서 아래로 이어지는 하나의 긴 배너를 순서대로 잘라놓은
            조각들이니, 전체를 하나의 문서로 이어서 읽고 정보를 종합해 답하세요.
            이미지에 실제로 보이는 텍스트만 사실로 인정하고, 보이지 않는 내용은 만들어내지 마세요.
            알 수 없는 값은 null로 두세요.
            deadline은 지원 마감일을 YYYY-MM-DD 형식으로 반환하세요. "2026.7.20(월)~8.2(일)"처럼
            기간으로 표기되어 있으면 마지막 날짜(종료일)를 마감일로 사용하세요. 상시채용이거나 날짜를
            알 수 없으면 null로 반환하세요.
            채용 공고 이미지는 보통 "모집 부문/담당 업무", "지원 자격", "우대 사항", "전형절차 및 일정",
            "지원 방법", "처우"처럼 섹션 제목이 붙은 표나 구획으로 나뉘어 있습니다. 각 필드는 반드시 그
            섹션 제목 아래에 있는 내용만 담고, 다른 섹션의 내용을 섞어 넣지 마세요:
            jobDescription은 "모집 부문/담당 업무" 섹션, requiredQualifications는 "지원 자격"(필수 요건)
            섹션, preferredQualifications는 "우대 사항" 섹션(자격증·수상 경력 등이 있으면 반드시 이 필드에),
            hiringProcess는 "전형절차/전형 일정" 섹션(단계 이름과 순서), applicationMethod는 "지원 방법/접수"
            섹션, compensationDetail은 "처우/근무조건"(급여 제외, 정규직 전환 시 연봉 수준·복리후생 등)
            섹션입니다. 각 항목은 이미지에 있는 내용만 줄바꿈으로 구분된 목록 형태로 정리하고, 이미지에
            해당 섹션이 없으면 null로 두세요.
            설명이나 마크다운 없이 반드시 아래 JSON 구조만 반환하세요.
            {"companyName":null,"positionTitle":null,"source":null,"deadline":null,"salaryNote":null,"jobDescription":null,"requiredQualifications":null,"preferredQualifications":null,"hiringProcess":null,"applicationMethod":null,"compensationDetail":null}
            """;

    private static final int MAX_PAGE_TEXT_LENGTH = 12000;
    private static final int MAX_RAW_BODY_SIZE = 2_000_000;
    private static final int FETCH_TIMEOUT_MILLIS = 8000;
    private static final List<DateTimeFormatter> DEADLINE_FORMATTERS =
            List.of(
                    DateTimeFormatter.ISO_LOCAL_DATE,
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
    private static final long STREAM_TIMEOUT_MILLIS = 300_000L;
    private static final double HEADLESS_NAVIGATE_TIMEOUT_MILLIS = 20_000;
    private static final ExtractedFields EMPTY_EXTRACTED_FIELDS =
            new ExtractedFields(null, null, null, null, null, null, null, null, null, null, null);

    private final NvidiaNimClient nvidiaNimClient;
    private final ObjectMapper objectMapper;
    private final String visionModel;
    private final AtomicBoolean parsing = new AtomicBoolean(false);

    public JobApplicationUrlParseService(
            NvidiaNimClient nvidiaNimClient,
            ObjectMapper objectMapper,
            @Value("${app.ai.vision-model}") String visionModel) {
        this.nvidiaNimClient = nvidiaNimClient;
        this.objectMapper = objectMapper;
        this.visionModel = visionModel;
    }

    public SseEmitter parseStream(String url) {
        if (!parsing.compareAndSet(false, true)) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS, "이미 채용공고 URL을 분석하고 있습니다.");
        }
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MILLIS);
        Thread.ofVirtual()
                .name("job-application-parse-stream")
                .start(() -> streamParse(url, emitter));
        return emitter;
    }

    private void streamParse(String url, SseEmitter emitter) {
        try {
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
            parsing.set(false);
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
        URI uri = validateUrl(url);
        Document document = fetchDocument(uri);
        if (document.text().trim().length() < MIN_MEANINGFUL_TEXT_LENGTH) {
            // 정적 HTML에 실제 내용이 거의 없으면 SPA(클라이언트 렌더링) 페이지일 가능성이 높다 —
            // 헤드리스 브라우저로 JS를 실행한 뒤의 DOM을 대신 사용한다. 렌더링에 실패하면 원래
            // 정적 문서를 그대로 써서 이후 흐름(이미지 배너 폴백 등)이 기존과 동일하게 동작하게 둔다.
            document = renderWithHeadlessBrowser(uri).orElse(document);
        }
        String pageText = AiJsonSupport.limit(document.text(), MAX_PAGE_TEXT_LENGTH);
        String userPrompt = "URL: " + url + "\n\n본문:\n" + pageText;

        try {
            // 텍스트가 아주 짧아도(예: "OO 채용사이트" 한 줄) 회사명 같은 확실한 신호가 있을 수 있어
            // 텍스트 모델은 항상 먼저 실행한다. merge()가 텍스트 값을 우선하므로, 비전 모델은 어디까지나
            // 텍스트가 못 채운 항목을 보충하는 역할만 한다 — 세로로 긴 배너 이미지는 축소되면서
            // 작은 글씨(로고 등)를 오독하기 쉬워, 텍스트로 이미 확인된 값을 이미지 결과로 덮어쓰지 않는다.
            String raw = nvidiaNimClient.generate(PARSE_PROMPT, userPrompt);
            ExtractedFields extracted =
                    AiJsonSupport.parseJson(
                            objectMapper, raw, ExtractedFields.class, "채용공고 URL 분석");
            if (looksIncomplete(extracted)
                    || pageText.trim().length() < MIN_MEANINGFUL_TEXT_LENGTH) {
                extracted = enrichFromBannerImage(extracted, document);
            }
            return new JobApplicationUrlParseResponse(
                    AiJsonSupport.blankToNull(extracted.companyName()),
                    AiJsonSupport.blankToNull(extracted.positionTitle()),
                    AiJsonSupport.blankToNull(extracted.source()),
                    parseDate(extracted.deadline()),
                    AiJsonSupport.blankToNull(extracted.salaryNote()),
                    AiJsonSupport.blankToNull(extracted.jobDescription()),
                    AiJsonSupport.blankToNull(extracted.requiredQualifications()),
                    AiJsonSupport.blankToNull(extracted.preferredQualifications()),
                    AiJsonSupport.blankToNull(extracted.hiringProcess()),
                    AiJsonSupport.blankToNull(extracted.applicationMethod()),
                    AiJsonSupport.blankToNull(extracted.compensationDetail()),
                    url);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "AI 응답을 처리하지 못했습니다. 다시 시도해주세요.", exception);
        }
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
                            VISION_PARSE_PROMPT, userPrompt, visionModel, parts);
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
                pick(base.salaryNote(), fromImage.salaryNote()),
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
        URI uri;
        try {
            uri = new URI(url.trim());
        } catch (URISyntaxException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바르지 않은 URL입니다.");
        }
        String scheme = uri.getScheme();
        if (scheme == null
                || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "http(s) URL만 지원합니다.");
        }
        return uri;
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
                return Optional.of(Jsoup.parse(readContentTolerant(page), uri.toString()));
            }
        } catch (Exception exception) {
            log.warn("헤드리스 브라우저 렌더링 실패: {}", uri, exception);
            return Optional.empty();
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

        ImageCandidate best = null;
        for (String src : candidates) {
            byte[] bytes;
            try {
                bytes = downloadImage(src);
            } catch (IOException exception) {
                continue;
            }
            if (bytes.length < MIN_BANNER_IMAGE_BYTES || bytes.length > MAX_BANNER_IMAGE_BYTES) {
                continue;
            }
            if (best == null || bytes.length > best.bytes().length) {
                best = new ImageCandidate(bytes, guessMimeType(src));
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
                return LocalDate.parse(trimmed, formatter);
            } catch (DateTimeParseException ignored) {
                // try the next known format
            }
        }
        return null;
    }

    private record ExtractedFields(
            @JsonDeserialize(using = LenientStringDeserializer.class) String companyName,
            @JsonDeserialize(using = LenientStringDeserializer.class) String positionTitle,
            @JsonDeserialize(using = LenientStringDeserializer.class) String source,
            @JsonDeserialize(using = LenientStringDeserializer.class) String deadline,
            @JsonDeserialize(using = LenientStringDeserializer.class) String salaryNote,
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
