package com.selfintro.jobposting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import javax.imageio.ImageIO;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class JobApplicationUrlParseServiceTest {

    private final NvidiaNimClient nimClient = mock(NvidiaNimClient.class);
    private final JobApplicationUrlParseService service =
            new JobApplicationUrlParseService(
                    nimClient, new ObjectMapper(), "nvidia/nemotron-nano-12b-v2-vl");

    @Test
    void acceptsSaraminRelayUrl() {
        when(nimClient.generateJsonOnce(anyString(), anyString(), anyInt(), any(Duration.class)))
                .thenReturn("{\"companyName\":\"테스트\",\"positionTitle\":\"개발자\"}");

        assertThatCode(
                        () ->
                                service.parse(
                                        "https://www.saramin.co.kr/zf_user/jobs/relay/view?view_type=list&rec_idx=54581696#seq=0"))
                .doesNotThrowAnyException();
    }

    @Test
    void parsesJobkoreaRscDocumentWithoutAiCall() {
        Document document =
                Jsoup.parse(
                        """
                        <html><head>
                          <meta property="og:title" content="[랜드소프트㈜] 백엔드 개발자 채용">
                        </head><body>
                          <script>self.__next_f.push([1,"\\"companyName\\":\\"랜드소프트㈜\\",\\"endDate\\":\\"2026-08-16T23:59:59+09:00\\",\\"description\\":\\"서울 마포구 양화로10길 19\\"])
                          </script>
                        </body></html>
                        """,
                        "https://www.jobkorea.co.kr/Recruit/GI_Read/49686372");

        JobApplicationUrlParseResponse response =
                service.parseJobkoreaDocument(
                                URI.create("https://www.jobkorea.co.kr/Recruit/GI_Read/49686372"),
                                document,
                                "https://www.jobkorea.co.kr/Recruit/GI_Read/49686372")
                        .orElseThrow();

        assertThat(response.companyName()).isEqualTo("랜드소프트㈜");
        assertThat(response.positionTitle()).isEqualTo("백엔드 개발자 채용");
        assertThat(response.deadline()).isEqualTo(LocalDate.of(2026, 8, 16));
        assertThat(response.location()).isEqualTo("서울 마포구 양화로10길 19");
        assertThat(response.source()).isEqualTo("잡코리아");
    }

    @Test
    void parsesIsoDeadline() {
        assertThat(service.parseDate("2026-08-02")).isEqualTo(LocalDate.of(2026, 8, 2));
    }

    @Test
    void parsesDotSeparatedDeadline() {
        assertThat(service.parseDate("2026.08.02")).isEqualTo(LocalDate.of(2026, 8, 2));
    }

    @Test
    void parsesSlashSeparatedDeadline() {
        assertThat(service.parseDate("2026/08/02")).isEqualTo(LocalDate.of(2026, 8, 2));
    }

    @Test
    void returnsNullForUnparsableDeadline() {
        assertThat(service.parseDate("상시채용")).isNull();
    }

    @Test
    void returnsNullForBlankDeadline() {
        assertThat(service.parseDate("  ")).isNull();
    }

    @Test
    void looksLikeMissingDetailSectionWhenNoDetailMarkerPresent() {
        assertThat(service.looksLikeMissingDetailSection("회사 소개\n지원자격\n경력 신입·경력\n학력 대졸이상\n스킬 LLM"))
                .isTrue();
    }

    @Test
    void looksLikeMissingDetailSectionFalseWhenDetailMarkerPresent() {
        assertThat(service.looksLikeMissingDetailSection("포지션 및 자격요건\n수행업무\n담당 업무 내용\n우대사항\n관련 경험"))
                .isFalse();
    }

    @Test
    void greetingHrUsesFocusedStructuredTextWithoutDuplicateDesktopBody() {
        Document document =
                Jsoup.parse(
                        """
                        <html><head>
                          <meta property="og:site_name" content="넥스트그라운드">
                          <meta property="og:title" content="백엔드 개발자 (전환형 인턴)">
                        </head><body>
                          <nav>전체 공고 메뉴 추천 공고 불필요한 텍스트</nav>
                          <div data-testid="공고_상세_정보">고용형태 인턴 근무지 서울 강남구</div>
                          <div class="ql-editor">담당업무 Spring 백엔드 개발 지원자격 Java</div>
                          <div class="ql-editor">담당업무 Spring 백엔드 개발 지원자격 Java</div>
                        </body></html>
                        """,
                        "https://nextground.career.greetinghr.com/ko/o/101668");

        String text =
                service.extractPageText(
                        URI.create("https://nextground.career.greetinghr.com/ko/o/101668"),
                        document);

        assertThat(text).contains("회사명: 넥스트그라운드");
        assertThat(text).contains("직무명: 백엔드 개발자 (전환형 인턴)");
        assertThat(text).contains("고용형태 인턴 근무지 서울 강남구");
        assertThat(text).doesNotContain("전체 공고 메뉴");
        assertThat(text.split("담당업무", -1)).hasSize(2);
    }

    @Test
    void greetingHrStructuredHtmlIsParsedWithoutAiCall() {
        Document document =
                Jsoup.parse(
                        """
                        <html><head>
                          <meta property="og:site_name" content="넥스트그라운드">
                          <meta property="og:title" content="백엔드 개발자 (전환형 인턴)">
                        </head><body>
                          <div data-testid="공고_요약_컴포넌트">
                            <span data-testid="공고_요약_컴포넌트_제목">고용형태</span>
                            <span data-testid="공고_요약_컴포넌트_내용">인턴</span>
                          </div>
                          <div data-testid="공고_요약_컴포넌트">
                            <span data-testid="공고_요약_컴포넌트_제목">근무지</span>
                            <span data-testid="공고_요약_컴포넌트_내용">서울특별시 강남구</span>
                          </div>
                          <div class="ql-editor">
                            <h3>주요 업무</h3><ul><li>Spring 백엔드 개발</li></ul>
                            <h3>자격 요건</h3><ul><li>Java 개발 경험</li></ul>
                            <h3>우대 사항</h3><ul><li>서비스 운영 경험</li></ul>
                            <h3>지금 바로 지원하세요!</h3>
                            <ul><li>제출 서류: 이력서</li><li>채용 과정: 서류 → 인터뷰</li></ul>
                          </div>
                        </body></html>
                        """,
                        "https://nextground.career.greetinghr.com/ko/o/101668");

        JobApplicationUrlParseResponse response =
                service.parseGreetingHrDocument(
                                URI.create("https://nextground.career.greetinghr.com/ko/o/101668"),
                                document,
                                "https://nextground.career.greetinghr.com/ko/o/101668")
                        .orElseThrow();

        assertThat(response.companyName()).isEqualTo("넥스트그라운드");
        assertThat(response.positionTitle()).isEqualTo("백엔드 개발자 (전환형 인턴)");
        assertThat(response.source()).isEqualTo("그리팅");
        assertThat(response.location()).isEqualTo("서울특별시 강남구");
        assertThat(response.employmentType()).isEqualTo("인턴");
        assertThat(response.jobDescription()).contains("Spring 백엔드 개발");
        assertThat(response.requiredQualifications()).contains("Java 개발 경험");
        assertThat(response.preferredQualifications()).contains("서비스 운영 경험");
        assertThat(response.applicationMethod()).contains("제출 서류: 이력서");
        assertThat(response.hiringProcess()).contains("채용 과정: 서류 → 인터뷰");
        verify(nimClient, never())
                .generateOnce(anyString(), anyString(), anyInt(), any(Duration.class));
    }

    @Test
    void rejectsNonHttpScheme() {
        assertThatThrownBy(() -> service.parse("ftp://example.com/posting"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(
                        exception ->
                                assertThat(((ResponseStatusException) exception).getStatusCode())
                                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void rejectsMalformedUrl() {
        assertThatThrownBy(() -> service.parse("not a url"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(
                        exception ->
                                assertThat(((ResponseStatusException) exception).getStatusCode())
                                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void doesNotSliceShortImage() {
        byte[] image = pngOf(200, 500);

        List<NvidiaNimClient.ImagePart> parts = service.sliceForVision(image, "image/png");

        assertThat(parts).hasSize(1);
        assertThat(parts.getFirst().bytes()).isEqualTo(image);
        assertThat(parts.getFirst().mimeType()).isEqualTo("image/png");
    }

    @Test
    void slicesTallImageIntoOverlappingTiles() {
        byte[] image = pngOf(100, 5000);

        List<NvidiaNimClient.ImagePart> parts = service.sliceForVision(image, "image/png");

        assertThat(parts).hasSize(4);
        for (NvidiaNimClient.ImagePart part : parts) {
            assertThat(part.mimeType()).isEqualTo("image/png");
            BufferedImage tile = decode(part.bytes());
            assertThat(tile.getWidth()).isEqualTo(100);
            assertThat(tile.getHeight()).isLessThanOrEqualTo(1600);
        }
    }

    @Test
    void fallsBackToOriginalBytesWhenNotDecodableAsImage() {
        byte[] notAnImage = "not an image".getBytes();

        List<NvidiaNimClient.ImagePart> parts = service.sliceForVision(notAnImage, "image/png");

        assertThat(parts).hasSize(1);
        assertThat(parts.getFirst().bytes()).isEqualTo(notAnImage);
    }

    private static byte[] pngOf(int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException exception) {
            throw new RuntimeException(exception);
        }
    }

    private static BufferedImage decode(byte[] bytes) {
        try {
            return ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (IOException exception) {
            throw new RuntimeException(exception);
        }
    }
}
