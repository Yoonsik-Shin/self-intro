-- 백엔드 중량화 문제, K8s Pod 배포 격리(api/worker), ArgoCD 모니터링 분리 및 레플리카셋 정돈 스터디 노트 추가.

INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'backend-architecture-k8s-pod-isolation-and-monitoring-cleanup',
  'Spring Boot 백엔드 대용량 AI 연동 중량화, K8s Pod 배포 격리 및 레플리카셋/모니터링 정돈',
  'Spring Boot 모놀리스 백엔드에서 NVIDIA NIM Vision/LLM 호출(300초 타임아웃)과 사람인 크롤링으로 인한 Tomcat 스레드 고갈 및 OOM 위험을 분석하고, 단일 VM 환경에서의 MSA vs 모놀리스 JVM 자원(CPU/RAM) 오버헤드를 평가하여 K8s Pod 배포 격리(api vs worker), ArgoCD 모니터링 앱 분리 및 ReplicaSet 히스토리 제어(revisionHistoryLimit: 3)로 시스템을 정돈한 과정을 다룹니다.',
  '# Spring Boot 백엔드 대용량 AI 연동 중량화, K8s Pod 배포 격리 및 레플리카셋/모니터링 정돈

## 1. 개요 및 배경

Self-Intro 백엔드는 포트폴리오/이력서/블로그 등의 가벼운 CRUD 웹 API 기능과 더불어, 사람인 채용공고 수집, 잡플래닛 연동, NVIDIA NIM Vision/LLM 모델 호출(최대 300초 소요), AI 매칭 점수 계산 및 자가점검 질문 자동 생성 등 다양한 역할을 단일 Spring Boot 애플리케이션 안에서 처리해 왔습니다.

시스템이 고도화됨에 따라 무거운 AI I/O 작업이 웹 요청 처리와 동일한 Tomcat 스레드 풀 및 JVM 메모리 영역에서 실행되면서 장애 전파 위험이 높아졌고, ArgoCD 모니터링 대시보드 역시 레플리카셋과 모니터링 리소스가 혼재하여 정돈이 필요해졌습니다.

---

## 2. 문제 상황 및 근본 원인 분석

### 1) 무거운 AI 연동 및 크롤링으로 인한 스레드 고갈 및 OOM 위험
- NVIDIA NIM API 호출(특히 멀티이미지 Vision 파싱 및 자가점검 생성)은 읽기 타임아웃이 300초에 달합니다.
- 순간적으로 동시 AI 요청이나 채용공고 병렬 수집이 몰릴 경우, Tomcat 작업 스레드(`nio-8080-exec-*`)가 모두 소진되거나 메모리 스파이크가 발생하여 일반 방문자의 이력서/포트폴리오 조회 API까지 무응답(Timeout) 상태에 빠질 위험이 존재했습니다.

### 2) MSA 전환 시 단일 VM 노드 자원 한계 (JVM 메모리 오버헤드)
- 시스템을 완전히 별도 프로젝트와 DB로 쪼개는 마이크로서비스(MSA) 전환을 검토하였으나, 단일 VM 인스턴스(Oracle Cloud Free Tier) 환경에서는 JVM 1개당 기본 구동 메모리(300MB~500MB+)가 중복 발생하여 메모리 부족으로 서버가 터질 위험이 컸습니다.

### 3) ArgoCD 대시보드 자원 시각화 무질서
- `deploy/k8s/overlays/prod/backend/kustomization.yaml` 내에 `monitoring` 리소스가 함께 포획되어 있어 ArgoCD `self-intro-backend` 트리에 Grafana, Loki, Prometheus, Alloy 등 모니터링 스택 전체가 뒤섞여 나타났습니다.
- 또한 Deployment에 `revisionHistoryLimit`가 설정되어 있지 않아 60개가 넘는 구버전 0-replica ReplicaSet이 ArgoCD 화면을 장악하여 가독성을 해쳤습니다.

---

## 3. 아키텍처 의사결정 및 트레이드오프 평가

| 구분 | 완전 MSA 전환 (Option C) | K8s Pod 배포 격리 + 모듈 구조화 (Option A+B) |
| :--- | :--- | :--- |
| **자원 효율성** | JVM 복수 구동으로 기본 메모리(RAM) 비용 급증 | **단일 인스턴스 메모리 자원 100% 아낌 (가성비 극대화)** |
| **장애 격리** | DB 및 서비스 완전 독립 | **K8s Pod 프로세스 분리로 스레드 고갈 & OOM 완전 차단** |
| **운영 복잡도** | DB 분리 및 분산 트랜잭션 관리 부담 | 기존 DB 및 단일 소스코드 유지로 **운영 공수 최소화** |

**결정**: 단일 VM 노드의 메모리 한계를 고려하여, 완전 MSA 대신 **가성비 높은 K8s Pod 배포 격리 (웹 API 전용 파드 vs 백그라운드 Worker 전용 파드)**와 **ArgoCD 모니터링 독립 및 ReplicaSet 정돈**을 최종 채택했습니다.

---

## 4. 핵심 설계 및 구현 내용

### 1) K8s Pod 배포 분리 및 스케줄러 조건부 제어
- **`backend-api` Pod**: 포트폴리오 웹 요청 전용. `JOB_POSTING_SCHEDULER_ENABLED=false`로 설정하여 백그라운드 크롤링 스케줄러를 차단합니다.
- **`backend-worker` Pod**: 채용공고 수집, AI 분석, 스케줄러 전용. `JOB_POSTING_SCHEDULER_ENABLED=true`로 설정하고 Ingress에서 제외합니다.
- **`JobPostingSchedulingConfig`**: `@ConditionalOnProperty(name = "app.job-posting.scheduler-enabled", havingValue = "true")`를 적용하여 Worker Pod에서만 자동 수집이 동작하도록 격리했습니다.

### 2) ArgoCD 모니터링 스택 독립 및 ReplicaSet 대청소
- `backend/kustomization.yaml`에서 `monitoring` 리소스를 제거하고, 별도의 ArgoCD 매니페스트(`deploy/argocd/applications/monitoring-prod.yaml`)로 독립시켰습니다.
- `deployment.yaml`에 `revisionHistoryLimit: 3`을 추가하고, 기존에 남아있던 50여 개의 오래된 0-replica ReplicaSet을 삭제하여 ArgoCD 뷰를 깨끗이 정돈했습니다.

---

## 5. 성과 및 인사이트

1. **장애 격리 완성**: AI 연동 중 메모리/스레드 스파이크가 발생해도 `worker` 파드만 영향을 받으며, 방문자용 `api` 파드는 100% 정상 가동을 보장합니다.
2. **자원 최적화**: 추가적인 JVM 메모리 오버헤드 없이 기존 노드 자원을 최적으로 활용했습니다.
3. **대시보드 가독성 확보**: ArgoCD에서 백엔드 앱과 모니터링 앱이 명확히 분리되었으며, 레플리카셋 트리가 깔끔하게 관리됩니다.',
  'PUBLISHED',
  5,
  '2026-08-02',
  NOW(),
  NOW(), NOW()
);

SET @study_id = LAST_INSERT_ID();

-- 관련 태그 연결 (Spring Boot, Kubernetes, Docker, Architecture)
INSERT INTO `tag` (`name`, `slug`) VALUES ('Architecture', 'architecture')
ON DUPLICATE KEY UPDATE `name` = `name`;

INSERT INTO `study_tag` (`study_id`, `tag_id`)
SELECT @study_id, `id` FROM `tag` WHERE `name` IN ('Spring Boot', 'Kubernetes', 'Docker', 'Architecture')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;

-- 관련 스킬 연결 (Spring Boot, Kubernetes, Docker)
INSERT INTO `study_skill` (`study_id`, `skill_id`)
SELECT @study_id, `id` FROM `skill` WHERE `name` IN ('Spring Boot', 'Kubernetes', 'Docker')
ON DUPLICATE KEY UPDATE `study_id` = `study_id`;
