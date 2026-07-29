package com.selfintro.modules.jobapplication.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.NvidiaNimClient;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import javax.imageio.ImageIO;
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
        when(nimClient.generate(anyString(), anyString()))
                .thenReturn("{\"companyName\":\"테스트\",\"positionTitle\":\"개발자\"}");

        assertThatCode(
                        () ->
                                service.parse(
                                        "https://www.saramin.co.kr/zf_user/jobs/relay/view?view_type=list&rec_idx=54581696#seq=0"))
                .doesNotThrowAnyException();
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
