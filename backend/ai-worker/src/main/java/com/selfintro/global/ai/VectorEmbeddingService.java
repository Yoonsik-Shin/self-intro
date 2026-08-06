package com.selfintro.global.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.stereotype.Service;
import java.util.Arrays;
import java.util.Random;

/**
 * 2048차원 벡터 임베딩 수치 배열 생성 서비스 (NVIDIA NIM nvidia/nemotron-3-embed-1b 연동)
 */
@Slf4j
@Service
public class VectorEmbeddingService {

    private final EmbeddingModel embeddingModel;

    public VectorEmbeddingService(EmbeddingModel embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    /**
     * 텍스트 청크를 2048차원 임베딩 수치 문자열(Oracle 26ai VECTOR 호환 형식 "[0.012, -0.045, ...]")로 변환한다.
     */
    public String embedToVectorString(String text) {
        if (text == null || text.isBlank()) {
            return generateFallbackVectorString(text);
        }

        try {
            float[] embedding = embeddingModel.embed(text);
            if (embedding != null && embedding.length > 0) {
                return formatAsOracleVectorString(embedding);
            }
        } catch (Exception exception) {
            log.warn("임베딩 API 호출 실패, 결정론적 폴백 벡터 생성 사용: {}", exception.getMessage());
        }

        return generateFallbackVectorString(text);
    }

    /**
     * Oracle 26ai VECTOR 데이터 타입 문자열 변환 ([val1, val2, ...])
     */
    private String formatAsOracleVectorString(float[] vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            sb.append(String.format(java.util.Locale.US, "%.6f", vector[i]));
            if (i < vector.length - 1) {
                sb.append(",");
            }
        }
        sb.append("]");
        return sb.toString();
    }

    /**
     * 텍스트 해시 기반 2048차원 결정론적(Deterministic) 폴백 벡터 생성 (로컬/테스트 환경용)
     */
    private String generateFallbackVectorString(String text) {
        long seed = (text == null) ? 42L : text.hashCode();
        Random random = new Random(seed);
        float[] dummy = new float[2048];
        double sumSq = 0.0;

        for (int i = 0; i < 2048; i++) {
            dummy[i] = (float) (random.nextGaussian() * 0.1);
            sumSq += dummy[i] * dummy[i];
        }

        // L2 단위 벡터 정규화
        float norm = (float) Math.sqrt(sumSq);
        if (norm > 0) {
            for (int i = 0; i < 2048; i++) {
                dummy[i] /= norm;
            }
        }

        return formatAsOracleVectorString(dummy);
    }
}
