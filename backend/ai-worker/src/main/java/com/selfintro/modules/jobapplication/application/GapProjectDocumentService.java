package com.selfintro.modules.jobapplication.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.selfintro.global.ai.CareerProfileDigestBuilder;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.jobapplication.domain.entity.GapProjectDocument;
import com.selfintro.modules.jobapplication.domain.repository.GapProjectDocumentRepository;
import com.selfintro.modules.jobapplication.presentation.dto.GapProjectDocumentResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class GapProjectDocumentService {

    private static final String SYSTEM_PROMPT =
            """
            당신은 개발자 포트폴리오 프로젝트를 설계하는 시니어 테크 리드다. 채용 공고의 요구사항,
            기존 AI 어필 분석, 실제 경력/프로젝트 데이터를 대조해 후보자에게 부족한 경험을 실제로
            쌓을 수 있는 프로젝트 2~3개를 제안한다. 반드시 JSON 객체 하나만 반환한다.

            원칙:
            - 이미 충분히 보유한 경험을 새 프로젝트로 반복하지 않는다.
            - 공고 원문 또는 분석에 근거가 없는 부족 경험을 만들지 않는다.
            - 프로젝트는 단순 CRUD가 아니라 부족 경험을 검증 가능한 산출물로 바꾸어야 한다.
            - 허위 경력이나 아직 달성하지 않은 성과를 이력서 문장처럼 단정하지 않는다.
            - 각 프로젝트는 개인이 2~6주 안에 MVP를 완성할 수 있어야 한다.
            - 성능 수치는 목표값으로만 쓰고, 측정 전 달성했다고 표현하지 않는다.

            응답 스키마:
            {
              "title":"문서 제목",
              "summary":"전체 추천 전략",
              "gaps":[{"id":"gap-1","requirement":"부족 요구사항","evidence":"부족하다고 판단한 근거","priority":"HIGH|MEDIUM|LOW"}],
              "projects":[{
                "name":"프로젝트명",
                "covers":["gap-1"],
                "objective":"해결할 문제와 학습 목표",
                "durationWeeks":4,
                "stack":["기술"],
                "mvpFeatures":["MVP 기능"],
                "milestones":["1주차 ..."],
                "verification":["테스트·부하·운영 검증 방법"],
                "portfolioEvidence":["README·다이어그램·측정 결과 등"],
                "resumeBullets":["완료 후 실제 측정값을 채워 넣을 문장 초안"],
                "stretchGoals":["선택 확장"],
                "risks":["범위·기술 위험"]
              }],
              "warnings":["확인이 필요한 가정"]
            }
            """;

    private final GapProjectDocumentRepository repository;
    private final JobPostingService jobPostingService;
    private final CareerProfileDigestBuilder careerProfileDigestBuilder;
    private final NvidiaNimClient nvidiaNimClient;
    private final ObjectMapper objectMapper;

    public List<GapProjectDocumentResponse> list(Long jobPostingId) {
        jobPostingService.get(jobPostingId);
        return repository.findAllByJobPostingIdOrderByVersionDesc(jobPostingId).stream()
                .map(GapProjectDocumentResponse::from)
                .toList();
    }

    public GapProjectDocumentResponse generate(Long jobPostingId) {
        JobPostingResponse posting = jobPostingService.get(jobPostingId);
        if (posting.appealAnalysis() == null || posting.appealAnalysis().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "먼저 AI 어필 포인트 분석을 실행해주세요.");
        }

        ObjectNode input = objectMapper.createObjectNode();
        input.set("jobPosting", objectMapper.valueToTree(posting));
        input.put("appealAnalysis", posting.appealAnalysis());
        input.put("candidateProfile", careerProfileDigestBuilder.build());

        String raw =
                nvidiaNimClient.generateJsonOnce(
                        SYSTEM_PROMPT, writeJson(input), 6144, Duration.ofSeconds(120));
        JsonNode content = parseJson(raw);
        JsonNode projects = content.path("projects");
        if (!projects.isArray() || projects.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI가 보완 프로젝트를 생성하지 못했습니다.");
        }

        int version = Math.toIntExact(repository.countByJobPostingId(jobPostingId) + 1);
        String title = text(content, "title", posting.companyName() + " 보완 프로젝트 추천");
        if (title.length() > 200) title = title.substring(0, 200);
        GapProjectDocument document =
                GapProjectDocument.create(
                        jobPostingId,
                        version,
                        title,
                        posting.appealAnalyzedAt(),
                        writeJson(content.path("gaps")),
                        writeJson(content),
                        renderMarkdown(content, version));
        return GapProjectDocumentResponse.from(repository.save(document));
    }

    private String renderMarkdown(JsonNode content, int version) {
        StringBuilder markdown = new StringBuilder();
        markdown.append("# ").append(text(content, "title", "보완 프로젝트 추천")).append("\n\n");
        markdown.append("> 버전 v").append(version).append(" · AI 초안\n\n");
        markdown.append(text(content, "summary", "부족 경험을 실제 산출물로 보완하기 위한 프로젝트 제안입니다."));
        markdown.append("\n\n## 보완할 경험\n\n");
        for (JsonNode gap : content.path("gaps")) {
            markdown.append("- **")
                    .append(text(gap, "requirement", "확인 필요"))
                    .append("** (`")
                    .append(text(gap, "priority", "MEDIUM"))
                    .append("`) — ")
                    .append(text(gap, "evidence", "분석 근거를 확인해주세요."))
                    .append('\n');
        }

        int index = 1;
        for (JsonNode project : content.path("projects")) {
            markdown.append("\n## ")
                    .append(index++)
                    .append(". ")
                    .append(text(project, "name", "추천 프로젝트"))
                    .append("\n\n");
            markdown.append("**목표:** ").append(text(project, "objective", "")).append("\n\n");
            markdown.append("**예상 기간:** ")
                    .append(project.path("durationWeeks").asInt(4))
                    .append("주\n\n");
            appendInline(markdown, "기술 스택", project.path("stack"));
            appendList(markdown, "MVP 범위", project.path("mvpFeatures"));
            appendList(markdown, "구현 단계", project.path("milestones"));
            appendList(markdown, "검증 방법", project.path("verification"));
            appendList(markdown, "포트폴리오 증거", project.path("portfolioEvidence"));
            appendList(markdown, "이력서 문장 초안", project.path("resumeBullets"));
            appendList(markdown, "선택 확장", project.path("stretchGoals"));
            appendList(markdown, "주의할 위험", project.path("risks"));
        }
        appendList(markdown, "확인할 점", content.path("warnings"));
        return markdown.toString().trim();
    }

    private void appendInline(StringBuilder markdown, String heading, JsonNode values) {
        if (!values.isArray() || values.isEmpty()) return;
        markdown.append("**").append(heading).append(":** ");
        boolean first = true;
        for (JsonNode value : values) {
            if (!first) markdown.append(", ");
            markdown.append(value.asText());
            first = false;
        }
        markdown.append("\n\n");
    }

    private void appendList(StringBuilder markdown, String heading, JsonNode values) {
        if (!values.isArray() || values.isEmpty()) return;
        markdown.append("### ").append(heading).append("\n\n");
        for (JsonNode value : values) markdown.append("- ").append(value.asText()).append('\n');
        markdown.append('\n');
    }

    private JsonNode parseJson(String raw) {
        String normalized =
                raw.trim().replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
        try {
            return objectMapper.readTree(normalized);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "AI 프로젝트 추천 응답을 해석하지 못했습니다.", exception);
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("프로젝트 추천 문서 직렬화에 실패했습니다.", exception);
        }
    }

    private String text(JsonNode node, String field, String fallback) {
        String value = node.path(field).asText("").trim();
        return value.isBlank() ? fallback : value;
    }
}
