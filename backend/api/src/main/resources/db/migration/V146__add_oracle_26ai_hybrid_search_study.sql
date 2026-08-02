-- V146: Oracle 26ai Native Vector Batch & Hybrid Search Pipeline Documentation
-- Oracle 26ai Autonomous Database (selfintroworker)와 연동하는 2026 SOTA RAG 청킹 (Contextual Retrieval + 512t/20% Overlap)
-- 및 하이브리드 검색 (Lexical Keyword + Dense Vector + RRF Ranking Fusion) 파이프라인 학습 기록

INSERT INTO study (title, slug, category_id, is_published, content_markdown, created_at, updated_at)
SELECT
    'Oracle 26ai Native Vector Batch Sync 및 Hybrid Search 파이프라인 구축',
    'oracle-26ai-native-vector-hybrid-search-pipeline',
    id,
    TRUE,
    '# Oracle 26ai Native Vector Batch Sync & Hybrid Search Pipeline Architecture

## 1. 2026 SOTA RAG Chunking Architecture
1. **Contextual Retrieval (Anthropic SOTA)**:
   - 각 청크 헤더에 `[도메인 카테고리 | 메인 제목 | 핵심 기술스택]` 텍스트를 강제로 주입하여 독립 청크의 문맥 유실(Loss of Context) 방지. (검색 실패율 67% 감소)
2. **Recursive Character Splitting (512t / 20% Overlap)**:
   - 512 토큰 크기로 분할하고 20% Overlap(100 토큰)을 유지하여 문장 잘림 방지.

## 2. 하이브리드 검색 (Hybrid Search) & RRF (Reciprocal Rank Fusion)
- **Sparse Lexical Search**: 필수 기술 키워드 (Java, Spring, Redis 등) 정확 일치 평가 ($S_{lexical}$).
- **Dense Vector Search**: Oracle 26ai `1 - VECTOR_DISTANCE(..., COSINE)` 시맨틱 유사도 ($S_{dense}$).
- **Hybrid Score**: $S_{hybrid} = 0.7 \times S_{dense} + 0.3 \times S_{lexical}$로 융합 랭킹.

## 3. Oracle 26ai Native HNSW Indexing
```sql
CREATE INDEX idx_job_posting_vector_hnsw ON job_posting_vector (embedding_vector) ORGANIZATION INMEMORY NEIGHBOR GRAPH DISTANCE COSINE;
CREATE INDEX idx_experience_vector_hnsw ON experience_vector (embedding_vector) ORGANIZATION INMEMORY NEIGHBOR GRAPH DISTANCE COSINE;
CREATE INDEX idx_study_vector_hnsw ON study_vector (embedding_vector) ORGANIZATION INMEMORY NEIGHBOR GRAPH DISTANCE COSINE;
```
',
    NOW(),
    NOW()
FROM study_category
WHERE slug = 'database' OR slug = 'backend'
LIMIT 1;
