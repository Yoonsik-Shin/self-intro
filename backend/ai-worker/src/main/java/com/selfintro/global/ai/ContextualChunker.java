package com.selfintro.global.ai;

import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;

/**
 * 2026 SOTA RAG Chunking Engine
 * 1) Recursive Character Splitting (512 Tokens / 20% Overlap)
 * 2) Contextual Retrieval Header Injection (Anthropic SOTA - 검색 실패율 67% 감축)
 */
@Component
public class ContextualChunker {

    private static final int DEFAULT_CHUNK_SIZE_CHARS = 1000; // 약 500~600 토큰
    private static final int DEFAULT_OVERLAP_CHARS = 200;      // 약 20% Overlap

    /**
     * 문맥 결합 헤더(Contextual Header)와 재귀적 문자 분할(Recursive Character Splitting)을 결합하여 고품질 청크 목록을 생성한다.
     *
     * @param rawText           원본 텍스트
     * @param contextualHeader  청크 헤더로 결합할 글로벌 문맥 메타데이터 (예: "[프로젝트: Self-Intro | 기술스택: Java, Spring, Oracle 26ai]")
     * @return 고품질 청크 텍스트 리스트
     */
    public List<String> chunkTextWithContext(String rawText, String contextualHeader) {
        if (rawText == null || rawText.isBlank()) {
            return List.of();
        }

        String cleanedText = normalizeText(rawText);
        List<String> rawChunks = splitRecursively(cleanedText, DEFAULT_CHUNK_SIZE_CHARS, DEFAULT_OVERLAP_CHARS);
        List<String> contextualizedChunks = new ArrayList<>();

        String headerPrefix = (contextualHeader != null && !contextualHeader.isBlank())
                ? contextualHeader.trim() + "\n"
                : "";

        for (String chunk : rawChunks) {
            contextualizedChunks.add(headerPrefix + chunk.trim());
        }

        return contextualizedChunks;
    }

    /**
     * 텍스트 정규화 (마크다운 노이즈 및 불필요 공백 세척)
     */
    public String normalizeText(String text) {
        if (text == null) return "";
        return text.replaceAll("\r\n", "\n")
                .replaceAll("\n{3,}", "\n\n")
                .replaceAll("[ \\t]{2,}", " ")
                .trim();
    }

    /**
     * 재귀적 문자 분할 (Paragraph \n\n -> Sentence . -> Space) + Overlap
     */
    private List<String> splitRecursively(String text, int chunkSize, int overlapSize) {
        List<String> chunks = new ArrayList<>();
        int length = text.length();

        if (length <= chunkSize) {
            chunks.add(text);
            return chunks;
        }

        int start = 0;
        while (start < length) {
            int end = Math.min(start + chunkSize, length);

            // 자연스러운 문단/문장 경계 탐색
            if (end < length) {
                int boundary = findNaturalBoundary(text, start, end);
                if (boundary > start) {
                    end = boundary;
                }
            }

            String chunk = text.substring(start, end).trim();
            if (!chunk.isEmpty()) {
                chunks.add(chunk);
            }

            if (end >= length) {
                break;
            }

            // Overlap 적용하여 다음 시작점 이동
            start = Math.max(start + 1, end - overlapSize);
        }

        return chunks;
    }

    private int findNaturalBoundary(String text, int start, int end) {
        // 1. 문단 경계 \n\n
        int lastParagraph = text.lastIndexOf("\n\n", end);
        if (lastParagraph > start + (end - start) / 2) {
            return lastParagraph + 2;
        }

        // 2. 문장 경계 . 또는 \n
        int lastSentence = text.lastIndexOf(". ", end);
        if (lastSentence > start + (end - start) / 2) {
            return lastSentence + 2;
        }

        int lastLine = text.lastIndexOf("\n", end);
        if (lastLine > start + (end - start) / 2) {
            return lastLine + 1;
        }

        return end;
    }
}
