package com.selfintro.modules.portfolio.application;

import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyContent;
import com.selfintro.modules.storage.application.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * {@link PortfolioCaseStudyContent}를 마크다운으로 조립한다. {@code
 * GapProjectDocumentService.renderMarkdown} 패턴 그대로 — 프론트 마크다운 렌더러(mermaid 코드펜스, 이미지 문법)가
 * 이미 처리하는 문법만 사용해 별도 렌더링 코드를 추가하지 않는다.
 */
@Component
@RequiredArgsConstructor
public class PortfolioCaseStudyMarkdownRenderer {

    private final StorageService storageService;

    public String render(String title, PortfolioCaseStudyContent content) {
        StringBuilder markdown = new StringBuilder();
        markdown.append("# ").append(title).append("\n\n");
        if (AiJsonSupport.hasText(content.summary())) {
            markdown.append("> ").append(content.summary()).append("\n\n");
        }

        appendSection(markdown, "문제 인식", content.problem());
        appendSection(markdown, "고민한 것", content.thoughtProcess());

        if (content.tradeoffs() != null && !content.tradeoffs().isEmpty()) {
            markdown.append("## 트레이드오프\n\n");
            for (PortfolioCaseStudyContent.Tradeoff tradeoff : content.tradeoffs()) {
                markdown.append("### ").append(tradeoff.option()).append("\n\n");
                if (AiJsonSupport.hasText(tradeoff.pros())) {
                    markdown.append("- 장점: ").append(tradeoff.pros()).append("\n");
                }
                if (AiJsonSupport.hasText(tradeoff.cons())) {
                    markdown.append("- 단점: ").append(tradeoff.cons()).append("\n");
                }
                if (AiJsonSupport.hasText(tradeoff.chosenBecause())) {
                    markdown.append("- 선택 이유: ").append(tradeoff.chosenBecause()).append("\n");
                }
                markdown.append('\n');
            }
        }

        appendSection(markdown, "해결", content.solution());

        if (content.outcome() != null) {
            markdown.append("## 성과\n\n");
            if (AiJsonSupport.hasText(content.outcome().summary())) {
                markdown.append(content.outcome().summary()).append("\n\n");
            }
            if (content.outcome().metrics() != null && !content.outcome().metrics().isEmpty()) {
                markdown.append("| 지표 | 이전 | 이후 |\n|---|---|---|\n");
                for (PortfolioCaseStudyContent.Outcome.Metric metric : content.outcome().metrics()) {
                    markdown
                            .append("| ")
                            .append(metric.label())
                            .append(" | ")
                            .append(nullToDash(metric.before()))
                            .append(" | ")
                            .append(nullToDash(metric.after()))
                            .append(" |\n");
                }
                markdown.append('\n');
            }
        }

        if (content.architecture() != null) {
            boolean hasMermaid = AiJsonSupport.hasText(content.architecture().mermaidSource());
            boolean hasImages =
                    content.architecture().imageObjectKeys() != null
                            && !content.architecture().imageObjectKeys().isEmpty();
            if (hasMermaid || hasImages) {
                markdown.append("## 아키텍처\n\n");
                if (hasMermaid) {
                    markdown
                            .append("```mermaid\n")
                            .append(content.architecture().mermaidSource().trim())
                            .append("\n```\n\n");
                }
                if (hasImages) {
                    for (String objectKey : content.architecture().imageObjectKeys()) {
                        markdown
                                .append("![아키텍처 이미지](")
                                .append(storageService.toPublicUrl(objectKey))
                                .append(")\n\n");
                    }
                }
            }
        }

        return markdown.toString().trim();
    }

    private void appendSection(StringBuilder markdown, String heading, String body) {
        if (!AiJsonSupport.hasText(body)) return;
        markdown.append("## ").append(heading).append("\n\n").append(body).append("\n\n");
    }

    private String nullToDash(String value) {
        return AiJsonSupport.hasText(value) ? value : "-";
    }
}
