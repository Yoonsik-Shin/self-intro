# Study 선택지 C 확장 로드맵

## 목적

현재 Study 기능을 Markdown 기반 학습 아카이브에서 독립적인 기술 블로그·검색 플랫폼으로 확장할 때 필요한 기능과 도입 순서를 정의한다. 이 문서는 즉시 구현 범위가 아니라, 콘텐츠와 검색 트래픽이 늘어났을 때 선택적으로 진행하는 후속 계획이다.

## 진입 조건

다음 조건 중 둘 이상을 만족할 때 선택지 C 착수를 검토한다.

- 공개 Study가 100개 이상 누적된다.
- 단순 `LIKE` 검색에서 한글 검색 품질이나 응답 시간이 문제가 된다.
- 여러 기기나 작성자가 동시에 콘텐츠를 편집한다.
- 이미지, 첨부파일, 예약 발행이 반복적으로 필요해진다.
- 관련 글을 수동으로 연결하는 비용이 커진다.
- 검색 유입을 위한 SEO와 공유 미리보기가 중요해진다.

## 1. 콘텐츠 발행 체계

### 수정 이력

`study_revision`을 추가해 저장 시점별 Markdown 원문과 메타데이터를 보존한다.

```text
study_revision
├── id
├── study_id
├── revision_number
├── title
├── summary
├── content_markdown
├── change_note
├── created_by
└── created_at
```

지원 기능:

- 이전 버전 비교
- 특정 버전으로 복원
- 자동 저장본과 명시적 발행본 구분
- 누가 언제 무엇을 바꿨는지 감사 로그 제공

### 발행 상태

기존 `DRAFT`, `PUBLISHED`에 다음 상태를 확장한다.

- `SCHEDULED`: 예약 발행
- `PRIVATE`: 링크를 알아도 공개되지 않는 개인 문서
- `ARCHIVED`: 목록에서는 숨기지만 이력은 유지

예약 발행은 `publish_scheduled_at`과 스케줄러를 사용하고, 실제 공개 시점에 검색 인덱스를 갱신한다.

## 2. 이미지와 첨부파일

Markdown 본문에는 파일 자체가 아니라 영구 URL만 저장한다.

```text
study_asset
├── id
├── study_id
├── storage_key
├── original_name
├── content_type
├── size
├── width
├── height
├── alt_text
└── created_at
```

권장 처리 흐름:

1. 관리자가 에디터에 파일을 드래그한다.
2. 백엔드가 파일 형식과 크기를 검증한다.
3. Object Storage에 업로드한다.
4. 이미지 최적화본과 썸네일을 생성한다.
5. 반환된 URL을 Markdown 문법으로 삽입한다.
6. 사용되지 않는 파일은 유예 기간 후 정리한다.

운영 환경에서는 컨테이너 로컬 디스크 대신 OCI Object Storage 또는 S3 호환 저장소를 사용한다.

## 3. 고급 Markdown 문서 기능

- 제목을 기반으로 목차 자동 생성
- 코드 블록 문법 강조와 복사 버튼
- Mermaid 다이어그램 렌더링
- 경고·팁·주의 같은 callout 문법
- 각 제목에 anchor URL 제공
- 예상 읽기 시간 계산
- 이전 글·다음 글 탐색
- Markdown import/export

Markdown 확장 문법은 원문 호환성을 해치지 않도록 CommonMark/GFM을 기본으로 하고 플러그인 문법을 최소화한다.

## 4. 검색 플랫폼

### 1단계: MySQL 검색 개선

- 검색용 정규화 텍스트 컬럼
- 제목과 태그에 높은 가중치 부여
- MySQL FULLTEXT와 ngram parser 검토
- 검색어 및 필터 조합별 인덱스 추가
- 커서 기반 페이지네이션 검토

### 2단계: 전용 검색엔진

한글 부분 검색, 오타 허용, 자동완성이 필요하면 Meilisearch 또는 OpenSearch를 도입한다.

검색 문서 예시:

```json
{
  "id": 42,
  "slug": "jpa-transaction",
  "title": "JPA 트랜잭션 정리",
  "summary": "트랜잭션 전파와 격리 수준을 정리합니다.",
  "plainText": "Markdown을 제거한 검색용 본문",
  "category": "backend",
  "tags": ["transaction", "jpa"],
  "skills": ["Java", "Spring Boot"],
  "experiences": ["CS Test Bed"],
  "publishedAt": "2026-07-15T12:00:00"
}
```

DB를 원본 데이터로 유지하고 검색엔진은 읽기 전용 파생 인덱스로 취급한다. 발행·수정·삭제 이벤트를 Outbox에 기록한 뒤 비동기로 색인을 갱신하면 DB 저장과 인덱싱 실패를 분리할 수 있다.

## 5. 의미 기반 검색과 관련 글 추천

키워드 검색만으로 충분하지 않을 때 문서 임베딩을 추가한다.

- 제목, 요약, 본문을 적절한 크기로 분할
- 문서 또는 chunk 단위 임베딩 생성
- 벡터 저장소에 `studyId`, `chunkId`, 공개 상태 저장
- 키워드 점수와 벡터 유사도를 결합한 하이브리드 검색
- 동일 카테고리, 태그, Skill, Experience 관계를 추천 점수에 반영

자동 추천 결과는 `study_relation`에 바로 확정하지 않고 추천 후보로 보여준 뒤 관리자가 승인하도록 한다.

## 6. 문서 그래프와 백링크

현재의 방향성 있는 `study_relation`을 이용해 다음 기능을 제공한다.

- 현재 Study가 참조하는 글
- 현재 Study를 참조하는 글
- 선수 학습 경로
- 후속 학습 경로
- 프로젝트에 적용된 학습 내용
- 고립된 문서 탐지

관계가 많아져도 초기에는 관계형 DB 재귀 쿼리로 처리한다. 그래프 탐색이 핵심 기능이 되기 전에는 별도 그래프 DB를 도입하지 않는다.

## 7. SEO와 공유

Study별로 다음 메타데이터를 관리한다.

- SEO 제목과 설명
- canonical URL
- Open Graph 제목, 설명, 이미지
- 공개 여부와 robots 정책
- JSON-LD `Article` 구조화 데이터
- sitemap과 RSS feed

현재 SPA 구조에서 검색엔진 노출이 부족하면 Study 상세 페이지만 SSR/SSG로 옮기는 방안을 먼저 검토한다.

## 8. 운영과 보안

- Markdown 내 raw HTML 비활성화 또는 sanitizer 적용
- 외부 링크에 안전한 `rel` 속성 적용
- 파일 확장자와 MIME 이중 검증
- 관리자 변경 감사 로그
- 발행 API rate limit
- 검색 인덱스 재구축 명령과 상태 확인 API
- DB, Object Storage, 검색 인덱스의 백업·복구 절차
- 깨진 내부 링크와 고아 asset 정기 점검

## 권장 구현 순서

1. 수정 이력과 자동 저장
2. 이미지·첨부파일 저장소
3. 목차·코드 강조·문서 탐색 UX
4. SEO 메타데이터와 sitemap/RSS
5. 검색 로그 수집과 MySQL 검색 튜닝
6. 전용 검색엔진 도입
7. 의미 기반 검색과 자동 관련 글 추천
8. 문서 그래프 시각화

각 단계는 이전 단계의 운영 지표로 필요성이 확인된 경우에만 진행한다. 특히 전용 검색엔진과 벡터 검색은 콘텐츠 규모가 작을 때 운영 복잡도에 비해 얻는 효과가 제한적이다.
