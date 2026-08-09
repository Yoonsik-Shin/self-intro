-- LangSmith 스타일의 Spring AI LLM 관측성(Observability) 체계 필요성 스터디 추가

INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'spring-ai-llm-observability-langsmith-tracing-necessity',
  'LangSmith 스타일의 Spring AI LLM 관측성(Observability) 체계 필요성과 아키텍처',
  'Python/LangGraph 생태계의 LangSmith처럼 Java/Spring AI 기반 LLM 워크플로우에서 프롬프트 입출력, 토큰 소모량, 비전/텍스트 파이프라인 단계별 Latency를 추적하기 위한 OpenTelemetry 및 Grafana Tempo 기반 Observability 체계의 필요성과 설계 원칙을 다룹니다.',
  '# LangSmith 스타일의 Spring AI LLM 관측성(Observability) 체계 필요성과 아키텍처

## 1. 개요 및 배경

LangGraph 및 LangChain 등 Python AI 생태계에서는 **LangSmith**를 통해 LLM 호출의 프롬프트 입출력, 에이전트 단계별 트레이싱, 토큰 소모량 및 비동기 파이프라인 흐름을 한눈에 시각화하고 디버깅합니다.

반면 Java / Spring Boot 생태계에서 Spring AI 기반으로 LLM 및 비전 모델 파이프라인(`JobApplicationUrlParseService`, `NvidiaNimClient` 등)을 구축할 때, 이러한 관측성(Observability) 체계가 없으면 LLM 호출 과정이 완전한 **블랙박스(Black-Box)** 가 되어 문제 원인 추적과 품질 개선이 불가능해집니다.

본 스터디에서는 Spring AI 환경에서 **LangSmith 수준의 LLM 관측성 체계가 왜 필요한지**, 그리고 **Micrometer Observation, OpenTelemetry(OTLP), Grafana Tempo**를 결합하여 이를 어떻게 표준 아키텍처로 구현하는지 정리합니다.

---

## 2. 왜 LLM 워크플로우에 전용 관측성(Observability)이 필요한가?

### 1) 프롬프트 입출력 및 파이프라인 흐름의 블랙박스화 해제
일반적인 HTTP API는 요청 데이터와 응답 데이터가 명확하고 정형화되어 있으나, LLM 파이프라인은 다음과 같은 복잡한 흐름을 거칩니다:
- 웹 DOM 수집 및 텍스트 전처리
- 시스템 프롬프트 및 사용자 프롬프트 조합
- 텍스트 LLM 모델 호출 (NVIDIA Nemotron 등)
- 텍스트 추출 미흡 시 비전 LLM 모델 배너 이미지 파싱 (Llama 3.2 Vision 등)

이 과정에서 AI가 왜 특정 결과를 생성했는지, 어떤 프롬프트가 들어갔고 어떤 비전 이미지가 전달되었는지 추적하려면 **단계별 입출력 데이터가 타임라인 트리(Waterfall Diagram)** 형태로 기록되어야 합니다.

### 2) 비동기/다단계 LLM 호출의 소요 시간(Latency) 병목 탐지
LLM 호출은 일반 DB 쿼리나 API 요청보다 훨씬 긴 시간(수 초 ~ 수십 초)이 소요됩니다. 
- 파이프라인 중 어느 구간(DOM 파싱, 텍스트 LLM, 비전 배너 파싱)에서 병목이 발생했는지 정밀하게 계측하지 못하면 SLA 준수 및 타임아웃 튜닝이 불가능합니다.

### 3) 모델별 토큰 소모량 및 비용 추적
LLM 서비스 운영 시 모델별 Prompt Token, Completion Token, Total Token 소모량을 실시간으로 모니터링해야 합니다. 단일 요청 안에서 여러 LLM 호출이 일어날 때 각 step별 토큰 소모량을 세분화하여 관측할 수 있어야 합니다.

---

## 3. Spring AI 관측성 아키텍처 (Spring AI + OpenTelemetry + Tempo)

Python 생태계가 LangSmith 전용 SaaS에 의존한다면, Java / Spring AI 생태계는 **클라우드 네이티브 표준인 OpenTelemetry(OTLP)** 를 활용하여 동일한 관측성을 자체 모니터링 스택(Grafana Tempo)에 통합할 수 있습니다.

```text
[Spring AI ChatClient / Service]
       │
       ▼ (Micrometer Observation API - ChatObservationContext)
[Micrometer Tracing Bridge OTel]
       │
       ▼ (OTLP Exporter / HTTP Async)
[Grafana Tempo (Trace Collector)]
       │
       ▼
[Grafana Explore UI (Waterfall Timeline & Prompt Trace Graph)]
```

### 핵심 구성요소 및 역할
1. **Spring AI Observation API**: `ChatClient` 호출 시 모델명, 프롬프트, 토큰 수, stop reason 등의 태그와 스팬(Span)을 자동 측정.
2. **`@Observed` 워크플로우 계측**: `JobApplicationUrlParseService.parse()`에 `@Observed`를 적용하여 고수준 파이프라인을 부모 스팬(Parent Span)으로 묶고, 하위의 LLM 호출들을 자식 스팬(Child Span)으로 연관 관계 정립.
3. **OpenTelemetry(OTLP) Exporter**: 수집된 트레이스를 앱 동작에 영향을 주지 않는 비동기 OTLP 프로토콜로 Grafana Tempo 전송.
4. **Grafana Tempo & Explore UI**: 수집된 Trace ID를 기반으로 프롬프트 입출력, 모델명, 소요시간 타임라인을 그래프로 시각화.

---

## 4. 결론 및 향후 과제 (Key Takeaways)

- **LLM 관측성(Observability)은 필수**: 프롬프트 디버깅, 토큰 비용 관리, 병목 구간 조치를 위해 LLM 워크플로우 트레이싱은 선택이 아닌 필수 요소임.
- **클라우드 네이티브 표준 종속성 없는 구현**: 특정 SaaS(LangSmith 등)에 종속되지 않고 OpenTelemetry / OTLP 표준을 사용하여 로컬 Docker Compose 및 Kubernetes 운영 환경(오라클 Cloud) 어디서나 100% 동일하게 수집 가능.
- **앱 부하 제로**: OTLP 비동기 익스포터를 활용하여 메인 비즈니스 로직 성능 저하 없이 완전한 관측 가능성 달성.',
  'PUBLISHED',
  '2026-08-09',
  NOW(),
  NOW(), NOW()
);

SET @study_id = LAST_INSERT_ID();

-- 관련 카테고리/노드 연결 (Taxonomy Node)
INSERT INTO `study_taxonomy_node` (`study_id`, `taxonomy_node_id`)
SELECT @study_id, `id` FROM `taxonomy_node` WHERE `slug` IN ('ai-llm', 'monitoring-ops', 'backend-core')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

-- 관련 태그 연결 (Spring Boot, Docker, Kubernetes)
INSERT INTO `study_tag` (`study_id`, `tag_id`)
SELECT @study_id, `id` FROM `tag` WHERE `name` IN ('Spring Boot', 'Docker', 'Kubernetes')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

-- 관련 스킬 연결 (Spring Boot, Kubernetes, Grafana, Docker)
INSERT INTO `study_skill` (`study_id`, `skill_id`)
SELECT @study_id, `id` FROM `skill` WHERE `name` IN ('Spring Boot', 'Kubernetes', 'Grafana', 'Docker')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;
