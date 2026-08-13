# Self-Intro SaaS 운영 가이드

- 최종 갱신: 2026-08-12
- 대상 브랜치: `feat/saas-security-foundation`
- 제품 기능 진입점: [제품 기능 지도](../product/feature-map.md)
- 설계 기준: [ADR-001](../adr/ADR-001-saas-security-multitenancy.md)
- 가입 기준안: [ADR-002](../adr/ADR-002-registration-and-workspace-onboarding.md)
- 비공개 베타테스터 안내: [베타테스터 가이드](../beta/private-beta-tester-guide.md)
- Workspace 삭제 inventory: [Workspace purge inventory](workspace-purge-inventory.md)
- Workspace 콘텐츠 격리: [Workspace 콘텐츠 안정화 계획](workspace-content-stabilization-plan.md)
- Job·AI·Vector 격리: [Job·AI·Vector 안정화 계획](jobs-ai-vector-stabilization-plan.md)
- Backup·복구 정책과 실행 gate: [Disaster recovery policy](disaster-recovery-policy.md)
- 전환 작업 체크포인트: [SaaS 전환 작업 체크포인트](saas-transition-checkpoint.md)
- 운영 배포 상태: **미배포**

이 문서는 현재 구현된 동작, 로컬 검증 방법, 운영 반영 전 준비사항을 운영자 관점에서 설명한다.
설계 원칙은 ADR을, 실제 실행 절차는 이 문서를 기준으로 한다.

## 1. 현재 상태 요약

### 목표 화면 구조

| 경로                                    | 대상           | 역할                                       |
| --------------------------------------- | -------------- | ------------------------------------------ |
| `/`                                     | 모든 방문자    | 제품 구조·기능·체험을 보여주는 메인        |
| `/workspace/{workspaceSlug}`            | 모든 방문자    | Workspace가 발행한 공개 프로필             |
| `/workspace/{workspaceSlug}/experience` | 모든 방문자    | Workspace 공개 경력                        |
| `/workspace/{workspaceSlug}/study`      | 모든 방문자    | Workspace 공개 공부                        |
| `/workspace/{workspaceSlug}/ontology`   | 모든 방문자    | Workspace 공개 의사결정 온톨로지           |
| `/workspace/{workspaceSlug}/manage`     | Workspace 멤버 | 권한별 Workspace·플랫폼 관리 셸            |
| `/ops`                                  | 플랫폼 운영자  | 관리 셸의 초대 메뉴로 이동하는 호환 진입점 |

현재 `/` 제품 메인, `/workspace/{workspaceSlug}` 공개 프로필,
Workspace별 experience·study·ontology, `/workspace/{workspaceSlug}/manage` 관리 화면 진입 경계와 플랫폼 운영자용 초대 관리를 구현했다. 나머지 플랫폼 운영 기능 일부는 아직 기존 구조를 사용한다. canonical Workspace
라우트가 완성될 때까지 기존 URL을 제거하지
않으며, 호환 리다이렉트와 데이터 격리 검증을 끝낸 뒤 전환한다.

`/workspace/{workspaceSlug}/manage`는 URL의 slug와 로그인 사용자의 활성 Membership을 대조하며
`OWNER`, `ADMIN`, `EDITOR`만 관리 UI에 진입시킨다. `VIEWER`는 공개 화면만 볼 수 있다. 다만 이것은
프론트 편의·1차 방어선이고, 최종 권한 판단은 반드시 백엔드가 수행해야 한다.

Profile, Experience, Study, Skill, Competency 관리 API는 각각
`/api/workspaces/{workspaceSlug}/profile`, `/experiences/manage`, `/studies/manage`, `/skills`,
`/competencies`로 전환해 URL의 Workspace와 Membership
역할을 서버에서 검증한다. 조회는 `OWNER`, `ADMIN`, `EDITOR`, `VIEWER`, 수정은 `OWNER`, `ADMIN`,
`EDITOR`에게 허용한다. Skill 연결은 `/skills/{skillId}/connections`, 이미지 업로드 URL은
`/images/presigned-upload`에서 같은 Workspace를 검증한다. Experience의 Study·상세·관련 이력 연결은
`/experiences/manage/{id}/connections`, 대표 프로젝트 배치는 `/experience-placements/{type}`에서
Workspace를 검증한다. Portfolio Case Study는 `/portfolio/case-studies/manage`, 출력 서식은
`/print-templates/manage`에서 같은 경계를 검증한다. 학습 자료는
`/learning-resources/manage`, AI 학습 계획은 worker의
`/api/worker/workspaces/{slug}/study-plans/manage`에서 같은 Membership과 Workspace 소유권을
검증한다. 일반 사용자 관리 셸에는 Profile, Experience, Study, Skill, Competency, Portfolio,
LearningResource, StudyPlan과 PrintTemplate을 개방했다. Experience·Study·Competency AI는 slug 기반
canonical endpoint에서 Workspace 후보만 조회한다. `/api/admin/**` 호환 endpoint는 플랫폼 역할을 계속
요구하지만 Workspace 관리 UI에서는 호출하지 않는다. Taxonomy 원본·제품 Architecture처럼 플랫폼이
소유하는 관리 기능만 플랫폼 운영자 메뉴에 남긴다.

관리 주체와 최종 역할별 권한표는 [제품 기능 지도 - 관리 주체별 기능·콘텐츠 지도](../product/feature-map.md#7-관리-주체별-기능콘텐츠-지도)를
기준으로 한다. Experience·Study·역량·지원·포트폴리오·PDF는 Workspace 소유 콘텐츠이며 canonical
관리 API를 사용한다. 시스템
아키텍처·초대·플랫폼 전체 통계·후원·배포·관측 도구만 플랫폼 운영 범위로 유지한다. 특정
Workspace 공개 페이지의 방문 통계는 해당 Workspace의 `OWNER`, `ADMIN`이 관리하도록 별도 범위로
분리한다. 공개 `/api/workspaces/{slug}/visits`는 발행된 Workspace만 기록하며 플랫폼 전체 집계와
Workspace 집계를 함께 갱신한다. `/api/workspaces/{slug}/visits/manage/**`는 해당 Workspace의
`OWNER`, `ADMIN`만 조회할 수 있다. 플랫폼 운영자의 `/api/admin/visits/**`는 전체 집계만 제공하며,
플랫폼 역할만으로 다른 Workspace의 개별 통계를 열람할 수 없다.

구현 및 검증 완료:

- DB 사용자, Workspace, Membership, 플랫폼 역할
- 기존 단일 운영자 계정의 개인 Workspace bootstrap
- 프로필·경력의 Workspace 소유권
- slug 기반 Profile 관리 API와 Membership 역할별 조회·수정 인가
- V199 공통 Skill 정의와 Workspace별 표현값(`workspace_skill`) 분리·기존 데이터 backfill
- Competency Workspace 소유권과 동일 Workspace 경력·Study 연결 검증
- 대표 프로젝트 배치의 Workspace 조건 조회·교체
- 공개 Introduction의 Skill·Competency·대표 프로젝트 Workspace 격리
- `/api/skill-catalog`, `/api/workspaces/{slug}/skills`, `/competencies` API 경계
- 공개 연락처 필드 분리
- 기본 거부 API 정책
- Workspace 단위 객체 저장소 key
- Workspace 단위 경력·Study 벡터 저장·삭제·검색
- V200 Study slug·Tag·Taxonomy curation Workspace 격리와 기존 데이터 backfill
- Experience·Study mutation, Skill 연결, 이미지 presign의 canonical Workspace API
- Profile·Experience·Study·Skill·Competency 관리 UI의 일반 Workspace 개방
- 공통 Taxonomy 중 공개 Study에 사용할 항목을 고르는 Workspace 큐레이션 UI
- 사용 중인 Workspace Skill 제거 차단
- Experience·Study·Competency AI 초안 입력과 결과의 Workspace 격리 및 일반 Workspace UI 개방
- V201 Portfolio Case Study·PrintTemplate Workspace 소유권과 기존 데이터 backfill
- Portfolio의 Workspace별 slug·프로젝트·Study·상세 근거·파일 key 검증 및 canonical 관리 UI
- PrintTemplate canonical Workspace API. 공고 연결은 JobPosting overlay 전까지 일반 API에서 차단
- 기존 플랫폼 Portfolio AI·PDF 초안은 bootstrap 공개 Workspace만 조회하며 다른 Workspace ID를
  직접 전달해도 찾지 못하도록 제한
- V202 LearningResource 공통 catalog와 Workspace 상태·우선순위·개인 메모·Tag overlay backfill,
  `/api/workspaces/{slug}/learning-resources/manage` canonical API
- V203 JobPosting 공통 원본과 Workspace 지원 상태·메모·관심도·분석·상태 이력 overlay backfill,
  `/api/workspaces/{slug}/job-applications/manage` canonical API
- LearningResource·JobPosting의 기존 플랫폼 화면과 worker는 bootstrap 호환 경로로만 유지하고,
  JobPosting AI 하위 데이터를 이관하기 전까지 지원 관리 화면은 일반 계정 메뉴에서 숨김
- LearningResource 전용 Workspace UI와 공통 catalog 선택·Workspace 상태/메모 수정 경계
- V204 StudyPlan root Workspace 소유권, 후보 우선순위 snapshot, Workspace 자료·기술·프로필 RAG
  범위와 canonical worker API
- JobPosting Workspace catalog 선택·지원 상태·메모·관심도·상태 이력 UI와 플랫폼 공고 수집·AI
  운영 UI 분리
- V205 자기소개서 문항·답변을 `workspace_job_application` 자식으로 backfill하고 revision FK를
  연결. `/api/workspaces/{slug}/job-applications/manage/{postingId}/cover-letter-items`에서
  Membership과 지원 건 소유권을 검증하며 수동 작성 UI를 일반 Workspace에 개방
- 기존 `/api/worker/job-postings/**` 자기소개서·Gap 경로는 bootstrap Workspace 호환용으로만
  유지하고 플랫폼 운영자에게만 허용
- Workspace 자기소개서 AI는
  `/api/worker/workspaces/{slug}/job-applications/manage/{postingId}/generate-cover-letter-draft`에서
  지원 건·문항과 경력 RAG의 Workspace를 검증한 뒤 일반 Workspace에 개방
- V206은 어필 분석을 `workspace_job_application`에 저장하고 Gap 문서를 지원 건 하위로 backfill한다.
  Gap 생성도 명시적 Workspace 경력 RAG만 사용한다.
- 채용공고 PDF AI 초안은
  `/api/worker/workspaces/{slug}/job-applications/manage/{postingId}/print-template-draft/stream`에서
  Workspace 지원 건을 확인하고 해당 Workspace의 이력·벡터만 사용한다. 재생성은 같은 Workspace와
  같은 지원 공고에 연결된 PrintTemplate만 허용한다.
- 최종 제출 PDF는 `/api/workspaces/{slug}/print-templates/manage/job-applications/**`에서 지원 건과
  PrintTemplate 소유권을 함께 확인한다. object key는
  `workspaces/{workspaceId}/print-template/final-pdf/**`만 허용하고 비공개 버킷으로 라우팅한다.
  PrintTemplate CRUD·출력 UI는 일반 Workspace에 개방하되 명시적 Workspace 계약이 없는 Portfolio AI
  revision 버튼은 플랫폼 역할 여부와 무관하게 관리 셸에서 비활성화한다.
- Workspace 적합도 재계산은
  `POST /api/worker/workspaces/{slug}/job-applications/manage/{postingId}/rematch`만 canonical 경로로
  사용한다. `OWNER`, `ADMIN`, `EDITOR` Membership을 확인하고 해당 Workspace의 `workspace_skill`만
  입력으로 사용하며 결과는 `workspace_job_application`에 저장한다. `job_posting_vector`는 공고 원문
  catalog 벡터이므로 `workspace_id`가 없는 것이 정상이다. 공용 수집·등록·새로고침에서 개인화 점수를
  만들지 않는다.
- 플랫폼 운영자 MFA, 짧은 세션, 동시 세션 제한, 전체 기기 로그아웃
- IP·기기 fingerprint 변경 감사
- Workspace 메뉴와 플랫폼 운영 메뉴의 프론트 분리
- 제품 메인과 Workspace 공개·관리·플랫폼 운영 URL 경계 결정
- `/` 제품 메인과 Workspace 공개 이력 URL 구현
- `/workspace/{slug}/manage` Membership 기반 프론트 진입 게이트와 `/admin` 호환 리다이렉트 구현
- 동일한 관리 셸에서 Workspace 역할과 플랫폼 역할에 따라 메뉴·상단 도구 조건부 노출
- 관리 셸 우측 계정 메뉴에서 닉네임·로그인 이메일·Workspace 역할·플랫폼 역할 확인 및 로그아웃
- 동일 브라우저 프로필의 탭은 단일 로그인 쿠키를 공유하며, 로그인·로그아웃 이벤트를 탭 간 전파해
  계정 종속 query cache와 저장 전 미리보기를 폐기한 뒤 안전한 메인 화면을 다시 연다. 서로 다른 계정의
  동시 테스트는 시크릿 창이나 별도 브라우저 프로필을 사용한다.
- Workspace 공개 내비게이션을 `프로필 / 경험 / 학습`으로 구성
- 해당 Workspace의 `OWNER`, `ADMIN`, `EDITOR`에게만 `Workspace 관리` 버튼 노출
- 공개 경험·학습 목록과 상세를 `/workspace/{slug}/...`로 유지하고 Workspace 소유권으로 조회
- 기존 `/w/{slug}`에서 canonical `/workspace/{slug}`로 호환 리다이렉트
- 플랫폼 화면의 특정 사용자 Workspace 링크와 `owner-personal` 프론트 특례 제거
- V194 계정 가입·동의·이메일 확인·실명 인증 경계와 Workspace `public_key` 기반
- 초대 가입 → 이메일 확인 → 이메일 로그인 → 비공개 Workspace 생성 흐름
- 신규 Workspace의 무작위 provisional slug와 `PRIVATE` 발행 상태
- 일반 Workspace 계정의 기존 전역 관리 UI 및 mutation API 임시 차단
- 플랫폼 메인 헤더·모바일 메뉴·Hero의 초대 가입 및 로그인 진입점
- 로그인 사용자의 첫 Workspace 관리 화면 또는 Workspace 온보딩 진입점
- `/ops` 개인·공용 초대 발급, 이메일 발송, 목록, 폐기, 교체 발송
- 초대 원문 hash 저장, 개인 초대 이메일 일치 검증, 운영 작업 재인증과 감사 이벤트
- V211 Workspace 공개 revision/resource와 발행 상태 API. 공개 소개·Study·온톨로지는 작업 테이블이
  아니라 최신 불변 snapshot만 조회하며 `공개 페이지 > 발행 관리`에서 `OWNER`·`ADMIN`이 발행·공개 중지를 수행
- V212 발행/복원 메타데이터, Membership 기반 revision 이력 조회, `OWNER`·`ADMIN` rollback,
  최근 개수+최소 기간 retention 정책과 `발행 관리` 이력 UI
- V213 canonical Workspace slug registry, 기존 slug active alias, 공개 페이지 308 redirect,
  `OWNER`·`ADMIN` 최근 재인증 기반 변경 UI와 보안 감사 이벤트
- V214 가입 초대와 분리된 Workspace 참여 초대, hash token·이메일 수락, 멤버 역할·제거·소유권 이전,
  최근 재인증과 보안 감사 이벤트

운영 반영 전 미완료:

- JobPosting catalog 벡터를 실제 추천에 사용하는 경우의 Workspace 결과 snapshot·삭제 전파 E2E
- 온톨로지에 Experience·회고 연결을 추가할 경우 Workspace overlay와 복합 FK 적용
- 플랫폼 기본 PrintTemplate catalog와 Workspace 복사 모델은 향후 유료 템플릿 기능에서 결정
- Competency 벡터를 다시 활성화할 경우 Workspace vector schema·cache 검증
- 본인 확인을 포함한 MFA 완전 초기화 절차와 운영 암호화 Secret
- 운영 private object bucket 프로비저닝·기존 최종 PDF 이관, 파일 검사, 삭제 전파 rehearsal
- Workspace용 canonical API가 없는 레거시 관리 도메인의 플랫폼 전용 유지 또는 Workspace 이관 결정
- 역할로 잠근 `/api/admin/**` 호환 endpoint의 비공개 베타 이후 제거 시점 결정
- 운영 이메일 provider와 비밀번호 유출 목록 기반의 운영 blocklist 연동
- 가입·Workspace 초대의 운영 보존기간 승인과 V215 bounded cleanup의 지표·실패 알림
- 실명 인증 provider 연동, 암호화·접근 감사·보존 및 삭제 정책

PrintTemplate canonical Workspace API·일반 Workspace UI, Competency AI 입력 격리, Support Access의
요청·소유자 승인·최소 범위 진단·만료·철회·감사는 구현과 로컬 Compose UAT를 완료했다. 이 항목은 더
이상 구현 미완료가 아니며, 현재 commit HEAD의 전체 회귀와 운영 provider 설정만 release gate로 남긴다.

위 항목이 남아 있으므로 현재 브랜치는 운영 배포 대상이 아니다.

## 2. 현재 인프라와 이식성 경계

현재 운영 환경:

| 역할               | 현재 구현                         |
| ------------------ | --------------------------------- |
| Kubernetes         | OCI OKE                           |
| 컨테이너 Registry  | OCIR                              |
| 관계형 DB          | MySQL HeatWave                    |
| 벡터 DB            | Oracle ATP/26ai                   |
| 객체 저장소        | OCI Object Storage S3 호환 API    |
| 영속 볼륨          | OCI Block Volume                  |
| DNS/CDN/TLS 프록시 | Cloudflare                        |
| 배포               | GitHub Actions, Kustomize, ArgoCD |

OCI는 현재 배포 adapter다. 객체 저장소는 `ObjectStoragePort`, 경력 벡터 검색은
`ProfileVectorSearchPort` 뒤에 있으며 Oracle SQL은 adapter 내부에만 둔다. AWS나 Azure로
이전할 때 도메인 모델이 아니라 adapter, Secret, Kubernetes overlay를 교체하는 방향을 유지한다.

### 객체 저장소 공개·비공개 경계

Redis 파생 cache 삭제 안전장치는 `WORKSPACE_PURGE_CACHE_DELETE_ENABLED`이며 기본값은 `false`다.
모든 저장소 실행기와 복구 rehearsal 전에는 바꾸지 않는다.

- `STORAGE_BUCKET`: 공개 이미지용 버킷. 공개 읽기를 허용할 수 있다.
- `STORAGE_PRIVATE_BUCKET`: 최종 제출 PDF용 비공개 버킷. 익명 읽기를 허용하지 않는다.
- `STORAGE_PRESIGNED_DOWNLOAD_TTL_SECONDS`: 비공개 PDF 다운로드 서명 URL 만료. 기본 900초다.
- `WORKSPACE_PURGE_OBJECT_STORAGE_DELETE_ENABLED`: version·delete marker·multipart를 포함한 영구 삭제
  adapter 안전장치. 기본값은 `false`이며 모든 저장소 실행기와 복구 rehearsal이 끝나기 전에는 바꾸지
  않는다. 현재 API·스케줄러에서도 호출하지 않는다.
- `WORKSPACE_PURGE_VECTOR_DELETE_ENABLED`: AI Worker 내부의 Experience·Study vector 영구 삭제
  안전장치. 기본값은 `false`이며 삭제 RPC·API·스케줄러가 없는 현재 단계에서는 바꾸지 않는다.
- `GRPC_WORKER_HOST`: API가 읽기 전용 vector inventory를 요청할 AI Worker 내부 주소. Compose는
  `static://backend-worker:9090`, Kubernetes는
  `static://self-intro-backend-worker:9090`을 사용한다.
- `workspaces/{workspaceId}/print-template/final-pdf/**` key는 저장소 adapter가 비공개 버킷으로
  라우팅한다. 다른 scope의 key를 최종 PDF에 연결하는 요청은 거부한다.
- 도메인과 서비스는 S3·OCI SDK를 직접 참조하지 않고 `ObjectStoragePort`만 사용한다. 현재 OCI와
  로컬 MinIO는 S3 호환 adapter를 쓰며 AWS S3·Azure Blob 교체 시 adapter만 교체한다.

운영 반영 전에는 비공개 버킷을 먼저 만들고 기존 공개 버킷의 최종 PDF object를 같은 key로 복사한
뒤 개수·checksum을 검증한다. DB의 `final_pdf_object_key`는 key만 저장하므로 key를 바꾸지 않는다.
복사 완료 전 새 backend를 배포하면 기존 PDF가 비공개 버킷에서 발견되지 않으므로 배포를 중단한다.
이관 후 공개 버킷의 `*/print-template/final-pdf/*` 원본 삭제는 백업·다운로드 검증 뒤 별도 승인 작업으로
수행한다. 현재 운영 버킷 생성·기존 object 이관은 수행하지 않았다.

## 3. 로컬 Docker Compose

### 기동

```bash
docker compose up -d
docker compose ps
```

기본 접속 위치:

- 제품 메인: `http://localhost:3000`
- Workspace 홈: `http://localhost:3000/workspace/{실제-workspace-slug}`
- 계정 로그인: `http://localhost:3000/login`
- 초대 가입: `http://localhost:3000/signup`
- 이메일 확인 메일함: `http://localhost:8025` (Mailpit, 로컬 전용)
- API·worker 통합 진입점: `http://localhost:8080`
- Grafana: `http://localhost:3001`
- MinIO Console: `http://localhost:9001`

### 변경 이미지 빌드

```bash
docker compose build backend backend-worker frontend-next
```

이미지를 빌드하는 것만으로 실행 중인 컨테이너는 교체되지 않는다. 교체가 필요한 검증에서는 대상
서비스를 명시해 `docker compose up -d backend backend-worker nginx`처럼 실행하고, DB·볼륨을
삭제하는 `down -v`는 사용하지 않는다.

### Docker Desktop 자원 기준과 안전한 정리

로컬 `frontend-next`는 `next dev --webpack`과 비활성화된 filesystem cache로 실행한다. 컨테이너
메모리 상한은 3 GiB, Node heap 상한은 2.25 GiB다. 관리 route의 최초 webpack compile이 짧게 2 GiB를
넘어 2 GiB hard limit에서 OOM 종료되는 것을 재현해 compile burst 여유만 조정했다. 장기 실행 시
Turbopack cache가 `.next` 익명
볼륨에 수 GiB씩 누적되고 `next-server` RSS도 함께 증가한 사례가 있어 Docker Compose 개발 환경에만
적용한 제한이다. production Dockerfile의 standalone build와 클라우드 배포 방식에는 영향을 주지 않는다.

용량 확인은 다음 명령을 사용한다.

```bash
docker stats --no-stream
docker system df
docker builder du
```

오래된 build cache와 사용하지 않는 image는 재빌드 가능한 자산이므로 기간 조건을 붙여 정리할 수 있다.
반면 `docker volume prune`, `docker compose down -v`는 MySQL·Oracle·NoSQL 등 실제 로컬 데이터를
삭제할 수 있으므로 사용하지 않는다. 프런트 캐시는 `self-intro_frontend_next_cache`와
`self-intro_frontend_node_modules`라는 명시적 Compose volume으로 관리한다. 초기화가 필요하면 컨테이너를
먼저 제거하고 이 두 volume만 정확히 지정해 삭제·재생성한다.

2026-08-11 점검 당시 전체 image 69.33 GB 중 57.27 GB, build cache 81.51 GB 중 대부분이 재생성
가능한 상태였고, 프런트 `.next` 7.1 GB 중 Turbopack cache가 6.4 GB였다. `next-server`는 6.26 GiB를
사용했다. 프런트 전용 `.next`·`node_modules` 익명 volume만 재생성하고 24시간보다 오래된 build cache와
미사용 image를 정리했다. 이어 연결 수가 0인 익명 volume을 읽기 전용으로 검사해 Next.js `.next/dev`
cache와 `node_modules`로 확인된 30개만 제거했다. 전체 회수량은 약 108 GB이고 Local Volumes는
34.32 GB에서 8.77 GB로 줄었다. 첫 페이지 compile 후 프런트 메모리는 약 767 MiB, `.next`는
31.9 MB였고 메인 페이지 HTTP 200을 확인했다. DB 구조가 확인된 미사용 익명 volume과 이름 있는 다른
프로젝트 volume은 삭제하지 않았다. 로컬 환경에만 적용했으며 운영에는 배포하지 않았다.

같은 날 `npm audit`에서 확인된 8건(High 6, Moderate 2)은 Next.js 16.3.0, Mermaid 11.16.1,
PostCSS 8.5.23 이상과 안전한 전이 의존성 갱신으로 0건이 됐다. `eslint-config-next`도 Next.js와 같은
16.3.0으로 정렬했다. Docker build 환경에서 production build·TypeScript·정적 페이지 생성을
완료했고, 갱신한 개발 컨테이너의 메인 페이지 HTTP 200과 backend health `UP`을 확인했다. 전체 lint는
기존 React hook 규칙 오류 18건과 warning 29건이 남아 별도 품질 작업으로 추적한다. 운영에는 배포하지
않았다.

### 안전한 롤링 순서

API 응답 계약이 바뀌면 다음 순서를 사용한다.

1. DB 백업과 migration 검증
2. 하위 호환 응답을 제공하는 backend 배포
3. worker 배포
4. frontend 배포
5. health와 로그인 흐름 확인

프론트를 먼저 교체하면 구버전 `/api/auth/me`에 `workspaces`가 없어 화면이 실패할 수 있다.
프론트에도 누락 필드를 빈 배열로 정규화하는 호환 처리를 추가했지만 backend 우선 순서를 유지한다.
Workspace 공개 페이지는 반드시 URL의 slug를 `/api/bff/workspaces/{workspaceSlug}/introduction`에
전달한다. 조회 실패 시 전역 `/api/bff/introduction`으로 폴백하지 않는다. 플랫폼 메인과 공통 헤더도
특정 사용자 Workspace slug를 하드코딩하지 않는다. 구버전 backend와의 호환성보다 Workspace 격리를
우선하며, frontend보다 Workspace BFF를 먼저 배포한다.
서버 렌더링 fetch 오류는 환경 중립 `lib/api/errors.ts`의 `ApiError`를 사용한다. `'use client'`
모듈의 클래스를 server component에서 생성하면 404 처리 중 런타임 경계 오류가 발생한다.

## 4. DB Migration

| 버전 | 내용                                                                                 |
| ---- | ------------------------------------------------------------------------------------ |
| V190 | 사용자, Workspace, Membership, 플랫폼 역할, 보안 감사 이벤트                         |
| V191 | 프로필 연락처 공개 여부 분리                                                         |
| V192 | 프로필·경력에 `workspace_id` 추가 및 기존 데이터 이관                                |
| V193 | 플랫폼 MFA 상태와 암호화 비밀키 컬럼                                                 |
| V194 | 이메일 가입·동의·확인 토큰·실명 인증 경계, Workspace public key·발행 상태·slug alias |
| V195 | 운영 초대 이름·수신 이메일·발송·폐기 메타데이터와 조회 인덱스                        |
| V196 | 기존 bootstrap Workspace의 역할 노출 slug를 무작위 provisional slug로 교체           |
| V197 | Study에 `workspace_id` 소유권·외래키·공개 목록 인덱스 추가                           |
| V198 | bootstrap Workspace 이름을 플랫폼 운영자 표시 이름·역할과 분리                       |
| V199 | 공통 Skill과 Workspace 표현값 분리, Competency Workspace 소유권 backfill             |
| V200 | Study slug·Tag·Study taxonomy curation을 Workspace 단위로 격리·backfill              |
| V201 | Portfolio Case Study·PrintTemplate에 Workspace 소유권·인덱스·기존 데이터 backfill    |
| V202 | LearningResource 공통 catalog와 Workspace 상태·메모·Tag overlay 분리·backfill        |
| V203 | JobPosting 공통 원본과 Workspace 지원 활동·상태 이력 overlay 분리·backfill           |
| V204 | StudyPlan Workspace 소유권·후보 우선순위 snapshot·기존 계획 backfill                 |
| V205 | 자기소개서 문항·답변을 Workspace 지원 건 자식으로 이관                               |
| V206 | Gap 문서를 Workspace 지원 건 자식으로 이관하고 지원별 version 제약 적용              |
| V207 | 기존 최종 PDF object key에 Workspace namespace 추가                                  |
| V208 | 온톨로지 Study 연결에 Workspace 소유권·복합 FK·Workspace별 unique 제약 추가          |
| V209 | 핵심 프로젝트 편성과 상세 경험이 같은 Experience인지 복합 FK로 강제                  |
| V210 | Workspace별 방문자 일·시간 집계 테이블과 Workspace 외래키·범위 unique 제약 추가      |
| V211 | Workspace 공개 revision·resource snapshot과 발행자·Workspace 외래키 추가             |
| V212 | 공개 revision 발행/복원 유형·복원 원본 번호와 retention 조회 index 추가              |
| V213 | Workspace canonical slug registry 활성화와 기존 Workspace·alias backfill             |
| V214 | Workspace 참여 초대 token·수명주기·Workspace/초대자 외래키와 조회 인덱스             |
| V215 | 가입·Workspace 초대 종결 시각과 retention 조회 인덱스                                |
| V216 | Workspace 폐쇄·삭제 유예 metadata                                                    |
| V217 | Workspace purge job·저장소 checkpoint                                                |
| V218 | 단일 활성 Workspace OWNER nullable guard·unique·check 제약                           |
| V219 | 활성 OWNER guard의 `NULL` 3값 논리 우회 차단                                         |
| V228 | Account 탈퇴 시각과 익명화 상태 추적                                                  |

Docker Compose MySQL에서 V190부터 V219까지 Flyway 적용을 확인했다. V210은 과거 플랫폼 방문 기록에
Workspace 식별자가 없어 데이터를 추정 backfill하지 않고 Workspace 집계를 0부터 시작한다. V208 적용 후 기존 링크 11개가
보존됐고 `workspace_id IS NULL`과 Study/Workspace 불일치는 모두 0건이며
`(study_id, workspace_id)` 복합 외래키가 생성됐다. 현재 로컬 DB에는 기존
StudyPlan이 없어 backfill 대상은 0개였고, 신규 `workspace_id`·후보 우선순위 snapshot schema와
worker `validate` 기동을 확인했다. 운영 적용 전에는 별도 백업본으로
동일한 migration과 rollback rehearsal을 수행해야 한다.

### V1 연락처 평문 제거와 checksum 전환

`V1__init_schema.sql`과 `seed_portfolio.sql`에는 실제 이메일·전화번호를 넣지 않는다. 새 환경은 빈
연락처로 시작하고, Workspace 소유자가 Profile 관리 화면에서 연락처를 저장한 뒤 `public_email`과
`public_phone`을 명시적으로 선택한다. 연락처는 Workspace 데이터이며 플랫폼 공통 seed나 환경변수의
기본값이 아니다.

기존 DB의 Profile 연락처 값은 이 source 정리만으로 수정하거나 삭제하지 않는다. 다만 이미 적용된 V1의
파일 내용이 바뀌므로 배포 전 다음 checksum 전환이 필요하다.

- 노출 값이 있던 기존 V1 checksum: `732351883`
- 연락처를 비운 현재 V1 checksum: `1137798604`
- 현재 로컬 DB에서 기존 checksum과 `success=1`을 확인했다.

운영 절차:

1. DB backup과 복구 가능 여부를 확인하고 API·Worker migration 실행을 중지한다.
2. `flyway_schema_history`에서 version `1`이 기존 checksum `732351883`, `success=1`인지 확인한다.
3. 다른 migration mismatch가 없음을 별도로 확인한다. 일반 `flyway repair`로 여러 checksum을 한꺼번에
   덮어쓰지 않는다.
4. version `1`·기존 checksum·`success=1`을 모두 WHERE 조건으로 사용해 checksum만 `1137798604`로
   변경한다. 영향 행이 정확히 1개가 아니면 rollback하고 배포를 중단한다.
5. 새 backend를 기동해 Flyway migrate·validate와 health를 확인한다. DB의 기존 연락처 값과 공개 여부는
   Profile 관리 정책에 따라 유지한다.

로컬 Compose에서는 기존 checksum을 조건으로 정확히 1행만 새 checksum으로 전환했다. 전환 전후 Profile의
이메일·전화번호 길이와 공개 플래그가 동일함을 확인했으며 값 자체는 로그에 출력하지 않았다. 현재 소스로
backend image를 다시 빌드·교체한 뒤 Flyway 검증을 통과하고 health가 `healthy`인 것을 확인했다. 수정된
V1은 격리된 일회성 MySQL schema에도 적용해 Profile 1건의 이메일·전화번호 길이가 모두 0임을 확인했고
검증 schema는 즉시 삭제했다.

현재 GitHub 원격 저장소는 공개 상태이며 과거 커밋에도 연락처가 남아 있다. 사용자는 2026-08-11 이 과거
노출을 그대로 두고 개발을 계속하기로 결정했다. 원격 비공개 전환, 이력 재작성, 강제 push와 clone
재동기화는 수행하지 않으며 출시 차단 조건으로도 두지 않는다. 다만 현재 branch와 이후 commit에는 같은
평문을 다시 넣지 않고, 연락처 변경은 Workspace Profile 데이터로만 관리한다.

### Workspace 공개 발행 운영

1. Workspace 관리 화면에서 저장한 Profile·Experience·Skill·Competency·Study·온톨로지 연결은 초안으로
   취급한다.
2. `공개 페이지 > 발행 관리`에서 `OWNER` 또는 `ADMIN`이 `첫 버전 발행`/`새 버전 발행`을 누르면
   `POST /api/workspaces/{slug}/publication/manage/publish`가 새 revision을 만든다.
3. 발행 트랜잭션이 완료되기 전에는 기존 공개 revision을 계속 제공한다. 실패 시 Workspace 상태와
   일부 resource가 섞이지 않도록 전체 트랜잭션을 롤백한다.
4. `POST .../unpublish`는 공개 URL을 즉시 404로 만들지만 revision은 삭제하지 않는다.
5. 기존 공개 Workspace의 초기 snapshot runner는 `app.publication.backfill-enabled`로 제어한다.
   revision이 없거나 최신 `schema_version`이 현재 코드보다 낮을 때만 새 호환 revision을 만든다. 운영
   migration 전 백업 clone에서 resource 수와 직렬화 성공을 먼저 확인한다.
6. `GET .../revisions`는 Membership이 있는 사용자에게 보존 중인 이력과 정책을 반환한다.
7. `OWNER` 또는 `ADMIN`은 `POST .../revisions/{revisionNumber}/rollback`으로 호환 가능한 과거 snapshot을
   복원한다. 복원은 선택한 resource를 복사한 새 revision이며 초안과 과거 revision을 수정하지 않는다.
8. 기본 보존 정책은 최근 20개와 최소 180일이다. `PUBLICATION_RETENTION_MAX_REVISIONS`와
   `PUBLICATION_RETENTION_MINIMUM_AGE`로 조정한다. 두 조건 중 하나라도 만족하면 보존하며, 정리는 다음
   발행·복원 시 실행된다. 값을 줄이기 전 백업 clone에서 삭제 대상 revision/resource 수를 확인한다.

schema version이 현재 코드와 다른 revision은 자동 변환기가 없으므로 UI와 API 모두 복원을 차단한다.
잘못 발행했지만 호환 가능한 이력이 없다면 공개 중지 후 초안을 수정해 새 revision을 발행한다.
revision/resource를 SQL로 직접 수정하거나 삭제하지 않는다.

### Workspace 공개 slug 변경 운영

1. `Workspace 설정 > 기본 설정`의 `공개 주소 관리`는 `OWNER` 또는 `ADMIN`에게만 표시한다.
2. 주소 변경 전 현재 비밀번호를 다시 확인한다. 재확인은 기본 10분 동안만 유효하다.
3. slug는 영문 소문자·숫자·하이픈 3~60자이며 예약어와 다른 Workspace의 canonical/alias는 거부한다.
4. 변경 성공 시 기존 canonical slug는 active alias로 전환하고 새 slug가 canonical이 된다. 공개 API는
   alias를 같은 발행 Workspace로 해석하고 공개 페이지는 하위 경로를 보존해 canonical URL로 308
   redirect한다.
5. 관리 API도 alias를 해석하지만 URL을 아는 것만으로 접근할 수 없다. 활성 Membership과 각 API 역할을
   매 요청 다시 검증하고, 다른 Workspace 사용자의 조회는 404로 숨긴다.
6. 변경은 `WORKSPACE_SLUG_CHANGED` 감사 이벤트로 남긴다. DB에서 `workspace.slug` 또는 alias 행을 직접
   수정하지 않는다.
7. 현재 버전은 링크 안정성을 위해 과거 alias를 자동 만료하지 않는다. 개인정보가 포함된 alias의 즉시
   폐기가 필요하면 DB를 직접 수정하지 말고 alias 폐기 API가 구현될 때까지 공개 중지와 보안 검토 절차를
   사용한다.

V200은 MySQL DDL의 implicit commit 특성 때문에 중간 실패 시 일부 `ALTER TABLE`이 남을 수 있다. 로컬
검증에서는 기존 curation unique index가 외래키 지원 index로 사용 중이어서 첫 적용이 실패했고,
`taxonomy_node_id` 전용 index를 먼저 만드는 순서로 migration을 수정했다. 실패 DB에서는 무조건
migration을 재실행하지 말고 `SHOW CREATE TABLE study/tag/study_taxonomy_curation`과 Flyway history를
확인한 뒤, 백업본 또는 검증된 복구 SQL로 부분 DDL을 원상복구하고 실패 history만 제거한다. 운영에서는
동일 장애를 직접 복구하지 말고 백업 clone에서 rehearsal을 통과한 migration만 반영한다.

## 5. 초대 가입과 첫 Workspace

현재 구현 흐름:

1. `/signup`에서 초대 코드, 이메일, 닉네임, 비밀번호, 동의를 제출한다.
2. 계정은 `PENDING_VERIFICATION`으로 생성된다.
3. 확인 토큰 원문은 저장하지 않고 SHA-256 hash와 만료시각만 DB에 저장한다.
4. 로컬에서는 SMTP를 통해 Mailpit으로 확인 메일을 보낸다.
5. 단일 사용 링크를 확인하면 계정이 `ACTIVE`가 된다.
6. 이메일로 로그인한 뒤 `/onboarding/workspace`에서 첫 Workspace 이름을 정한다.
7. UUID v4 `public_key`, `w-{20자 hex}` provisional slug, `PRIVATE` 상태로 Workspace를 만들고
   가입자를 `OWNER`로 연결한다.
8. 비공개 Workspace는 공개 BFF에서 404로 처리한다.

플랫폼 메인(`/`)에서는 데모와 실제 가입 흐름을 구분한다. 비로그인 사용자에게는 `로그인`과
`초대받아 가입하기`를 표시하고, 가입 CTA 옆에 초대제 운영 상태를 명시한다. 로그인 사용자는
첫 Membership의 `/workspace/{workspaceSlug}/manage`로 이동하는 `내 워크스페이스` CTA를 보며,
Workspace가 아직 없다면 `/onboarding/workspace`로 이동한다. 모바일 메뉴도 같은 정책을 사용한다.
이 프론트 분기는 편의를 위한 것이며 인증·Membership의 최종 판단은 백엔드가 수행한다.

로그인 직전의 `next`가 Workspace 관리 URL이라도 로그인한 계정이 해당 slug의 활성 Membership을
가지지 않으면 그 주소를 복원하지 않는다. 플랫폼 역할이 없고 Workspace가 0개인 신규 베타 계정은
항상 `/onboarding/workspace`로 이동한다. 오래된 Workspace URL을 직접 열어도 같은 규칙을 적용해
slug alias API를 불필요하게 호출하거나 `Workspace 확인 중...` 화면에 머물지 않게 한다.

공개 헤더에는 로그인 계정의 닉네임/이메일 식별자와 로그아웃 동작을 제공한다. 작은 화면에서는
Workspace·플랫폼 작업 버튼의 문구를 숨기고 아이콘과 `title`/접근성 이름을 유지한다. Workspace 관리
메뉴는 화면 높이 안에서 독립 스크롤하며, 일반 Workspace 메뉴와 `운영자 전용` 메뉴를 색상·문구로
구분한다. 플랫폼 전용 메뉴는 백엔드 권한과 별개로 일반 계정에는 렌더링하지 않는다.
일반 메뉴는 `Workspace 설정`, `내 기록`, `공개 페이지`, `지원·출력` 순서로 고정한다. Workspace 이름·
주소·폐쇄는 `기본 설정`에서 관리하고, 방문자에게 영향을 주는 새 버전 발행·공개 중지·발행 이력은
`공개 페이지 > 발행 관리`에서 별도로 관리한다. `내 기록`은
저장만으로 공개되지 않고, `공개 페이지`도 `OWNER`·`ADMIN`이 revision을 발행하기 전에는 방문자에게
반영되지 않는다. `지원·출력`은 공개 메인페이지와 별도다. 현재 범위와 공개 효과를 각 탭 상단에서
반복하지 않고 사이드바 그룹 제목의 도움말 버튼에서 어두운 툴팁으로 안내한다. 목록 화면은 자체
제목·설명만 표시한다.
플랫폼 전용 메뉴는 일반 메뉴 사이에 나누어 배치하지 않고 사이드바 맨 아래의 단일
`플랫폼 운영자 전용` 블록에 모은다. 블록 내부의 사용자·서비스 운영, 공통 데이터 운영, 시스템 정합성
소제목은 탐색을 위한 표시일 뿐 권한 경계를 새로 만들지 않는다.
펼친 사이드바의 일반 메뉴 그룹 사이에는 연한 slate 구분선을 두고, 도움말 툴팁은 아이콘 좌표가 아니라
사이드바 내부 폭을 기준으로 배치해 왼쪽·오른쪽 경계에서 잘리지 않게 한다.
사이드바에는 상단 Workspace 이름과 중복되는 별도 `Workspace 관리` 안내를 두지 않는다. 접기·펼치기
버튼은 스크롤 영역 경계 안에 배치하고, 메뉴 스크롤은 유지하되 브라우저 스크롤바 트랙은 숨겨 좁은
상태에서도 버튼 잘림이나 불필요한 세로선이 생기지 않게 한다. 사이드바는 화면 너비와 무관하게 관리
헤더 아래에 sticky로 고정하며, 접힌 상태의 펼치기 버튼도 사이드바 스크롤 영역 상단에 고정한다. 긴
운영자 메뉴나 본문을 아래까지 탐색해도 펼치기 버튼에 항상 접근할 수 있어야 한다.
관리 화면의 일반 설정·연락처 공개·중요 작업 재인증처럼 사용자가 오래 보는 큰 패널에는 연한
amber/yellow 배경을 사용하지 않는다. 기본 정보 패널은 slate 중립색, 보안 재인증 패널은 짙은 slate
배경과 흰색 동작 버튼을 사용한다. amber 계열은 만료·부분 장애 등 실제 상태를 구분하는 작은 배지와
아이콘에만 제한한다.
서비스 상태, 로그인 계정, 원본 링크·이미지, 지도 레이어처럼 다른 콘텐츠 위에 떠 있는 팝오버는
`slate-950` 배경, 밝은 텍스트, 진한 테두리와 shadow/ring을 사용한다. 트리거 버튼도 열린 상태에서
같은 어두운 색을 사용해 팝업의 열림 여부와 레이어 경계를 즉시 구분할 수 있게 한다.

로컬 기본 초대 코드는 Compose의 `LOCAL_REGISTRATION_INVITATION_CODE`로만 제공한다. 기본값은 개발
편의를 위한 값이며 운영에 사용하지 않는다. 운영에서는 만료·횟수·발급자를 기록하는 플랫폼 운영
흐름으로만 초대를 생성해야 한다.

필수 환경변수와 설정:

| 값                                        | 역할                     | 운영 원칙                 |
| ----------------------------------------- | ------------------------ | ------------------------- |
| `REGISTRATION_EMAIL_ENABLED`              | 가입 메일 adapter 활성화 | SMTP 설정 완료 전 `false` |
| `REGISTRATION_EMAIL_FROM`                 | 발신 주소                | 검증된 발신 도메인 사용   |
| `REGISTRATION_VERIFICATION_BASE_URL`      | 확인 링크 base URL       | 운영 HTTPS 주소 사용      |
| `REGISTRATION_EMAIL_TOKEN_VALID_FOR`      | 확인 토큰 만료           | 기본 30분                 |
| `REGISTRATION_INVITATION_SIGNUP_BASE_URL` | 초대 메일 가입 링크      | 운영 HTTPS `/signup` 주소 |
| `WORKSPACE_INVITATION_ACCEPT_BASE_URL`    | Workspace 참여 수락 링크 | 운영 HTTPS 주소 사용      |
| `REGISTRATION_TERMS_VERSION`              | 이용약관 동의 버전       | 문서 배포 버전과 일치     |
| `REGISTRATION_PRIVACY_VERSION`            | 개인정보 동의 버전       | 문서 배포 버전과 일치     |
| `REGISTRATION_MARKETING_VERSION`          | 마케팅 수신 동의 버전    | 별도 선택동의 버전 기록   |
| `LOCAL_REGISTRATION_INVITATION_ENABLED`   | 로컬 invite bootstrap    | 운영에서는 반드시 `false` |
| `LOCAL_REGISTRATION_INVITATION_CODE`      | 로컬 테스트 초대 코드    | 운영 Secret으로 사용 금지 |

가입 비밀번호는 10~32자이며 영문 대문자·소문자·숫자·특수문자를 각각 하나 이상 포함하고 공백을 허용하지
않는다. 대소문자를 정규화한 로컬 취약 비밀번호 blocklist도 적용한다. 프론트의 실시간 조건 표시는 안내일
뿐이며 백엔드가 동일한 조합 조건, blocklist와 BCrypt 72바이트 상한을 최종 검증한다. 비밀번호 확인 값은
서버로 전송하지 않는다. 외부 유출 비밀번호 조회 API는 가입 가용성과 개인정보 경계를 외부 provider에
의존시키므로 현재 비공개 베타 범위에서는 사용하지 않는다.

가입 화면의 이용약관·개인정보 수집·이용·마케팅 수신 동의는 각각 `/policies/terms`,
`/policies/privacy`, `/policies/marketing` 상세 페이지와 연결한다. 필수·선택을 분리하고 동의 버전을
각각 보존한다. 현재 `2026-08-12-draft` 문서는 로컬 비공개 베타 초안이다. 정식 배포 전에 운영 주체,
개인정보 보호책임자/문의처, 실제 보존기간, 처리위탁·국외이전, 파기 절차, 광고 발신자·수신거부 절차를
확정하고 법률 검토를 거쳐 버전을 올린다. 초안 표시가 남아 있는 상태로 공개 가입을 열지 않는다.

정책 문구를 확정할 때는 개인정보 수집·이용 목적, 항목, 보유기간, 거부 권리와 불이익을 알리도록 한
[개인정보 보호법 제15조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029334809),
동의 사항과 홍보·판매 권유 동의를 구분하도록 한
[개인정보 보호법 제22조](https://law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1022694673),
[개인정보보호위원회 2026 처리방침 작성지침 개정 안내](https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS061&mCode=C010010000&nttId=11977),
광고성 정보의 사전 동의·철회·정기 확인을 규정하는
[정보통신망법 제50조](https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1025057393)의
최신 시행 내용을 다시 검토한다.

메일 provider가 비활성화된 환경에서는 가입 트랜잭션을 503으로 실패시켜 확인 불가능한 계정을 남기지
않는다. 가입·로그인 요청 제한은
Redis의 IP HMAC·사용자 식별자 HMAC별 고정 시간창 카운터로 구현했다. Compose/운영에서는
`AUTH_RATE_LIMIT_ENABLED=true`를 명시하고, Redis 장애 시 보호를 우회하지 않고 503으로 차단한다.
초과 요청은 429와 `Retry-After`를 반환하고 `AUTH_RATE_LIMITED/DENIED` 감사 이벤트를 남긴다.

DB 복원·사용자 삭제처럼 계정 테이블의 식별자가 바뀌는 작업 뒤에는 기존 Redis 인증 세션을 그대로
신뢰하지 않는다. `/api/auth/me`는 세션의 사용자 ID가 현재 활성 계정과 일치하지 않으면 해당 세션을
무효화하고 401을 반환한다. 운영자는 복원 직후 전체 세션 로그아웃을 수행하고, 사용자는 다시 로그인한
뒤 온보딩을 재개한다. Workspace 생성 API도 같은 불일치를 500이 아닌 401로 처리해야 한다.

### 플랫폼 운영자의 초대 관리

1. 플랫폼 계정으로 로그인하고 MFA를 완료한다.
2. `/workspace/{slug}/manage`의 `플랫폼 운영자 전용 > 비공개 베타 초대`에서 발급 현황을 확인한다. `/ops`로
   들어오면 이 탭으로 이동한다. 수신 이메일은 목록에서 마스킹된다.
3. 발급·폐기·교체 발송 전 운영자 비밀번호를 재확인한다. 승인은 기본 10분간 유효하다.
4. 개인 초대는 수신 이메일을 입력하고 1회용으로 발급한다. 메일 발송을 선택하면 초대 링크가 바로
   발송된다.
5. 공용 초대는 이메일을 비우고 1~~100회의 사용 횟수와 1시간~~30일의 유효기간을 지정한다.
6. 수동 전달용 공용 초대만 발급 응답에서 원문 코드와 링크를 그 순간에 표시한다. 이메일 지정 초대는
   원문을 메일로만 보내고 운영 화면 응답에는 포함하지 않는다. DB에는 SHA-256 hash만 저장하므로 다시
   조회할 수 없다.
7. 잘못 발급한 초대는 즉시 폐기한다. 개인 초대의 `교체 발송`은 기존 활성 링크를 폐기하고 새로운
   원문으로 다시 발급한다.

초대 링크는 `/signup#invite=...` 형식을 사용한다. `#` 뒤 fragment는 브라우저가 서버로 전송하지 않아
reverse proxy·애플리케이션 access log에 원문 초대 코드가 남지 않는다. 가입 화면은 코드를 입력란으로
옮긴 직후 주소에서 fragment를 제거한다. 운영자는 이메일, 티켓, 화면 캡처에도 원문 링크를 남기지 않는다.
이메일 확인 링크도 `/signup/verify#token=...` fragment를 사용하고 화면이 token을 읽은 즉시 주소에서
제거한다. query string에는 초대·확인 token을 넣지 않는다.

### 운영자이면서 베타테스터인 경우

같은 계정에 플랫폼 역할과 개인 Workspace Membership을 함께 둘 수 있지만 권한은 합쳐서 판단하지 않는다.

- `플랫폼 운영자 전용` → 같은 `/workspace/{slug}/manage` 셸: 플랫폼 역할로 초대·통계·후원을 관리한다.
- `내 워크스페이스` → `/workspace/{slug}/manage`: 해당 Workspace Membership으로 자신의 이력을 관리한다.
- 플랫폼 메인 헤더는 두 링크를 동시에 노출한다. `/ops` 진입 가능 여부와 Workspace 접근 가능 여부는
  각각 별도로 검증한다.
- 테스트할 때는 먼저 운영자 관점에서 개인 초대를 발급하고, 별도 브라우저 프로필 또는 시크릿 창에서
  베타테스터 관점의 가입·이메일 확인·Workspace 생성을 수행한다. 운영자 세션으로 가입 링크를 열어
  역할 경계를 흐리지 않는다.

초대 생성·폐기·교체는 `security_audit_event`에 각각 `INVITATION_ISSUED`, `INVITATION_REVOKED`,
`INVITATION_REPLACED`로 기록한다. 개인 초대의 이메일 원문은 초대 테이블에 저장되지만 사용·폐기·만료
뒤 기본 30일만 보존한다. 사용되었거나 만료된 이메일 확인 token도 같은 기준으로 제거한다. 매일
03:30(Asia/Seoul)에 한 유형당 최대 500건을 삭제하며 운영 환경에서는
`INVITATION_RETENTION_*`으로 기간·건수·시각을 조정한다. 삭제 뒤에는 초대 이력을 복구할 수 없다.

### Workspace 멤버·역할 관리

플랫폼 가입 초대와 Workspace 참여 초대는 목적과 저장소가 다르다. 비공개 베타 신규 사용자는 먼저
플랫폼 운영자가 `/ops`에서 가입 초대를 보내 가입·이메일 확인을 끝낸다. 그 다음 특정 Workspace에 함께
참여시킬 때만 해당 Workspace의 `멤버·역할 관리`를 사용한다.

1. Workspace `OWNER` 또는 `ADMIN`으로 `/workspace/{slug}/manage?tab=MEMBERS`를 연다.
2. 현재 비밀번호를 재확인한다. 초대·취소·역할·제거·소유권 mutation에는 최근 10분 재인증이 필요하다.
3. 이미 이메일 확인을 끝낸 활성 플랫폼 계정의 이메일과 역할을 입력한다. `OWNER`는 `ADMIN`·`EDITOR`·
   `VIEWER`를, `ADMIN`은 `EDITOR`·`VIEWER`만 초대할 수 있다.
4. 수신자는 `/workspace-invitations#invite=...` 메일 링크를 열고 같은 이메일의 계정으로 로그인해 직접
   수락하거나 거절한다. 수락 전에는 Membership이나 데이터 접근 권한이 생기지 않는다. fragment
   원문은 `sessionStorage`에만 잠시 보존하고 처리 뒤 제거한다. 거절하면 권한은 생기지 않으며 다시
   참여하려면 새 초대를 발급해야 한다.
5. 잘못 보낸 `PENDING` 초대는 즉시 취소한다. 같은 이메일로 다시 보내면 기존 사용 가능한 초대를
   폐기하고 새 토큰을 발급한다.
6. 역할 변경·멤버 제거는 대상 Workspace row lock 안에서 처리한다. `ADMIN`은 다른 `ADMIN`·`OWNER`를
   변경하지 못한다. OWNER는 제거·직접 강등할 수 없으며 자기 자신 제거도 허용하지 않는다.
7. 소유권 이전은 `OWNER`만 수행한다. 대상은 즉시 `OWNER`, 기존 OWNER는 `ADMIN`이 되는 단일
   transaction이므로 OWNER가 없는 중간 상태가 없다.
8. 수락·거절은 token으로 Workspace ID만 찾은 뒤 Workspace row와 초대 row를 같은 순서로 잠근다. 같은
   token을 동시에 처리해도 하나의 요청만 상태를 변경하며, 폐쇄된 Workspace에서는 수락할 수 없다.
9. V218의 nullable owner guard는 활성 OWNER 행에만 Workspace ID를 기록한다. `UNIQUE`는 복수 활성
   OWNER를 차단하고 `CHECK`는 역할·상태와 guard의 불일치를 차단한다. 배포 전에는 Workspace별 활성
   OWNER 수가 1이 아닌 행이 없는지 먼저 확인한다.

초대 token은 DB에 SHA-256 hash로만 저장한다. 목록의 이메일은 마스킹하며 감사 이벤트는
`WORKSPACE_MEMBER_INVITED`, `WORKSPACE_MEMBER_INVITATION_REVOKED`,
`WORKSPACE_MEMBER_INVITATION_DECLINED`, `WORKSPACE_MEMBER_JOINED`,
`WORKSPACE_MEMBER_ROLE_CHANGED`, `WORKSPACE_MEMBER_REMOVED`, `WORKSPACE_OWNERSHIP_TRANSFERRED`를
기록하되 이메일 원문은 target에 넣지 않는다. 현재 메일은 기존 SMTP adapter를 공유하지만 데이터 모델은
provider 중립이며 OCI·AWS·Azure 교체와 무관하다. `PENDING` 만료 시점과 `ACCEPTED`·`REVOKED`·
`DECLINED` 종결 시점부터 기본 30일 뒤 같은 bounded cleanup job이 원문 이메일을 포함한 초대 row를
삭제한다. 감사 이벤트에는 원문 이메일·token을 기록하지 않는다.

### Workspace 이름 변경·탈퇴·폐쇄

`Workspace 설정 > 기본 설정`의 `이름·탈퇴·폐쇄`에서 수행한다. 세 작업 모두 최근 10분 이내 비밀번호 재확인이
필요하다.

1. `OWNER`·`ADMIN`은 Workspace 표시 이름을 2~120자로 변경할 수 있다. 공개 slug는 바뀌지 않으며
   `WORKSPACE_RENAMED` 감사 이벤트를 남긴다.
2. `ADMIN`·`EDITOR`·`VIEWER`는 스스로 탈퇴할 수 있다. Membership만 `SUSPENDED`가 되고 Workspace
   콘텐츠는 유지된다. 다시 참여하려면 새 초대가 필요하다.
3. `OWNER`는 바로 탈퇴할 수 없다. 계속 운영할 Workspace면 먼저 다른 활성 멤버에게 소유권을 이전한다.
4. Workspace 자체를 종료하려면 OWNER가 현재 Workspace 이름을 정확히 입력하고 폐쇄한다. 같은
   transaction에서 상태를 `DELETED`, 발행 상태를 `PRIVATE`로 바꾸고 모든 활성 Membership을 중지하며
   사용 가능한 참여 초대를 폐기한다. 이후 공개·관리 주소는 모두 404다.
5. 폐쇄 시 `deleted_at`, 요청자, 기본 30일 뒤 `purge_after`를 기록한다. 이 값은
   `WORKSPACE_DELETION_GRACE_PERIOD`로 조정한다.

Lifecycle mutation은 권한 확인 전에 Workspace row를 잠그고 잠금 획득 뒤에도 상태가 `ACTIVE`인지 다시
확인한다. 따라서 접근 정책 확인 직후 다른 요청이 Workspace를 폐쇄했거나, 이미 폐쇄된 Workspace의 stale
Membership을 직접 사용하더라도 이름 변경·탈퇴·중복 폐쇄는 모두 404로 종료된다. purge schedule은
Workspace별 job 1개와 저장소별 checkpoint 1개라는 DB 유일 제약을 가지며 재호출 시 기존 row를 재사용한다.

현재 비공개 베타에서 **폐쇄는 물리 삭제 완료가 아니다.** 기존에 기록한 138은 코드 검색 참조 수이며
실제 V217 적용 전 MySQL `workspace_id` 테이블은 20개다. V217은 폐쇄 transaction에서
`workspace_purge_job`과 MySQL·Object Storage·Oracle Vector·Oracle NoSQL·Redis checkpoint를 만들고,
`GET /api/ops/workspace-purge-jobs`와 최근 재인증이 필요한
`POST /api/ops/workspace-purge-jobs/{jobId}/dry-run`으로 후보와 blocker를 확인하게 한다. V217 뒤
MySQL inventory는 purge job을 포함해 21개다. manifest와 실스키마가 다르면 dry-run은
`MYSQL_SCHEMA_INVENTORY_DRIFT`로 실패한다.

현재 dry-run은 후보 수를 세되 개별 삭제 flag가 false인 저장소는 `BLOCKED`로 유지한다. Object Storage checkpoint는
`workspaces/{workspaceId}/` 형식의 좁은 prefix만 허용하고 공개·비공개 버킷의 현재 object·이전 version·
delete marker·미완료 multipart와 bytes를 조회한다. object key나 provider 오류 원문은 응답·checkpoint·
감사 이벤트에 남기지 않는다. MinIO의 slash-terminated multipart prefix 호환 문제 때문에 multipart만
버킷 전체 목록을 페이지 단위로 조회하고 메모리에서 Workspace prefix를 필터링한다. version-aware
object 삭제 adapter는 구현했지만 `WORKSPACE_PURGE_OBJECT_STORAGE_DELETE_ENABLED=false`가 기본이다.
Oracle Vector도 경험·Study count와 기본 비활성 delete adapter를
구현했으며 API는 AI Worker의 읽기 전용 inventory gRPC만 호출한다. 삭제는
`WORKSPACE_PURGE_VECTOR_DELETE_ENABLED=false`가 기본이고 삭제 RPC·API에는 노출하지 않았다. 캐시
또한 code-owned registry와 SCAN/UNLINK adapter를 구현했지만
`WORKSPACE_PURGE_CACHE_DELETE_ENABLED=false`이다. Oracle NoSQL은 새 기본 테이블
`JobPostingCatalogReadModel`에 공통 채용공고 필드만 투영하며 Workspace·사용자·매칭 필드를 허용하지 않는다.
dry-run은 실제 table schema를 allowlist로 검증하고, 기존 `JobPostingReadModel`에 개인화 가능 행이 1개라도
남아 있으면 `NOSQL_LEGACY_PERSONALIZATION_PRESENT`로 차단한다. 새 catalog schema가 맞고 레거시 행이 0건이면
Workspace 삭제 후보 0건의 `READY`로 제외한다. 로컬 KVLite에서는 새 schema와 레거시 0건을 실제 검증했다.
MySQL adapter는 live schema의 Workspace 테이블 manifest와 직접 FK 규칙을 검사한다. 참여 초대의
`NO ACTION` FK row를 먼저 삭제하고, Workspace 감사 이벤트의 actor·Workspace·target·request·IP 연결값을
`NULL`로 가명화한 다음 Workspace를 삭제해 18개 직접 자식을 cascade한다. purge 제어 row는 증적으로
보존하고 재실행은 0건 성공으로 처리한다. `WORKSPACE_PURGE_MYSQL_DELETE_ENABLED=false`가 기본이다.

AI Worker의 오케스트레이터는 NoSQL 공통 catalog 제외 확인 → Object Storage → Oracle Vector →
Redis → MySQL 순으로만 실행한다. job row를 pessimistic lock으로 claim하지만 provider 호출 중에
DB transaction은 열어 두지 않는다. 완료 checkpoint는 skip하고 실패 지점부터 재개하며, 기본
2시간 이상 갱신되지 않은 `PURGING`은 재claim한다. 저장소 실행 전 lease를 갱신하고 claim
시도 번호를 fencing token으로 검증해 이전 Worker의 느린 commit을 차단한다. 첫 외부 삭제 전에 MySQL schema·폐쇄·
유예 상태를 다시 확인하고, NoSQL 제외 시점에 catalog schema와 레거시 개인화 0건을 재검증한다.
파괴적 API·gRPC는 없다.

현재 Compose와 운영 manifest는 `WORKSPACE_PURGE_EXECUTION_ENABLED=false`와 네 provider 삭제 flag를
모두 false로 유지한다. 로컬 logical backup clone과 격리 provider fixture를 사용한 전체 purge
rehearsal은 통과했지만, 운영 backup 보존·복구와 OCI provider rehearsal을 통과한 뒤에만 개별 flag를
먼저 설정하고 마지막에 전체 실행 flag를 검토한다. 운영자는
폐쇄 Workspace의 DB row를 수동 삭제하지 않는다. 복구 또는 즉시 삭제 요청은 별도 운영 이슈로 기록하고
원본 이메일·개인정보를 일반 로그에 남기지 않는다.

로컬 전체 rehearsal은 저장소 루트에서 `./scripts/rehearse-workspace-purge-compose.sh`로 실행한다.
스크립트는 원본 DB를 수정하지 않고 mode 600 임시 dump를 `/private/tmp`에 만들며, 고유 clone DB와
고유 MinIO bucket, Redis DB 15만 사용한다. source/clone의 table·Flyway·Workspace 수가 다르면 삭제
테스트 전에 중단한다. 성공 기준은 5개 checkpoint 완료, 대상 MySQL·Object Storage·Vector·Cache
잔여 0건, 감사 연결값 가명화, 무관한 Redis sentinel 보존과 두 번째 실행 false다. 성공·실패와 무관하게
trap이 clone DB·Redis DB 15·임시 dump를 정리하며, 실행 뒤 clone schema 수와 Redis DB 15 크기가
각각 0인지 다시 확인한다. dump에는 개인정보가 포함될 수 있으므로 내용을 출력·복사·commit하지 않는다.

production purge 설정은 `scripts/check-workspace-purge-release-gate.sh`를 통과해야 한다. production
overlay에 삭제 유예 `30d`를 명시했고, 다섯 flag가 모두 false인 현재 상태는 증적 파일 없이 통과한다.
하나라도 true로 바꾸면 Secret·실명 없이 작성한 `deploy/recovery/workspace-purge-approval.env`와 유효한
복구 증적이 필요하다. MySQL/Object backup 보존기간은 삭제 유예 이하여야 하며, 전체 실행 flag는 네
provider flag가 모두 true일 때만 허용한다. GitHub의 `Workspace Purge Release Gate`를 main branch의
required check로 지정하기 전에는 workflow가 실패를 표시할 뿐 merge 자체를 강제 차단하지 못한다.

복원 reconciliation을 위해 장기 실행 production Deployment의 flag를 직접 켜지 않는다. 외부 Service가
선택하지 않는 격리 Worker를 `APP_RUNTIME_ROLE=worker`, `MAINTENANCE_MODE=true`,
`WORKSPACE_RESTORE_RECONCILIATION_ENABLED=true`, `WORKSPACE_PURGE_EXECUTION_ENABLED=false`로
실행하고 blocker 0과 저장소 dry-run을 확인한 뒤 종료한다. API는 `APP_RUNTIME_ROLE=api`이므로 purge
scheduler와 reconciliation runner bean이 생성되지 않는다. runner는 누락된 purge job/checkpoint,
복원된 활성 Membership·초대, 중단된 `PURGING` lease처럼 의미가 확정적인 상태만 수리한다. 활성
Workspace와 purge job의 공존이나 terminal job 뒤 남은 Workspace처럼 모호한 모순은 자동 수정하지 않고
fail-closed한다. 삭제 flag가 꺼져 생기는 예상 blocker만 허용하며 schema/provider inventory blocker와
개인정보·object key·provider 오류 원문은 로그로 내보내지 않는다.

일반 Workspace 사용자는 Profile·Experience·Study·Skill·Competency·Portfolio·LearningResource·
StudyPlan의 canonical 관리 API를 사용할 수 있다. 그 외 기존 관리 도메인이 명시적인 Workspace context와 `WorkspaceAccessPolicy`를 적용하기
전에는 POST·PUT·PATCH·DELETE API를 플랫폼 `ROLE_ADMIN`으로 제한한다. 공개 GET, 인증 흐름, 첫
Workspace 생성만 명시적으로 예외 처리한다.

## 6. 인증과 권한

### 역할

- Workspace: `OWNER`, `ADMIN`, `EDITOR`, `VIEWER`
- 플랫폼: `PLATFORM_OWNER`, `PLATFORM_OPERATOR`, `SUPPORT`

플랫폼 역할이 있다는 이유만으로 다른 Workspace의 개인정보를 열람할 수 없다. 플랫폼 운영자도
자신의 개인 Workspace에는 별도의 `OWNER` Membership을 가진다.

### 세션 정책

| 대상                  | 비활성 만료 | 최대 동시 세션 |
| --------------------- | ----------: | -------------: |
| 일반 Workspace 사용자 |      12시간 |            5개 |
| 플랫폼 운영자         |        30분 |            2개 |

로그인 시 세션 ID를 교체한다. 전체 기기 로그아웃은 Redis에서 동일 principal의 세션을 모두
삭제하고 현재 세션도 무효화한다.

### 중요 작업 재인증

비밀번호 재확인 성공 시각을 세션에 기록하며 기본 유효시간은 10분이다. 역할 변경, 개인정보
내보내기, 사용자 정보 열람 API가 구현되면 이 정책을 반드시 적용한다. 현재 초대 발급·폐기·교체
발송에 이 정책을 적용했으며, 초대 목록은 수신 이메일을 마스킹해 제공한다.

로그인 성공 시각과 로그인 뒤 `/api/auth/reauthenticate`를 호출해 비밀번호를 다시 확인한 시각은 별도로
기록한다. 계정 탈퇴는 후자의 명시적 재인증 시각만 인정하므로 로그인 직후라도 재확인 없이 탈퇴할 수
없다. 화면에서만 재확인을 요구하지 말고 서버의 `requireExplicitRecent` 경계를 유지한다.

### 계정 탈퇴 운영 절차

1. 사용자는 계정 메뉴의 `계정 설정`에서 탈퇴 가능 상태를 확인한다.
2. 활성 Workspace `OWNER`이면 소유권을 이전하거나 해당 Workspace를 먼저 폐쇄한다. 플랫폼 역할이
   있으면 운영 절차로 역할을 회수한다. 둘 중 하나라도 남으면 서버는 `409`로 탈퇴를 거부한다.
3. 현재 비밀번호로 재인증하고 10분 안에 확인 문구 `계정 탈퇴`를 정확히 입력한다.
4. 성공하면 활성 Membership 중 OWNER가 아닌 항목은 `SUSPENDED`가 되고 Account의 직접 식별 정보,
   인증 token, MFA secret·복구 코드는 제거된다. 수신 이메일이 같은 대기 Workspace 초대는 폐기·익명화된다.
5. 모든 기기 세션이 무효화되므로 다시 로그인되지 않는지 확인한다. Workspace 원본·파생 데이터는
   Account 탈퇴 대상이 아니며 Workspace 폐쇄·purge 절차에서만 제거한다.

운영자는 `ACCOUNT_WITHDRAWN` 감사 이벤트와 `app_user.withdrawn_at`만으로 완료 여부를 확인한다.
로그나 고객 지원 화면에서 탈퇴 전 이메일·로그인 ID를 복원하거나 출력하지 않는다. 실제 보존 기간과
법적 삭제 요청 절차가 정해지기 전에는 익명 Account 행과 감사·동의·purge 이력을 임의로 물리 삭제하지
않는다.

## 7. 플랫폼 MFA

### 사용자 흐름

1. 플랫폼 계정이 비밀번호로 로그인한다.
2. MFA 미등록 계정에는 `ROLE_ADMIN` 대신 등록 전용 제한 권한만 부여한다.
3. 로그인 후 `/ops` 호환 주소를 거쳐 첫 Workspace의 관리 셸로 이동하며 MFA 미등록 상태라면 등록
   화면을 표시한다.
4. QR 코드를 인증 앱으로 스캔한다. QR 스캔이 불가능할 때만 설정 키 복사·수동 입력을 사용한다.
5. 인증 앱의 6자리 TOTP로 등록을 확인한다.
6. 서버가 TOTP 비밀키를 AES-256-GCM으로 암호화해 저장한다.
7. 확인 즉시 모든 기기에서 로그아웃한다.
8. 이후 로그인 화면에서 먼저 이메일·아이디와 비밀번호를 확인한다. MFA 대상이면 아직 인증 세션을
   발급하지 않고 별도 2단계 화면으로 이동한다.
9. 두 번째 화면에서 TOTP가 검증된 뒤에만 SecurityContext와 권한 있는 세션을 저장한다. 로그인 성공 후
   플랫폼 계정은 `/ops`, 일반 Workspace 계정은 자신의 첫 Workspace 관리 화면으로 자동 이동한다.

커스텀 로그인 endpoint는 인증 성공 후 SecurityContext를 저장하기 전에 기존 session ID를 명시적으로
회전한다. MFA 등록 시작·확인은 최근 10분 이내 비밀번호 재확인이 필요하다. 이미 MFA가 활성화된 계정은
일반 등록 endpoint에서 secret을 교체할 수 없으며 아래 복구 코드 기반 재등록 절차만 사용할 수 있다.
서비스 계층 인증·인가 실패는 원문 예외를 노출하지 않는 401·403으로 변환한다.

감사 로그의 `LOGIN_SUCCESS`는 비밀번호 확인 시점이 아니라 필요한 TOTP와 세션 context 저장까지 끝난
뒤에만 생성한다. 비밀번호 확인 뒤 MFA 입력을 기다리는 상태는 `LOGIN_MFA_REQUIRED/SUCCESS`로 기록하되
SecurityContext나 세션을 만들지 않는다. 제출한 TOTP가 틀리면 `LOGIN_FAILURE/MFA_REJECTED`이며,
재인증과 MFA 등록 시작·완료·실패는 별도 이벤트 유형으로 구분한다. username·비밀번호·TOTP·예외
메시지는 감사 payload에 포함하지 않는다.

로그인 route는 `/login` 하나만 사용한다. 인증이 필요한 화면은 안전하게 검증한 내부 경로를
`/login?next=...`로 전달하며 역할 이름이 포함된 별도 로그인 route를 만들지 않는다.

설정 키 또는 QR 코드가 화면 캡처·메시지 등에 노출됐다면 등록을 완료하지 말고 `설정 키 새로 만들기`를
눌러 기존 pending secret을 교체한다.

### 필수 Secret

```text
MFA_ENCRYPTION_KEY=<Base64로 인코딩한 랜덤 32바이트 키>
```

- 운영 키를 Git, ConfigMap, 이미지, 문서에 기록하지 않는다.
- 운영에서는 SealedSecret 또는 외부 Secret Provider로 주입한다.
- 키가 비어 있거나 32바이트가 아니면 MFA 등록을 거부한다.
- 로컬 Compose의 고정 키는 개발 전용이며 운영에서 사용하면 안 된다.
- 암호화 키를 잃으면 기존 TOTP 비밀키를 복호화할 수 없다.

MFA 등록 완료 시 10개의 복구 코드를 한 번만 평문으로 표시한다. DB에는 정규화된 코드의 SHA-256
해시만 저장하며 로그인에서 사용한 코드는 비관적 잠금 안에서 즉시 소비한다. 새 복구 코드 묶음을
발급하면 이전 묶음은 전부 폐기해야 한다. 복구 코드 사용은 인증 감사 로그에 남긴다.

### 인증 앱 분실 시 복구 코드 기반 재등록

1. 사용자는 평소와 동일하게 아이디·비밀번호를 확인한 뒤 TOTP 입력 단계에 사용하지 않은 복구 코드
   하나를 입력한다. 서버는 코드를 즉시 1회 소비한다.
2. 인증된 서버 세션에만 `MFA_RECOVERY_AUTHENTICATED_AT` 표식을 남긴다. 기본 유효시간은 15분이며
   `MFA_RECOVERY_SESSION_VALID_FOR`로 조정한다.
3. 이 세션은 일반 관리 화면으로 진행하지 않고 MFA 복구 화면을 강제로 표시한다. 서버 보안 필터도
   계정 확인·재인증·복구 재등록·로그아웃 이외의 API를 `403`으로 차단하므로 화면 URL이나 API를
   직접 호출해 우회할 수 없다. 사용자가 현재 비밀번호를 명시적으로 다시 확인해야 새 설정 키 발급을
   시작할 수 있다.
4. 새 QR·설정 키를 만든 시점에는 기존 암호화 secret과 기존 복구 코드 묶음을 유지한다. 새 인증 앱의
   6자리 TOTP가 검증된 경우에만 새 secret 암호문과 새 복구 코드 10개를 같은 DB 트랜잭션에서 교체한다.
5. 완료 후 모든 기기 세션을 무효화하고 새 TOTP로 다시 로그인한다. 새 복구 코드는 한 번만 표시한다.
6. 15분이 만료되면 남아 있는 복구 코드로 다시 시작해야 한다. 인증 앱과 모든 복구 코드를 함께
   잃은 계정은 이 사용자 주도 흐름으로 복구하지 않으며, 별도 신원 확인 운영 절차가 준비되기 전에는
   DB의 `mfa_enabled`나 secret을 수동 수정하지 않는다.

감사 이벤트는 `MFA_RECOVERY_CODE_CONSUMED`, `MFA_RECOVERY_REENROLLMENT_STARTED`,
`MFA_RECOVERY_REENROLLMENT_COMPLETED`, `MFA_RECOVERY_REENROLLMENT_FAILURE`로 구분한다. 비밀번호,
TOTP, 복구 코드, secret 원문은 감사 payload나 일반 애플리케이션 로그에 포함하지 않는다.

2026-08-13 로컬 검증에서는 MFA 서비스·복구 코드·복구 세션 차단 필터 테스트와 core Spotless를
통과했다. API bootJar를 다시 생성하고 Compose의 backend를 재빌드했으며, backend health `UP`와
비인증 `/api/auth/me`의 `401`을 확인했다. 실제 복구 코드는 1회 소비되므로 운영자 계정의 남은 코드를
자동 검증에 사용하지 않는다. 운영자는 아래 인수 절차를 disposable 계정 또는 폐기 가능한 코드로
직접 확인한다.

## 8. 이상 접속 감사

로그인 당시 다음 값을 HMAC-SHA256 fingerprint로 세션에 저장한다.

- 요청 IP
- User-Agent와 Accept-Language 조합

원문 IP와 User-Agent는 보안 감사 테이블에 저장하지 않는다. 같은 세션에서 fingerprint가 바뀌면
`LOGIN_CONTEXT_ANOMALY` 이벤트를 남긴다. 모바일 네트워크, VPN, 브라우저 업데이트의 오탐을
고려해 현재는 자동 로그아웃이나 계정 잠금을 하지 않는다.

## 9. 공개 데이터와 파일

- 연락처는 `publicEmail`, `publicPhone`이 명시된 경우에만 공개 DTO에 포함한다.
- 관리자 프로필 API와 공개 BFF 응답을 분리한다.
- 새 업로드 key는 `workspaces/{workspaceId}/...` namespace를 사용한다.
- 다른 Workspace의 신규 object key는 저장하지 못한다.

기존 legacy object key, private bucket, 악성 파일 검사, 파생 파일 삭제는 아직 migration 대상이다.

## 10. AI와 벡터 검색

- 경력 벡터 저장·삭제·검색에는 `workspace_id`를 사용한다.
- Study 이벤트·벡터 저장·삭제·검색에도 `workspace_id`를 사용한다.
- Experience·Study 원본 삭제는 기존 update queue에 삭제 표식을 가진 이벤트를 발행하고 AI Worker가
  `(workspace_id, source_entity_id)` 조건으로 Oracle vector를 삭제한다. 같은 큐를 사용해 한 원본의
  update/delete 순서를 보존하며 다른 Workspace의 같은 종류 vector는 건드리지 않는다. Experience 타입
  변경으로 기존 ID를 삭제하고 새 ID를 만드는 경우에도 이전 ID 삭제를 먼저 등록한다.
- vector update/delete 발행은 공용 after-commit publisher를 사용한다. MySQL transaction rollback 시
  메시지를 보내지 않지만 DB commit과 Rabbit publish를 하나의 원자적 transaction으로 묶지는 않으므로,
  commit 직후 프로세스 장애의 유실 창은 backfill 재조정 또는 향후 transactional outbox로 보완해야 한다.
- AI Worker vector Consumer는 실패를 숨기지 않고 1초·2초 backoff로 총 3회 처리한다. 계속 실패하면
  `selfintro.vector-sync.dlx`의 `vector-sync.failed` routing key로
  `selfintro.queue.vector-sync.dlq`에 재발행한다. DLQ payload에는 경력 digest 또는 Study 원문이 포함될 수
  있어 플랫폼 운영자만 접근하며 `VECTOR_SYNC_DLQ_MESSAGE_TTL_MS`(기본 604800000ms, 7일) 뒤 자동
  만료한다.
- 플랫폼 운영자 전용 `POST /api/v1/vector-sync/backfill-all`은 최근 비밀번호 재확인을 요구하며 Oracle의 Experience·Study vector
  namespace를 MySQL의 동일 `(workspace_id, source_entity_id)`와 대조해 원본이 없는 고아 chunk를 먼저
  삭제하고 현재 원본 전체를 다시 생성한다. 본문은 대조·로그 대상이 아니며 공용 JobPosting vector는
  삭제하지 않는다. Oracle reference snapshot을 먼저 얻고 MySQL source ID projection을 종류별 한 번씩
  조회해 set으로 비교한다. 로그의 `[VectorReconciliation]` 완료 후 `[VectorBackfill]` 완료를 모두
  확인한다.
- 실제 삭제 전 `GET /api/v1/vector-sync/reconciliation`으로 read-only dry-run을 수행한다. 응답은
  Experience·Study별 MySQL 원본 수, Vector namespace 수, 고아 수와 누락 수만 포함하며 ID·제목·본문은
  반환하지 않는다.
  관리 셸의 `플랫폼 운영 > Vector 정합성 점검`은 이 GET을 명시적 버튼으로 호출한다. 고아 namespace가
  있을 때만 비밀번호 재확인 입력, 정확한 삭제 수를 확인하는 체크박스와 `고아 Vector만 삭제` 버튼을
  노출하며, 실행 시 최근 비밀번호 재확인을 요구하는 `POST /api/v1/vector-sync/reconcile-orphans`를 호출한다. 이 endpoint는 MySQL
  원본이 없는 Oracle 파생 namespace만 삭제하고 MySQL 원본·현재 원본에 연결된 Vector·공용
  `job_posting_vector`는 변경하지 않으며 외부 임베딩 API를 호출하지 않는다. 전체 백필은 UI에 노출하지
  않는다. 일반 Workspace 사용자는 메뉴가 보이지 않으며 dry-run과 실행 endpoint 모두 403이다.
- 비공개 베타에서는 transactional outbox를 보류한다. after-commit·retry/DLQ·멱등 처리·운영자 재조정을
  사용하며, 반복 유실이나 더 짧은 정합성 RPO가 요구되면 outbox 도입 결정을 재검토한다.
- 현재 Oracle `VECTOR_DISTANCE` 구현은 adapter 내부에 있다.
- Oracle의 기존 `study_vector`에는 로컬 bootstrap Workspace ID를 backfill한 뒤 복합 인덱스를 만든다.
- Workspace 소유권이 아직 완결되지 않은 Competency 벡터는 AI 검색에서 비활성화했다.
- 검색 결과가 없을 때 전역 프로필 전체를 넣던 fallback도 제거했다.
- Experience·Study·Competency AI 초안은 `/api/workspaces/{slug}/**/ai` canonical endpoint를 사용한다.
  선택한 ID와 선택이 없는 전체 후보를 모두 해당 Workspace로 조회하며 다른 Workspace ID는 provider
  호출 전에 거부한다. 기존 `/api/admin/**` AI 초안은 bootstrap·플랫폼 호환용으로만 남고 Workspace
  관리 UI에서는 호출하지 않으며 서버의 플랫폼 역할 제한을 유지한다.
- StudyPlan은 예외적으로 AI 기능까지 Workspace 경계를 완료했다. worker endpoint가 전달받은
  `workspace_id`로 학습 자료 overlay, Workspace Skill, 경력 RAG를 조회하며 계획 ID도
  `(id, workspace_id)`로 조회한다.
- JobPosting 원문 임베딩인 `job_posting_vector`는 공용 catalog 자산이다. 개인 적합도는 명시적
  Workspace ID로 `workspace_skill`을 조회한 뒤 `workspace_job_application`에만 기록한다. Oracle
  catalog vector에 Workspace 컬럼을 억지로 추가하거나 공용 `job_posting` 행에 개인 점수를 쓰지 않는다.
- Workspace purge dry-run은 API가 Oracle에 직접 접속하지 않고 `GRPC_WORKER_HOST`의 AI Worker에
  읽기 전용 inventory RPC를 5초 deadline으로 요청한다. Worker는 `experience_vector`와
  `study_vector`만 집계한다. gRPC/JDBC 원문은 상태에 저장하지 않으며 실패 시
  `VECTOR_INVENTORY_FAILED`로 fail closed 한다. 운영 Kubernetes Service는 9090 gRPC를 cluster 내부에만
  노출한다.

기능 품질보다 교차 Workspace 정보 혼입 방지가 우선이다.

## 11. 검증 명령

백엔드 전체 테스트:

```bash
cd backend
./gradlew test
```

프론트 운영 빌드:

```bash
cd frontend-next
npm run build
```

Docker 이미지 빌드:

```bash
docker compose build backend backend-worker frontend-next
```

backend와 worker를 병렬 빌드할 때 두 Dockerfile은 BuildKit Gradle cache를 `sharing=locked`로 공유한다.
공유 journal cache의 동시 lock timeout이 발생하면 코드 실패로 판정하지 말고 cache mount 설정을 먼저
확인한다. 2026-08-13 전체 이미지 빌드에서 해당 timeout을 재현해 이 잠금 계약을 추가했다.

두 사용자·두 Workspace 실제 HTTP 격리 E2E:

```bash
./scripts/e2e/workspace-isolation-compose.sh
```

이 스크립트는 `localhost` 또는 `127.0.0.1` Compose에서만 실행된다. `.env`의 `ADMIN_PASSWORD` 또는
명시적인 `E2E_PASSWORD`를 이용하되 비밀번호를 출력하지 않는다. 기존 플랫폼 소유자의 password hash를
복사한 임시 일반 사용자 두 명과 고유 slug Workspace 두 개를 만들며 플랫폼 역할은 부여하지 않는다.
종료·실패·인터럽트 시 고유 E2E 사용자·Workspace와 관련 감사 이벤트만 삭제한다. 운영 URL이나 운영
DB를 대상으로 실행하지 않는다.

현재 gate는 Profile·발행 revision·Study뿐 아니라 Experience Tree–Study 링크와 Skill
catalog/Workspace overlay–Competency 경계도 검증한다. 다른 Workspace의 Study·링크·Competency ID는
교차 변경할 수 없고, Competency는 현재 Workspace가 선택하지 않은 catalog Skill을 직접 연결할 수 없다.
동일 JobPosting을 두 Workspace가 독립 지원 건으로 저장하고, 최종 PDF presigned key·PrintTemplate도
Workspace namespace와 Membership 경계를 벗어나지 못하는지 함께 검증한다.

현재 확인 결과:

- 전체 Gradle 테스트 성공
- MFA 등록·제한 권한·전체 로그아웃·TOTP 재로그인 통합 테스트 성공
- 기기 fingerprint 변경 감사 테스트 성공
- Next.js production build 성공
- backend, worker, frontend Docker 이미지 빌드 성공
- 격리 테스트 DB의 V190~V194 schema 생성·통합 테스트 성공
- Docker Compose MySQL의 V194 migration 성공과 기존 Workspace 공개 상태 보존 확인
- 초대 가입·단일 사용 이메일 확인·이메일 로그인·provisional slug Workspace 생성 브라우저 E2E 성공
- 신규 Workspace 공개 BFF 404 및 일반 계정 legacy mutation 403 통합 테스트 성공
- 일반 계정에서 기존 전역 관리 메뉴가 노출되지 않음을 브라우저로 확인
- 브라우저에서 `/` 제품 메인에 특정 사용자 Workspace 링크가 노출되지 않음을 확인
- 브라우저에서 로그인 상태의 플랫폼 메인 헤더·Hero·모바일 메뉴가 가입 CTA 대신 첫 Workspace 또는
  온보딩 CTA를 표시하고, 동일한 안전한 경로를 사용하는 것을 확인
- 플랫폼 메인의 비로그인 헤더·Hero·모바일 가입 CTA가 `/signup`을 사용하도록 production build와
  정적 링크 계약을 확인
- 운영자 초대 발급·개인 이메일 일치·폐기·감사 기록 통합 테스트 성공
- 초대 URL이 fragment로 코드를 전달하고 가입 화면이 자동 입력 직후 주소에서 제거함을 브라우저로 확인
- 일반 Workspace 사용자는 같은 관리 셸에 진입하지만 플랫폼 운영 메뉴와 외부 운영 도구가 메뉴
  allowlist에서 제외되도록 production build로 확인
- 운영자 초대 목록·발급·재인증 UI를 관리 셸의 조건부 탭으로 통합하고 `/ops`를 해당 탭으로 이동하는
  호환 주소로 변경
- MFA 등록 QR·수동 키 복사·키 재생성 안내와 역할별 로그인 후 자동 이동의 production build 성공
- `com.docker.compose.oneoff=True`로 남아 있던 `backend-run-*` 두 개를 확인 후 제거하고 정상 Compose
  서비스에는 영향이 없음을 확인
- Docker Compose MySQL의 V195 migration 성공, backend 재기동 및 Mailpit health 확인
- 브라우저에서 실제 Workspace slug 기반 홈 렌더링과 Workspace 전용 내비게이션 확인
- `/workspace/{slug}/manage` 200 응답과 기존 `/workspace/{slug}/admin?tab=STUDY`가 query를 보존해
  `/manage?tab=STUDY`로 307 이동함을 확인
- Docker Compose MySQL의 V198 적용, bootstrap Workspace 이름 분리, backend health `UP` 확인
- Docker Compose MySQL의 V196·V197 migration 성공과 backend 정상 기동 확인
- 역할을 드러내던 기존 `/workspace/owner-personal`은 404, 새 불투명 slug의 프로필·경험·학습은
  각각 200 응답임을 확인
- 비멤버 로그인 세션에서는 Workspace 공개 내비게이션의 `프로필 / 경험 / 학습`만 보이고
  `Workspace 관리` 버튼은 보이지 않음을 브라우저로 확인
- Workspace 프로필 안의 경력·관련 학습 링크와 관련 학습 조회도 같은 Workspace slug를 유지하며,
  경험·학습 상세 화면이 콘솔 오류 없이 렌더링됨을 확인
- 기존 `/w/{slug}` → `/workspace/{slug}` 호환 리다이렉트 성공
- 비로그인 `/workspace/{slug}/manage` 요청의 `next` 보존 로그인 이동 성공
- 관리 URL의 `tab` query도 로그인 `next`와 alias canonical 이동에서 보존되도록 고정
- 공개 Workspace의 없음·비공개·revision 누락은 같은 404로, 인증된 비멤버의 기존·없는 slug 조회도
  같은 404로 응답하는 통합 테스트 성공
- slug 없는 legacy API는 활성 Membership이 둘 이상이면 임의 Workspace를 선택하지 않고 409로
  실패하며, Workspace가 명시된 API로만 다중 tenant 데이터를 다루도록 고정
- 전체 `:api:test` 성공 및 두 Workspace가 같은 Skill catalog를 서로 다른 숙련도·설명으로 사용해도
  공개 Introduction과 Competency가 섞이지 않는 통합 테스트 성공
- Docker Compose MySQL V199 적용 성공: 기존 Skill 71개를 `workspace_skill` 71개로 backfill하고
  기존 Competency 11개에 Workspace 소유권을 부여함
- `/api/skill-catalog`은 개인 표현값을 제거한 응답으로 200, 기존 `/api/skills` 익명 요청은 401 확인
- Docker Compose backend 재빌드 후 `/actuator/health` `UP` 확인
- 전체 `:api:test`, `:ai-worker:test`와 Next.js production build 재검증 성공
- Docker Compose MySQL의 V200 적용·Flyway success 확인: 기존 Tag 259개와 Study taxonomy curation
  6개가 bootstrap Workspace로 backfill됨
- Study slug·Tag·관리 ID의 두 Workspace 격리 통합 테스트 성공
- backend·worker 재빌드 후 API/worker health `UP`, Oracle Vector 연결 `UP` 확인
- 일반 Workspace 관리 UI가 Experience·Study·Skill·Competency canonical API를 사용하고 미격리 AI
  초안은 플랫폼 운영자에게만 렌더링되도록 production build 확인
- Portfolio·PrintTemplate의 두 Workspace 경계 구현과 교차 Portfolio/PrintTemplate ID·프로젝트
  참조 차단 통합 테스트 성공
- Docker Compose MySQL의 V201 적용·Flyway success 확인: 기존 PrintTemplate 8개가 bootstrap
  Workspace로 backfill됐고 `workspace_id IS NULL`은 0개. 기존 Portfolio Case Study는 0개
- V201 backend·worker 이미지 재빌드 후 API·worker·frontend health `UP` 확인
- LearningResource와 JobPosting의 공통 ID를 두 Workspace가 서로 다른 상태·메모·Tag·지원 이력으로
  사용해도 교차 조회가 404가 되는 통합 테스트 성공
- Docker Compose MySQL의 V202·V203 Flyway success 확인: LearningResource 287개와 JobPosting
  132개가 bootstrap Workspace overlay로 각각 287개·132개 backfill됐고 `workspace_id IS NULL`은
  모두 0개. 기존 지원 상태 이력 33개도 Workspace 상태 이력으로 이관됨
- V203 backend·worker 이미지 재빌드 후 API·worker·frontend health `UP` 확인
- V204 Flyway success 확인. 기존 StudyPlan·candidate는 각 0개였으며 `study_plan.workspace_id`와
  `study_plan_candidate.priority_tier` schema 생성 확인
- backend가 Flyway를 완료하고 health `UP`이 된 뒤 worker가 `JPA_DDL_AUTO=validate`로 기동하도록
  Compose 의존 순서를 검증함. API·worker·frontend health 200, 비인증 StudyPlan 요청 401 확인
- LearningResource·StudyPlan Workspace 관리 UI의 TypeScript 검사와 별도 임시 복사본 Next.js
  production build 성공
- 일반 Workspace 지원 공고 관리와 플랫폼 공고 catalog·AI 운영 탭 분리 후 TypeScript 검사 성공
- V205 Flyway success 확인. 기존 자기소개서 문항 18개에
  `workspace_job_application_id`를 backfill했고 NULL 0개, orphan revision 0개를 확인함
- 첫 로컬 V205 검증에서 기존 `job_posting_id` FK가 unique index를 사용해 index drop이 실패했다.
  원인 확인 후 별도 shadow index를 먼저 생성하도록 migration을 수정하고, 실패 과정에서 추가된 새
  파생 컬럼과 Flyway 실패 이력만 제거한 뒤 재실행해 성공함. 원본 문항·답변은 변경하지 않음
- 자기소개서 교차 Workspace 조회·revision 소유권 단위 테스트, 전체
  `:core:test :api:test :ai-worker:test`, `spotlessCheck`, TypeScript 검사와 임시 복사본 Next.js
  production build 성공
- backend·worker·frontend Docker 이미지 재빌드, backend/worker/frontend health 200, 비인증
  Workspace 자기소개서 요청 401 확인. 운영 환경에는 배포하지 않음
- Workspace 자기소개서 AI가 지원 건·문항 소유권을 확인하고 명시적 Workspace 경력 RAG를 사용하는
  단위 테스트, 다른 Workspace 문항 ID 거부 테스트 성공
- V206 Flyway success 확인. 로컬 Gap 문서는 0개였으므로 backfill 대상은 없었고 새
  `workspace_job_application_id NOT NULL` schema와 지원 건별 version unique 제약을 확인함
- 다른 Workspace Gap 문서 조회 차단 단위 테스트, Backend·Worker health 200, 비인증 Gap GET 401,
  CSRF 없는 AI POST 403, TypeScript 검사와 Next.js production build 성공
- 일반 Workspace 지원 화면에 자기소개서 AI·어필 분석·보완 프로젝트 UI를 연결함. AI 호출은
  사용자가 버튼을 누른 경우에만 실행되며, 운영 환경에는 배포하지 않음
- 채용공고 PDF AI 초안 생성·재생성에 Workspace 지원 건, Workspace BFF 이력, Workspace 벡터 검색,
  Workspace PrintTemplate 검증을 적용함. 다른 Workspace의 공고·템플릿 ID는 LLM 호출 전에 거부하는
  단위 테스트 성공
- 최종 제출 PDF의 object key를 Workspace와 `PRINT_TEMPLATE_FINAL_PDF` scope까지 검증하고,
  `self-intro-private` 비공개 버킷으로 라우팅함. 공개 PrintTemplate 응답은 `finalPdfUrl`을 항상
  `null`로 반환함
- V207 Flyway success 확인. 기존 최종 PDF 1개(356KiB)를 공개 버킷에서 비공개 버킷의
  `workspaces/{workspaceId}/print-template/final-pdf/**` key로 먼저 복사하고 ETag 일치를 확인한 뒤 DB
  key를 이관함. 비정상 legacy key 0개 확인. 비공개 파일과 DB 전환을 재검증한 뒤 공개 버킷의 해당
  legacy object 1개만 삭제했으며 기존 공개 URL은 404, 비공개 버킷 직접 URL은 403임
- 첫 Compose 재기동에서 worker의 별도 `application.yml`에 `private-bucket` 설정이 없어 기동 실패한
  것을 확인함. api·worker 설정 계약과 Compose 환경변수를 함께 보완한 뒤 API·worker health 200,
  MySQL·Oracle·RabbitMQ·Redis `UP` 확인
- MinIO 정책은 공개 이미지 버킷 `download`, 최종 PDF 버킷 `private`로 확인함. 비공개 PDF의 직접
  HTTP 접근은 403, 비인증 Workspace PDF 관리 API는 401, 두 공개 PrintTemplate API에서 노출된
  `finalPdfUrl`은 0개임
- 전체 `:core:test :api:test :ai-worker:test`, `spotlessCheck`, `git diff --check` 성공. 운영 OCI에는
  private bucket을 만들거나 기존 object를 이관하지 않았고 애플리케이션도 배포하지 않음
- 공용 JobPosting 수집·URL/이미지 등록·새로고침에서 개인 매칭 계산을 제거함. Workspace 전용 rematch가
  요청 Workspace Skill만 읽어 overlay에 기록하고 다른 Workspace 지원 건은 AI 호출 전에 거부하는
  단위 테스트를 추가함. 일반 Workspace 지원 화면에도 전용 재계산 버튼을 연결했으며 운영에는 배포하지
  않음
- Backend·worker·frontend Docker 이미지를 재빌드하고 Compose health 200을 확인함. worker health에서
  MySQL·Oracle·RabbitMQ·Redis가 모두 `UP`이며 익명 Workspace rematch POST는 403으로 차단됨. 로컬
  Oracle `JOB_POSTING_VECTOR` 실제 컬럼은 `ID`, `JOB_POSTING_ID`, `CHUNK_CONTENT`,
  `EMBEDDING_VECTOR`, `CREATED_AT`이고 개인 `WORKSPACE_ID`가 없음을 확인함. 운영 환경에는 배포하지 않음
- 의사결정 온톨로지의 상황·선택지·트레이드오프·경고·출처·관계는 공통 catalog로 유지하고,
  `decision_study_link`만 Workspace overlay로 분리함. 관리 API는 URL Workspace의 Membership을
  확인하고 해당 Workspace Study만 연결하며, 공개 API는 발행된 Workspace의 공개 Study 연결만 반환함
- topology importer의 고정 Study 연결은 bootstrap 공개 Workspace에만 적용한다. 신규 Workspace에는
  공통 catalog만 보이고 Study 연결은 비어 있으며, 소유자가 관리 화면에서 자기 Study를 연결한다
- 첫 V208 Compose 적용에서는 기존 `uk_decision_study_link`가 `situation_id` 외래키의 지원 index로
  사용 중이어서 index drop이 실패했다. 기존 11개 링크를 확인한 뒤 V208이 부분 추가한
  `workspace_id`, Study 복합 unique index와 실패 history만 되돌리고, 독립 `situation_id` index를 먼저
  만드는 순서로 migration을 수정해 재적용했다. 재적용 후 Flyway success, 링크 11개 보존, NULL 0개,
  교차 Workspace 불일치 0개를 확인했다
- canonical 공개 온톨로지 API와 페이지는 200, 비인증 관리 GET은 401, CSRF 없는 mutation은 403을
  확인했다. 공개 catalog 상황 53개와 공개 Study 연결 8개가 현재 bootstrap Workspace 범위로 반환됐다
- 핵심 프로젝트 편성은 별도 전역 aggregate가 아니라 Workspace 소유 Experience의 하위 설정으로
  유지한다. 관리 UI를 전역 `/api/admin/experiences`, `/api/admin/experience-placements`에서
  `/api/workspaces/{slug}/experiences/manage`, `/api/workspaces/{slug}/experience-placements/CORE_PROJECT`로
  전환했다. 조회·전체 교체·공개 BFF 모두 같은 Workspace ID를 사용한다
- 요청 Workspace에 속하지 않은 프로젝트 ID가 하나라도 포함되면 기존 편성을 삭제하기 전에 요청
  전체를 거부하는 단위 테스트를 추가했다. 따라서 다른 Workspace ID를 이용한 전체 교체로 현재
  Workspace 편성을 지우거나 교차 연결할 수 없다
- V209는 `experience_placement_detail.experience_id`를 편성의 Experience로 backfill하고 편성 및
  상세 경험에 각각 복합 FK를 적용한다. 배포 전 기존 상세 연결의 Experience 불일치가 0건인지 먼저
  확인한다. Compose 적용 후 기존 상세 연결 15개가 보존됐고 `experience_id IS NULL`, 편성 Experience
  불일치, 상세 경험 Experience 불일치는 모두 0건이며 양쪽 복합 FK 생성을 확인했다
- Compose 공개 Workspace BFF는 대표 프로젝트 3개를 현재 Workspace 범위로 반환했고 HTTP 200을
  확인했다. 비인증 canonical 관리 GET은 401, CSRF 없는 전체 교체 PUT은 403으로 차단됐다
- V210 Workspace 방문 통계는 공개 기록 시 플랫폼 전체 집계와 현재 Workspace 집계를 함께 갱신하고,
  조회 repository·cache key·관리 API가 항상 `workspace_id`를 포함하도록 구현했다. 다른 Workspace
  ID를 조회하지 않는 단위 테스트와 비인증 관리 API 401 테스트가 통과했다. Workspace `OWNER`와
  `ADMIN`에게만 관리 메뉴를 표시하며 플랫폼 전체 통계는 별도 플랫폼 운영 메뉴에 유지한다. 과거 전역
  통계는 귀속 근거가 없어 Workspace로 이관하지 않는다. backend·frontend 이미지를 재빌드하고 Compose
  전체 health를 확인한 뒤 공개 기록 POST 200, Workspace 집계 1건·시간 집계 1건, 같은 hash의 플랫폼
  집계 1건, 비인증 관리 조회 401을 확인했다. 로컬 환경에만 적용했으며 운영에는 배포하지 않았다
- `workspace-isolation-compose.sh`를 실제 Compose에서 실행해 임시 일반 사용자 2명·Workspace 2개의
  세션 로그인과 CSRF를 확인했다. Profile 교차 조회 404, Study 교차 수정·삭제 404와 원본 보존,
  핵심 프로젝트 편성 교차 조회 404·교차 ID 연결 400, Workspace 방문 통계 교차 조회 404, 일반 사용자의
  플랫폼 전체 통계 접근 403을 확인했다. 같은 Study slug는 Workspace별로 각각 생성됐고 방문자 쿠키의
  Workspace별 순 방문자·조회 수도 분리됐다. 종료 후 임시 사용자와 Workspace는 모두 정리됐으며 운영에는
  배포하지 않았다
- V211 Flyway success와 기존 공개 Workspace의 초기 revision 생성 후 schema v2 보정 revision 2·resource
  192개(관련 Experience snapshot 17개 포함)를 확인했다. 발행 상태인데 호환 revision이 없는 Workspace는
  0개다. `SaasSecurityFoundationIntegrationTest`에서 첫 발행,
  초안 저장 후 기존 공개본 유지, 재발행 반영, 공개 중지 후 404를 검증했다. Next.js production build와
  backend·frontend Docker 이미지 빌드, backend health를 확인했다.
- Compose 격리 E2E에 신규 PRIVATE Workspace의 발행 전 공개 404, revision 1 첫 발행, 초안 미반영,
  revision 2 재발행 반영을 추가해 통과했다. 기존 Profile·Study·핵심 프로젝트·방문 통계 교차 접근
  차단도 함께 재검증했고 fixture는 종료 시 정리됐다. 로컬 환경에만 적용했으며 운영에는 배포하지 않았다.
- V212 Flyway success와 `operation_type`, `source_revision_number` 실제 MySQL schema를 확인했다.
  Compose 격리 E2E에서 Membership 없는 사용자의 revision 이력 조회·rollback이 모두 404로 숨겨지고,
  OWNER가 revision 1을 복원하면 기존 revision을 수정하지 않고 `ROLLBACK`, `sourceRevisionNumber=1`인
  revision 3이 생성되는 것을 확인했다. 공개 응답은 revision 1 내용으로 돌아가지만 revision 2를 만들기
  전에 저장한 최신 초안은 그대로 유지됐다. Profile·Study·핵심 프로젝트·방문 통계 격리도 함께
  재검증했고 fixture는 종료 시 정리됐다. 전체 core/api 테스트, TypeScript 검사, backend·frontend
  Docker 이미지 빌드가 통과했다. 브라우저 자동 검증 세션에는 인증된 관리 탭이 없어 실제 계정의 UI
  클릭 검증은 수행하지 않았다. 로컬 환경에만 적용했으며 운영에는 배포하지 않았다.
- 첫 V213 Compose 적용에서는 generated canonical column을 같은 `ALTER TABLE`에 추가할 때 MySQL이 기존
  `workspace_slug_alias.workspace_id` 외래키를 재구성하지 못해 실패했다. 부분 DDL이 없고 실패 history
  한 건만 남은 것을 확인한 뒤 해당 실패 history를 제거하고, 전역 `UNIQUE(slug)`와 Workspace row lock을
  사용하는 단순한 registry migration으로 수정해 재적용했다. V213 Flyway success, 모든 기존 Workspace의
  canonical registry backfill 완료, 누락 0건, 교차 Workspace slug 충돌 0건과 backend health 200을
  확인했다.
- Compose 격리 E2E에서 OWNER의 최근 로그인 재인증으로 canonical slug를 변경하고, 기존 slug 공개 API
  호환 200, Next.js 공개 URL canonical redirect 308, 다른 Workspace 사용자의 과거 alias 기반 관리
  resolution 404를 확인했다. Profile·공개 revision rollback·Study·핵심 프로젝트·방문 통계 격리도 함께
  재검증했고 fixture는 종료 시 정리됐다. 전체 core/api test와 Spotless, TypeScript 검사, Backend image,
  Next.js production runtime image 빌드가 통과했으며 검증용 이미지는 삭제했다. 로컬 환경에만 적용했고
  운영에는 배포하지 않았다.
- V214 Flyway success와 `workspace_membership_invitation`의 Workspace·초대자 외래키, token hash unique,
  수신자·상태 조회 index를 보존 중인 Compose MySQL에서 확인했다. 전체 core/api test와 Spotless,
  TypeScript 검사가 통과했다. 호스트 Next production build는 샌드박스가 Turbopack 내부 port binding을
  막아 실패했지만 같은 소스의 Docker runtime image build는 TypeScript·12개 정적 페이지·전체 route
  생성을 포함해 통과했고 검증 이미지는 즉시 삭제했다.
- Compose 격리 E2E에서 비멤버의 멤버 목록 404, 실제 Mailpit 메일에서 fragment token 수신, 지정 이메일
  계정의 ADMIN 초대 수락, 수락 뒤 목록 접근, OWNER→ADMIN과 대상→OWNER의 원자적 소유권 이전, 새
  OWNER의 이전 멤버 제거, 제거된 사용자의 과거 alias 기반 관리 접근 404를 확인했다. 기존 Profile·
  공개 revision·slug alias·Study·핵심 프로젝트·방문 통계 격리도 함께 통과했고 종료 후 임시 사용자·
  Workspace·초대는 모두 0건으로 정리됐다. 브라우저에서 `/workspace-invitations`의 무토큰 안내·로그인
  복귀 링크와 console error 0건을 확인했다. 로컬 환경에만 적용했으며 운영에는 배포하지 않았다.
- V215 Flyway success와 가입 초대 `used_at`, Workspace 참여 초대 `declined_at`, retention index를 보존
  중인 Compose MySQL에서 확인했다. 종결·만료 뒤 기본 30일, 유형별 최대 500건인 cleanup query와 실제
  삭제는 단위·통합 테스트로 검증했다. Compose 격리 E2E에서는 소유권 이전·기존 멤버 제거 뒤 실제
  Mailpit 재초대를 발송하고, 지정 이메일 계정의 명시적 거절 204, 거절 상태 1건, 거절 뒤 관리 접근
  404를 확인했다. 기존 전체 Workspace 격리 흐름도 함께 통과하고 임시 데이터는 종료 시 정리됐다.
  TypeScript·Prettier 검사와 backend Compose image build가 통과했으며 브라우저의 비로그인
  초대 링크 보관·로그인 복귀 화면에서 console warning/error가 없었다. 로컬 환경에만 적용했으며
  운영에는 배포하지 않았다.
- V216 Flyway success와 Workspace의 `deleted_at`, `deletion_requested_by_user_id`, `purge_after`, purge
  후보 index를 보존 중인 Compose MySQL에서 확인했다. 통합 테스트와 Compose 실제 세션 E2E에서 OWNER·
  ADMIN 이름 변경, OWNER 자발적 탈퇴 409, 비OWNER Membership 중지, 이름 불일치 폐쇄 400, 정확한 이름
  폐쇄 204, `DELETED|PRIVATE`, 활성 Membership 0건, 관리·공개 접근 404를 확인했다. 물리 purge는
  실행하지 않았으며 E2E fixture만 종료 trap으로 정리했다.
- V217은 로컬 소스에서 compile·단위 테스트를 통과했다. 실제 MySQL 기준 V217 전 20개
  `workspace_id` 테이블의 FK 규칙을 확인해 18개 `CASCADE`, 참여 초대 `NO ACTION`, 보안 감사 FK 없음으로
  분류했다. 보존 중인 Compose MySQL에 migration을 적용해 schema v217과 21개 테이블을 확인했고,
  실제 세션 E2E에서 폐쇄 transaction이 `PENDING_GRACE` job 1개와 `PENDING` checkpoint 5개를 만들며
  기존 교차 Workspace 차단을 유지하는 것을 검증했다. 운영자 dry-run UI는 플랫폼 역할에만 표시되고
  실행 전에 최근 비밀번호 재확인을 요구한다. 실제 저장소 삭제는 실행하지 않았고 운영에도 배포하지 않았다.
  프런트 TypeScript·Prettier 검사와 Docker production runtime image의 전체 route·12개 정적 페이지
  생성이 통과했으며 검증용 image는 즉시 삭제했다. 비로그인 브라우저가 `PURGE_JOBS` URL에서 로그인
  화면으로 이동하고 console warning/error가 없는 것도 확인했다. 로그인된 운영자 브라우저 세션이 없어
  실제 UI 클릭 dry-run은 수행하지 않았고 controller 권한·재인증과 service 결과는 테스트로 검증했다.
- V218 첫 Compose 적용에서는 `ON DELETE CASCADE` FK 기반 컬럼을 인덱스 생성 컬럼 식에 사용한 MySQL
  제한으로 1215가 발생했다. `SHOW CREATE TABLE`로 부분 컬럼 생성이 없음을 확인하고 실패 history만
  제거한 뒤, 일반 nullable owner guard와 `UNIQUE`·`CHECK` 방식으로 변경해 Flyway `success=1`과 backend
  정상 기동을 확인했다. 운영에서는 failed history를 자동 repair하지 않으며 동일한 사전 OWNER 수 검사를
  거친 backup clone에서 먼저 적용한다.
- V219는 V218 CHECK의 `NULL = workspace_id`가 SQL 3값 논리상 `UNKNOWN`으로 통과하는 것을 실제 위반
  UPDATE로 발견해 `IS NOT NULL`을 추가했다. Compose MySQL에서 V219 `success=1`, 동일 UPDATE의 3819
  거부, backend `healthy`를 확인했으며 검증으로 잠시 NULL이 된 로컬 guard 1건은 즉시 원래 Workspace
  ID로 복원했다. 이어 실제 세션·Mailpit 기반 두 사용자/두 Workspace E2E에서 초대 수락, 단일 OWNER
  소유권 이전, 기존 멤버 제거, 재초대 거절, 폐쇄와 fixture 잔여 0건까지 통과했다.
- Object Storage dry-run adapter는 공개·비공개 S3 호환 버킷의 현재 object 수와 bytes만 집계하도록
  시작한 뒤 이전 version·delete marker·미완료 multipart와 이전 version bytes까지 확장했다. 넓거나
  잘못된 Workspace prefix는 거부하고 key·provider 오류 원문은 보존하지 않는다. 단위 테스트와 로컬
  Compose MinIO 통합 테스트에서 공유 버킷의 격리 prefix에 공개 object 2개와 비공개 object 1개를 만들어
  `2/1`과 정확한 byte 합계를 확인했다. 별도의 임시 versioning 버킷에서는 이전 version 2개, delete
  marker 1개, part가 올라간 미완료 multipart 1개를 검출했다. 테스트가 만든 object·version·multipart·
  임시 버킷은 모두 정리했다. 이후 version·delete marker·미완료 multipart를 최대 1,000개 단위로
  제거하고 0건을 재검증하는 멱등 adapter를 추가했다. 기본 비활성 시 저장소 호출 전 차단, 1,001개 mock
  version의 `1000/1` batch 분할, 격리 MinIO fixture의 1차 삭제 5건과 재실행 0건을 확인했다. 실제
  versioning 버킷뿐 아니라 별도 unversioned 공개·비공개 버킷의 현재 object 2건 삭제와 재실행 0건도
  확인했다. 실제 Compose 해석값은 `false`다. 실제 Workspace 데이터나 purge 대상은 삭제하지 않았고
  API·스케줄러에도 연결하지 않았으며 운영에도 배포하지 않았다.
- Oracle Vector adapter는 `experience_vector`와 `study_vector`만 Workspace 조건으로 집계·삭제하고
  공용 `job_posting_vector`는 제외한다. 단위 테스트에서 비활성 flag 차단, 두 테이블 삭제, 잔여 감지를
  확인했다. Compose Oracle에는 기존 데이터와 충돌하지 않는 격리 Workspace ID로 각 2건을 복제해
  inventory `2/2`, 삭제 `2/2`, 잔여 0건을 확인하고 commit했다. 새 Worker image는 읽기 전용
  `WorkspaceVectorInventoryGrpcService`를 9090에 등록하고 정상 시작했다. 실제 Workspace row는 삭제하지
  않았고 삭제 기능은 `false`, 실행 경로 미연결, 운영 미배포 상태다. 실제 Compose Worker에 대한
  gRPC 통합 테스트, backend 전 모듈 `spotlessCheck test`, `docker compose config --quiet`, 운영 backend
  overlay의 `kubectl kustomize`도 통과했다.
- Redis cache adapter는 Workspace 방문 요약·Experience Tree·PrintTemplate의 명시적 Workspace key와
  식별 불가능한 레거시 BFF·PrintTemplate namespace만 registry로 관리한다. 전용 Redis DB 15 fixture에
  대상 key 9개를 만든 뒤 scoped 5개/shared legacy 4개를 집계하고 `UNLINK` 9개·재검사 0개를 확인했다.
  다른 Workspace Experience Tree key, Spring Session key, 플랫폼 방문 cache는 보존됐다. fixture DB는
  테스트 전후 비웠고 운영 데이터·DB 0은 건드리지 않았다. 실제 컨테이너 flag는 `false`, 실행 경로
  미연결, 운영 미배포 상태다.
- Oracle NoSQL은 새 `JobPostingCatalogReadModel`에 공통 공고 필드만 쓰도록 DDL과 이벤트 projection을
  분리했다. `RUN_ORACLE_NOSQL_INTEGRATION_TESTS=true` 통합 테스트로 Compose KVLite의 실제 schema가
  Workspace·사용자·매칭 필드를 포함하지 않고 기존 `JobPostingReadModel`의 행이 0건임을 확인했다.
  schema drift나 레거시 행이 있으면 fail-closed하는 단위·서비스 테스트도 통과했다. NoSQL delete API는
  만들지 않았고 운영 OCI에는 배포하지 않았다.
- MySQL purge adapter는 실제 schema의 21개 Workspace 테이블과 18개 `CASCADE`·초대 1개 `NO ACTION` FK를
  code-owned manifest로 검증한다. Compose MySQL transaction 안에 격리 Workspace·Membership·초대·감사·
  purge job fixture를 만든 뒤 초대 1건 선삭제, 감사 1건 가명화, Workspace·Membership cascade, purge job
  1건 보존과 두 번째 실행 0건을 확인했다. fixture 전체는 rollback했으며 실제 Workspace는 삭제하지 않았다.
  기본 flag는 false이고 운영 미배포 상태다.
- `scripts/rehearse-workspace-purge-compose.sh`로 현재 Compose MySQL의 transaction-consistent logical
  backup을 disposable clone에 복원했다. source/clone의 table 95개, 성공 Flyway migration 122개,
  기존 Workspace 1개가 일치한 뒤 30일 유예가 지난 fixture를 생성했다. MinIO version·delete marker·
  multipart와 private object, Oracle Experience·Study vector, Redis DB 15의 scoped·legacy cache를 포함해
  NoSQL → Object Storage → Vector → Redis → MySQL 전체 checkpoint가 완료됐다. 대상 잔여 0건, 감사
  연결값 가명화, purge 증적 보존, 무관한 Redis key 보존과 두 번째 멱등 실행 false를 확인했다. 종료 뒤
  임시 clone schema와 Redis DB 15는 0건이었다. 이는 로컬 현재 시점 backup 검증이며 운영 30일 backup
  보존·OCI provider 복구를 증명하지 않고, 모든 실행 flag와 운영 배포 상태는 그대로 false·미배포다.
- 같은 disposable clone에서 purge 전에 maintenance reconciliation을 실행해 누락 제어면 복구, 접근 재차단,
  중단 lease 복구와 모순 blocker 계약을 검증했다. API/Worker runtime role 조건 테스트로 scheduler와
  reconciliation runner가 Worker에만 생성되는 것도 확인했다. 이는 OCI 복원 환경과 격리 workload 종료
  절차를 아직 증명하지 않는다.
- SaaS 전환 체크포인트에서 backend 전 모듈 `spotlessCheck test`와 frontend Prettier·TypeScript,
  Compose Workspace 격리 E2E 9단계를 다시 실행해 통과했다. frontend ESLint는 React effect state rule과
  기존 독립 오류를 합쳐 20개 error·30개 warning으로 실패했으며 별도 release gate로 기록했다. 이
  기준선 역시 로컬 환경 결과이며 운영에는 배포하지 않았다.
- 관리 route를 브라우저로 최초 compile할 때 2 GiB 제한에서 frontend 컨테이너가 두 차례
  `OOMKilled=true`로 종료됐다. 무거운 관리 패널을 동적 chunk로 분리하고 로컬 개발 전용 hard limit를
  3 GiB, Node heap을 2.25 GiB로 조정한 뒤 같은 route가 27.4초에 HTTP 200으로 compile됐고 컨테이너는
  2.352 GiB 사용 상태에서 생존했다. Next.js production runtime image도 전체 route·TypeScript·12개
  정적 페이지 생성을 포함해 통과했으며 검증용 image는 즉시 삭제했다. 이는 로컬 Compose 개발 설정만
  바꾸며 운영 runtime에는 적용하지 않았다.
- Workspace 콘텐츠 안정화 gate에 Experience Tree–Study 링크 교차 생성·수정·삭제와 관리 인덱스
  비멤버 404를 추가했다. Competency 생성·수정은 이제 요청된 모든 Skill이 현재 Workspace의
  `workspace_skill` overlay에 존재하는지 서버에서 확인한다. 두 Workspace가 같은 catalog Skill을 각자
  overlay로 추가하면 독립 Competency 생성은 허용되지만, overlay 없는 직접 연결과 다른 Workspace의
  Competency ID 수정은 거부된다. 대상 서비스 테스트와 실제 세션 기반 Compose E2E 9단계가 통과했으며
  운영에는 배포하지 않았다.
- 같은 Compose gate에서 동일 JobPosting을 두 Workspace가 각각 저장하고 최종 PDF presigned key를
  발급했다. key는 `workspaces/{workspaceId}/print-template/final-pdf/**`로 분리됐고 다른 Workspace key
  연결은 400, PrintTemplate ID 조작과 목록 조회는 404, 원본 최종본은 유지됐다. 실제 object upload
  자체는 이 gate에서 수행하지 않으며 MinIO version·delete marker·private bucket 정리는 별도 purge
  rehearsal의 격리 fixture로 검증한다. 운영에는 배포하지 않았다.
- Visitor·Donation 역할 경계를 재검증했다. Workspace 방문 통계는 해당 Workspace의
  `OWNER`, `ADMIN`만 조회하고, 플랫폼 전체 방문 통계·후원 내역·후원 노출 설정 변경은
  플랫폼 운영자만 사용한다. 일반 Workspace 실제 세션으로 전체 통계와 후원 내역이 각각
  403인 것을 확인했고, 익명 방문자에게는 `/api/donations/config`만 공개한다. 잘못된 Ko-fi
  검증 토큰은 400으로 거부되고 해당 transaction ID의 DB row가 0건인 것까지 Compose에서
  확인했다. 통합 테스트에도 인증만 된 일반 사용자의 플랫폼 API 403 계약을 추가했다.
  로컬 Compose에서만 검증했으며 운영에는 배포하지 않았다.
- Profile·Experience의 default Workspace 관리 API를 제거했다. 실제 관리 UI는 이미
  `/api/workspaces/{slug}/profile`과 `/api/workspaces/{slug}/experiences/manage` 계약만 사용했으며,
  제거된 legacy frontend 메서드의 호출처는 0개였다. 플랫폼 메인 공개 페이지가 사용하는
  `/api/experiences` GET만 읽기 전용 호환 endpoint로 유지한다. RequestMapping 통합 테스트,
  전체 `:api:test`, TypeScript, 새 backend image의 Compose 격리 E2E 9단계가 통과했다.
  재기동 직후 첫 E2E에서 backend 준비 전 nginx 502가 발생했고, healthy 후 동일 시나리오는
  통과했다. E2E 스크립트에 최대 60초 health gate를 추가해 이 준비 경쟁을 제거했다.
  로컬 Compose에서만 검증했으며 운영에는 배포하지 않았다.
- default Workspace BFF 중 호출처가 0개인 `/api/bff/learning`과 관련 client·DTO를 제거했다.
  인쇄는 `/workspace/{slug}/print`로 이관했고, RESUME 소개 BFF와 공개·관리 PrintTemplate,
  revision·저장이 모두 현재 Workspace slug를 사용한다. canonical slug redirect는 기존 query를
  보존한다. 전역 `/print`와 `/api/bff/introduction` default endpoint는 제거했으며 RequestMapping
  통합 테스트가 default BFF handler의 재등장을 차단한다. Next.js production build에서
  `/workspace/[workspaceSlug]/print`만 생성되고 `/print`가 없는 것을 확인했다. 제거된 endpoint가
  `NoResourceFoundException`으로 전달될 때 500이 되던 공통 예외 계약도 404로 수정하고 테스트했다.
  backend health gate를 포함한 Compose 9단계 E2E에서 default BFF 404, canonical Workspace 인쇄
  200, 전역 legacy 인쇄 404와 전체 교차 Workspace 경계를 확인했다. 로컬 Compose에서만 검증했으며
  운영에는 배포하지 않았다.
- Job·AI·Vector 안정화를 시작한 당시 122개 경로를 6개 경계로 분류하고 manual-review 0을 확인했다.
  Workspace 인쇄 화면에 남아 있던 플랫폼 전역 자소서 조회, AI 템플릿 재생성, 공고 목록 호출을
  현재 slug의 Workspace 지원 API로 교체했다. request의 `workspaceId`를 직접 받는
  `/api/v1/vector-sync/**`는 플랫폼 OWNER·OPERATOR 전용으로 잠갔다. 일반 Workspace 사용자 403
  통합 테스트를 추가했다. 호출처 없이 임의 Workspace ID·원문을 받던 수동 Experience·Study vector
  sync endpoint는 제거하고 source-of-truth 이벤트·범위가 검증된 backfill만 남겼다. TypeScript와
  Next.js production build가 통과했다.
- 플랫폼 공고 운영 UI의 개인화 기능도 명시적 Workspace 지원 API로 전환했다. 자소서·revision·어필·
  재매칭·Gap 문서·PDF 초안·최종 PDF는 현재 slug와 Workspace object namespace를 사용한다. 호출처가
  없어진 `/api/worker/job-postings/{id}` 개인화 AI endpoint와 default 공개 Workspace 추론 오버로드를
  제거했으며, 이 prefix에는 공용 공고 URL 파싱·수집·refresh·collect·backfill만 남는다. RequestMapping
  통합 테스트로 제거된 endpoint의 재등장을 차단한다. API 모듈의 default Workspace 자소서 endpoint와
  전역 PrintTemplate의 지원 공고 최종 PDF endpoint도 호출처 0을 확인한 뒤 제거했다. 전체 core·AI
  Worker·API 테스트, TypeScript, Next.js production build, 새 backend·worker Compose image와 9단계
  교차 Workspace E2E가 통과했다. 로컬에서만 검증했으며 운영에는 배포하지 않았다.
- StudyPlan의 candidate·item 변경과 삭제가 다른 Workspace plan ID를 받으면 root 조회에서 거부되는
  테스트를 추가했다. Experience·Study vector repository의 저장 전 삭제·검색·purge SQL을 감사해 모든
  개인 vector 경로가 `workspace_id`를 포함함을 확인했고, 원본 삭제 시 남던 고아 vector도 같은 queue의
  삭제 이벤트로 정리하도록 보완했다. AI Worker 표적 테스트는 통과했으며 아직 운영에 배포하지 않았다.
  Rabbit 발행은 after-commit으로 옮겨 rollback 메시지를 차단했다. Consumer 실패는 총 3회 재시도 후
  7일 TTL의 vector 전용 DLQ로 격리하며, handler가 예외를 전파하는 테스트를 통과했다. commit 이후
  publish 유실 창을 없애는 transactional outbox는 다음 설계 판단으로 남아 있다. 전체 core·AI
  Worker·API 테스트와 Next.js production build, 새 backend·worker Compose image, Worker dependency
  health, DLX·TTL queue 선언, Compose 9단계 교차 Workspace E2E까지 통과했다. 로컬에서만 검증했으며
  운영에는 배포하지 않았다.
- Vector source-of-truth reconciliation과 read-only inspection을 추가했다. Oracle reference snapshot과
  MySQL bulk source projection을 `(workspace_id, source_entity_id)` set으로 비교하며 N+1 조회와 다른
  Workspace 동일 ID 오판을 막는 테스트를 통과했다. 전체 backend test, 최신 backend·worker Compose
  image, dependency health, 무인증 inspection 401과 9단계 E2E를 확인했다. 플랫폼 운영자 MFA 세션이 없는
  상태에서 인증을 우회하지 않았으므로 실제 inspection 집계 응답 확인은 운영자 smoke test로 남아 있다.
  운영에는 배포하지 않았다.
- 2026-08-11 브라우저 smoke test에서 보호된 Workspace 관리 주소는 비로그인 세션을
  `/login?next=...`로 정상 전환했다. 인증 정보를 읽거나 MFA를 우회하지 않았으므로 read-only
  reconciliation의 실제 집계값 확인은 로그인된 플랫폼 운영자가 수행할 출시 전 수동 gate로 유지한다.
- 같은 점검에서 `docker compose config --quiet`가 통과했고 실행 중인 backend·MySQL·Redis·RabbitMQ·
  MinIO·Oracle Vector·Oracle NoSQL·Mailpit은 health check 대상에서 모두 healthy였다. production은 단일
  root overlay가 아니라 backend, frontend, monitoring, mysql-exporter, oracle-exporter의 독립 overlay로
  구성되어 있으며 다섯 경로를 각각 `kubectl kustomize`로 렌더했다. Workspace purge release gate도 모든
  production 실행 flag가 `false`인 fail-closed 상태로 통과했다. 이는 로컬 사전 검증이며 OCI cluster에는
  적용하지 않았다.
- 당시 Job·AI·Vector 122개 경로의 정적 diff review에서 default Workspace 추론, request 본문의 임의
  Workspace ID, 범위 없는 개인 vector 접근, 개인 본문 payload 로그가 없음을 확인했다. 공용
  `JobPosting`의 과거 `match_score`·`match_reason`·`appeal_analysis`는 migration 호환을 위해 남은 레거시
  컬럼이며, 신규 Workspace 지원·AI 경로는 `workspace_job_application`의 개인 결과만 읽고 쓴다. 일반
  Workspace 사용자는 `/api/admin/job-postings`와 `/api/worker/job-postings/collect`에서 403으로 차단하는
  통합 테스트를 추가했다. 이는 로컬 검증이며 운영에는 배포하지 않았다.
- 변경 세트 준비 중 `JobPostingBackfillService.java`의 그룹 키 delimiter가 raw NUL 문자여서 Git이 Java
  source를 binary로 분류하는 문제를 확인했다. 동등한 Java octal escape `"\0"`로 바꾸고 Java text diff
  attribute를 추가해 코드 리뷰 가능 상태로 복구했다. 변경 inventory는 연락처가 제거된 V1과
  `seed_portfolio.sql`을 경력 콘텐츠로 명시 분류했다. 이후 Workspace AI 경계 파일이 추가된 현재
  inventory는 717개·manual-review 0이다. AI Worker 전체 test,
  플랫폼 공고 API 403 표적 통합
  test, API Spotless와 `git diff --check`가 통과했다.
- 2026-08-11 로컬 사용자 인수 테스트 직전 gate를 다시 실행했다. backend 전체 `spotlessCheck test`,
  frontend Prettier·TypeScript·production build가 성공했다. React 19 ESLint 기준선의 21개 error를 제거해
  `npm run lint`는 error 0으로 통과하며, 성능·미사용 코드 관련 warning 30개는 별도 정리 대상으로 남아
  있다. Compose 9단계 격리 E2E는 Profile, 공개 revision·rollback, slug alias, Study·Experience Tree,
  Skill·Competency·핵심 프로젝트, 지원 공고·PDF namespace, 방문 통계, 초대·역할·소유권 이전·폐쇄 및
  purge checkpoint까지 전부 통과했다. 브라우저에서 `/`, `/signup`, `/login`,
  `/architecture/demo`, 실제 `/workspace/{slug}` 공개 화면을 확인했고 비로그인 관리 접근은
  `/login?next=...`로 전환됐다. 따라서 현재 상태는 **로컬 사용자 인수 테스트 가능**이며 운영 배포,
  commit, push는 수행하지 않았다. 플랫폼 운영자 MFA 로그인 후 Vector read-only reconciliation 확인은
  인수 테스트 항목으로 남아 있다.
- 로그인 진입점을 사용자 역할과 무관한 `/login` 하나로 통합하고 사용 전 이력이 없는 `/admin/login`은
  제거했다. 로그인 UI는 이메일·아이디/비밀번호 1차 확인과 TOTP 2차 확인을 별도
  화면으로 분리했다. 실제 Compose 운영자 계정의 1차 요청은
  `{authenticated:false,mfaRequired:true}`를 반환했고 같은 cookie로 `/api/auth/me`를 호출하면 401이었다.
  즉 비밀번호가 맞더라도 MFA 전에는 SecurityContext와 권한 세션이 발급되지 않는다. 잘못된 TOTP는 기존과
  같이 `LOGIN_FAILURE/MFA_REJECTED`, MFA 입력 대기는 비밀값 없는 `LOGIN_MFA_REQUIRED/SUCCESS` 감사
  이벤트로 구분한다. 전체 backend test, frontend production build, ESLint error 0, Compose 9단계 격리
  E2E가 통과했다. 브라우저에서 `/login`의 1차 입력 화면, `/admin/login`의 404, 비로그인 상태에서
  보호된 `/workspace/{slug}/manage` 접근 시 `/login?next=...` 전환을 확인했다. 운영에는 배포하지 않았다.
- 플랫폼 운영자 MFA 로그인 후 남아 있던 Vector 수동 gate를 API 주소 입력 없이 수행하도록 관리 셸의
  `Vector 정합성 점검` 탭을 추가했다. 탭은 사용자가 실행 버튼을 누를 때만 read-only reconciliation을
  호출하며 Experience·Study의 스캔·고아 namespace 수만 표시한다. 삭제·백필 API는 UI에 연결하지 않았다.
  frontend 포맷·TypeScript·ESLint(error 0)·production build가 통과했고, 무인증 API 호출은 401을 유지했다.
  실제 운영자 세션의 집계값 확인은 사용자가 MFA를 완료한 뒤 수행할 로컬 인수 항목이며 운영에는
  배포하지 않았다.
- 실제 MFA 세션으로 첫 조회했을 때 로컬 Nginx가 `/api/v1/vector-sync/**`를 API artifact로 보내 404가
  발생했다. production Ingress에는 이미 Worker Service 분기가 있었으므로 로컬 `docker/nginx/nginx.conf`도
  같은 경로를 `backend-worker:8081`로 전달하도록 맞췄다. 이 경로는 플랫폼 운영자 인증을 그대로
  요구하며 reconciliation UI는 계속 GET read-only 호출만 사용한다.
- 로컬 라우팅 수정 후 운영자 MFA 세션으로 양방향 read-only 대조를 완료했다. Experience는 MySQL 원본
  17개, Vector namespace 99개, 고아 82개, 누락 0개였고 Study는 원본 70개, Vector namespace 139개,
  고아 70개, 누락 1개였다. 기존 API가 고아만 계산해 누락을 놓치던 문제를 보완하고 UI도 원본·Vector·
  고아·누락을 함께 표시한다. 삭제 메서드 `removeOrphans()`의 잘못된 read-only transaction 선언도 실제
  실행 전에 일반 transaction으로 수정했다. 총 153개 불일치가 남아 있으므로 이 인수 gate는 아직
  통과하지 않았다.
- 전체 백필이 Experience·Study 본문을 외부 NVIDIA 임베딩 API로 전송할 수 있음을 확인해 자동 복구에서
  분리했다. 최근 비밀번호 재확인과 정확한 삭제 수 확인을 거친 뒤 로컬 Oracle의 고아 파생 namespace만
  제거하는 `POST /api/v1/vector-sync/reconcile-orphans`와 관리 UI를 추가했다. 이 경로는 외부 임베딩 API를
  호출하지 않으며 MySQL 원본을 변경하지 않는다. 2026-08-11 실제 실행 시도는 최근 비밀번호 재확인 10분
  유효시간이 만료되어 401로 정상 차단됐고 데이터는 아직 변경되지 않았다. 화면에 비밀번호 재확인 입력을
  추가했으며 사용자가 이를 완료한 뒤 고아 152개 삭제와 read-only 재점검을 완료해야 한다. 누락 Study
  1개는 별도의 명시적 데이터 전송 결정을
  받기 전까지 생성하지 않는다.
- 플랫폼 운영자 세션은 `PLATFORM_SESSION_TIMEOUT` 기본값 30분의 inactivity timeout을 사용한다. 만료된
  관리 화면이 Zustand의 마지막 계정 정보를 계속 표시한 상태에서 Vector 재인증을 시도하면 비밀번호가
  맞아도 인증 filter가 먼저 401을 반환해 비밀번호 오류처럼 보이는 문제가 있었다. Workspace 관리 gate는
  창 focus·visibility 복귀 시 `/api/auth/me`를 재검증하고, Vector 재인증은 먼저 활성 세션을 확인해 만료면
  비밀번호 검증을 시도하지 않고 로그인 화면으로 전환한다. 재인증 성공·실패 모두 입력한 비밀번호를 즉시
  폼 state에서 제거한다. 플랫폼 세션 30분 정책 자체는 완화하지 않는다.
- 재로그인과 재인증 후 승인된 로컬 고아 정리를 완료했다. Experience는 원본 17·Vector 17·고아 0·누락
  0, Study는 원본 70·Vector 69·고아 0·누락 1로 재점검됐다. 삭제된 항목은 Experience namespace/chunk
  82/82, Study namespace/chunk 70/70이며 MySQL 원본 변경과 외부 임베딩 호출은 없었다. 이 단계에서는
  누락 Study 1개만 남았다. 개별 source ID별 INFO 삭제 로그는 개인정보 최소화와
  로그 폭주 방지를 위해 식별자 없는 DEBUG로 낮추고 운영 INFO에는 reconciliation 집계만 남긴다.
- 누락 복구는 전체 백필과 분리한 `POST /api/v1/vector-sync/reconcile-missing-external`만 사용한다. 최근
  비밀번호 재확인과 요청 본문의 정확한 `EXTERNAL_NVIDIA` 확인값을 모두 요구하며, 현재 대조에서 누락된
  namespace만 MySQL 원본으로 다시 조회해 NVIDIA embedding API에 제목·본문 청크를 전송한다. provider가
  실패하거나 빈 vector를 반환하면 결정론적 폴백으로 성공 처리하지 않고 전체 요청을 실패시킨다. 관리
  화면도 누락 건수와 외부 전송 범위를 명시한 별도 체크박스를 요구한다. 사용자의 최종 확인과 재인증 후
  2026-08-11 로컬에서 누락 Study namespace 1개만 NVIDIA provider로 복구해 4개 chunk를 생성했다.
  provider 실패·결정론적 폴백·예외는 없었고 재점검 결과 Experience 원본/Vector 17/17, Study 70/70,
  고아·누락 모두 0으로 최종 Vector gate가 통과했다.
- Workspace Skill 목록 조회가 `workspace_skill`의 LAZY `skill` 프록시를 트랜잭션 종료 뒤 DTO로
  변환해 500 `LazyInitializationException`을 반환하던 문제를 수정했다. Workspace ID 조건은 유지하고
  목록 조회에서 필요한 공통 Skill 카탈로그 행만 entity graph로 함께 로딩한다. 권한 있는 소유자의 실제
  목록·표현값 조회, 빈 다른 Workspace 목록, 타 Workspace 접근 404를 한 통합 테스트에서 검증했고
  core/API 전체 test와 Spotless가 통과했다. 수정된 Compose backend를 healthy 상태로 교체한 뒤 실제 관리
  화면에서 71개 기술을 렌더링했고 동일 Workspace Skill API 요청 두 건이 200임을 Nginx에서 확인했다.
  로컬 검증 단계이며 운영에는 배포하지 않았다.
- 2026-08-12 운영자 read-only Vector 재점검에서 Experience 원본/Vector 17/19·고아 2, Study
  70/72·고아 2가 다시 발견됐다. 원인은 Compose 격리 E2E가 임시 Workspace를 마지막에 SQL cascade로
  지우면서 애플리케이션의 Experience·Study 삭제 이벤트를 우회한 cleanup이었다. E2E는 폐쇄 전에
  canonical API로 테스트 링크·배치·Experience·Study를 삭제하고 두 Workspace의 Oracle Vector 잔여가
  0이 될 때까지 기다리도록 수정했다. 중간 실패 때도 테스트 slug로 찾은 Workspace ID의 fixture Vector만
  정리해 로컬 DB를 오염시키지 않는다. 수정 후 9단계 전체 E2E와 두 Workspace의 비동기 Vector 삭제가
  통과했고 재점검 고아 수는 2+2로 증가하지 않았다. 기존 고아 2+2는 자동화로 우회 삭제하지 않고
  운영자가 화면의 정확한 범위를 확인하고 최근 재인증한 뒤 전용 UI로 정리했다. 삭제 성공 메시지 확인 후
  새 read-only reconciliation을 실행해 Experience 원본/Vector 17/17, Study 70/70과 양쪽 고아·누락 0을
  확인했다. MySQL 원본 변경, 전체 백필과 외부 임베딩 API 호출은 없었으며 운영에는 배포하지 않았다.
- 2026-08-12 실제 SMTP 가입·온보딩 Compose UAT인
  `./scripts/e2e/registration-onboarding-compose.sh`를 추가해 통과시켰다. 로컬 전용 개인 초대 fixture로
  가입 202, `PENDING_VERIFICATION`, Mailpit 확인 메일과 fragment token, 확인 전 로그인 401, 이메일 확인
  204와 token 재사용 400, 일반 사용자 로그인, 첫 `PRIVATE` Workspace, 발행 전 공개 404, Profile 저장,
  첫 snapshot 발행과 비로그인 API·프런트 200을 확인했다. 테스트 초대의 만료시각은 DB와 애플리케이션
  timezone 차이에도 과거가 되지 않도록 2일 여유를 둔다. 스크립트는 로컬 URL만 허용하고 종료 시 생성한
  계정·Workspace·초대 fixture를 정확한 식별자로 삭제하며 최종 잔여 0건을 확인했다. 사람의 문구·동선
  체감 확인은 별도 브라우저 세션의 베타테스터 UAT로 남긴다. 운영에는 배포하지 않았다.
- 2026-08-12 Workspace 관리 UI에 남아 있던 Experience·Study·Competency AI의 `/api/admin/**` 호출을
  slug 기반 canonical API로 교체했다. 서비스는 Skill overlay, Experience, ExperienceDetail, Study,
  Competency 후보를 모두 URL Workspace로 조회하며 다른 Workspace ID는 AI provider 호출 전에
  거부한다. 세 서비스 단위 테스트와 타 Workspace Membership의 세 endpoint 404 통합 테스트가 통과했다.
  PrintTemplate CRUD도 이미 canonical API만 사용하므로 일반 Workspace의 `페이지 구성` 메뉴로
  개방하고 Workspace 계약이 없는 Portfolio AI revision은 관리 셸에서 비활성화했다. 전체 backend Spotless·test,
  frontend Prettier·TypeScript·production build, ESLint error 0과 최신 Compose backend의 9단계 교차
  Workspace E2E를 확인했다. 현재 inventory는 717개를 9개 세트로 분류하며 manual-review는 0이다.
  운영 배포·stage·commit은 수행하지 않았다.
- 2026-08-12 공개 페이지 구성 경계를 원본 기록에서 분리했다. V220은 버전형 taxonomy scheme과
  Workspace 구독을, V221은 프로필·경험·학습 공개 구성 draft와 프로필·경험 revision 저장소를,
  V222는 전체 `workspace_publication_revision`이 두 category revision ID와 draft config version을
  고정하는 schema v3를 추가한다. canonical API는 현재 Workspace 소유 리소스만 선택할 수 있고
  발행 시 프로필·경험은 각각 불변 JSON revision, Study·taxonomy는 전체 공개 resource snapshot으로
  저장한다. Compose MySQL에서 V222 적용과 자동 v3 재발행을 확인했으며 최신 공개 revision은
  `profile_revision_id`, `experience_revision_id`, `draft_config_version`을 모두 보유하고 draft의
  `dirty_since`가 비워졌다. schema 상승 재발행 중 JOINED 상속 proxy가 base `Experience`로 보이는 기존
  변환 문제를 발견해 DTO 변환 전에 Hibernate proxy를 해제했고 backend가 healthy로 복구됐다. 원본
  화면의 레거시 공개 mutation 제거와 category subscription UI의 최종 회귀 검증은 남아 있으며,
  운영에는 배포하지 않았다.
- 공개 페이지 구성 후속 검증에서 Flyway를 끈 H2 `ddl-auto=create-drop` 테스트에는 JDBC 전용
  `workspace_public_page_draft`가 생성되지 않아 application context가 실패하는 문제를 확인했다. 실제
  V221 이상 환경은 새 구성 테이블을 필수로 사용하고, 해당 테이블이 없는 테스트·이전 schema에서만
  legacy projection으로 물러나는 호환 경계를 추가했다. core/API 전체 Spotless·test가 통과했다.
  Workspace `학습 구성`에는 taxonomy scheme catalog·구독·대표 scheme 지정 UI를 연결했고, 플랫폼
  taxonomy 원본 화면의 중복 Study 공개 curation과 Profile 원본 화면의 연락처 공개 토글을 제거했다.
  Profile 원본 API의 레거시 boolean은 backfill 회귀가 끝날 때까지 읽기 호환용으로 보존한다. frontend
  Prettier·TypeScript·production build·ESLint error 0을 확인했다. 신규 Workspace `OWNER`의 PUT 요청이
  전역 ADMIN fallback에 막히던 보안 matcher 누락도 발견해 `public-page/draft/**`와
  `taxonomy-schemes/**`를 인증된 Workspace API 경계에 추가했다. 컨트롤러의 OWNER·ADMIN·EDITOR
  `WorkspaceAccessPolicy` 검증은 그대로 유지한다. 수정된 Compose backend에서 가입·SMTP 확인·로그인·
  기본 scheme 구독·Profile 공개 초안 저장·schema v3 발행·category revision pointer·익명 공개 조회까지
  6단계 UAT가 통과했으며 fixture 잔여는 0이다. 이어 기존 9단계 교차 Workspace E2E도 Profile·발행·
  rollback·slug alias·Study·Experience Tree·Competency·핵심 프로젝트·통계·멤버십·폐쇄·Vector cleanup까지
  전부 통과했다. 운영에는 배포하지 않았다.
- 2026-08-12 원본 기록과 공개 구성의 쓰기 경계를 canonical UI/API에도 적용했다. Experience 원본의
  타임라인·세부 항목 웹 공개·이력서 사용 토글, Competency 원본의 공개·숨김 토글, Study 원본의 공개
  taxonomy curation을 제거했다. Workspace 전용 Experience·Competency 공개 mutation endpoint도
  제거했다. canonical create는 레거시 공개 컬럼을 `false`로 두고 update는 기존 값을 보존해 원본 저장이
  공개 상태를 바꾸지 않는다. Study의 DB enum은 호환을 위해 유지하지만 UI에서는 `작성 중/작성 완료`로만
  표현하며 실제 공개 여부는 `공개 페이지 > 학습 구성`과 활성 schema v3 snapshot이 결정한다. 이 변경은
  frontend Prettier·TypeScript·ESLint·production build, backend 전체 Spotless·test·bootJar를 통과했다.
  Compose에서 backend·worker·frontend·nginx를 다시 빌드한 뒤 전체 서비스 health를 확인했고, 가입부터
  schema v3 익명 공개 snapshot까지의 6단계 UAT와 Workspace·Profile revision·Study·Experience Tree·
  Competency·핵심 프로젝트·PDF·통계·초대·폐쇄·Vector cleanup을 포함한 9단계 격리 E2E도 통과했다.
  원본 API에 legacy 공개 값을 직접 보내는 회귀 요청도 생성 시 `false` 고정, 수정 시 기존 값 보존을
  확인한다. 운영에는 배포하지 않았다.
- 2026-08-12 지원·출력 경계를 공개 페이지와 분리했다. 인증된
  `/api/workspaces/{slug}/print-templates/manage/source`는 현재 Workspace의 Profile·Experience·Project·
  Skill·Competency 원본 전체를 출력 편집기에 제공하고, 방문자 인쇄는 기존 활성 publication snapshot만
  사용한다. `PrintTemplate`의 포함·제외·순서·맞춤 문구를 출력 구성으로 정의하고 수동 생성·수정·복원마다
  `SNAPSHOT` revision을 저장한다. 관리 화면에서 변경 이력과 복원을 제공하며 복원된 상태도 새 revision으로
  보존한다. Experience 원본 UI와 frontend 계약에서는 `resumeAvailable`을 제거했고 DB 컬럼과 backend
  호환 입력은 다음 제거 migration 전까지 유지한다. frontend ESLint·production build와 backend 전체
  Spotless·core/api test·bootJar는 통과했다. Docker Hub credential helper가 `node:22-alpine` 및
  Dockerfile frontend metadata 조회에서 멈춰 정식 Dockerfile 재빌드는 완료하지 못했지만, 기존 로컬
  runtime image에 검증된 backend JAR와 Next standalone 산출물만 덧씌운 로컬 검증 image로 Compose를
  기동했다. 전체 core service health를 확인했고 6단계 가입·온보딩 UAT에서 비공개 Workspace의 인증 출력
  원본 조회, 익명 접근 차단, 첫 공개 전 관리 인쇄, `SNAPSHOT` 생성·수정·복원을 확인했다. 이어 9단계 교차
  Workspace 격리 E2E도 통과했다. 임시 Dockerfile은 제거했으며 정식 image나 운영에는 배포하지 않았다.
- 2026-08-12 비공개 Workspace의 출력 미리보기를 사람이 확인할 수 있도록 로컬 전용 fixture를 추가했다.
  `scripts/dev/seed-output-preview-demo.sql` 상단의 `@workspace_slug`를 대상 slug로 맞춘 뒤 아래 명령으로
  `[DEMO]` 경력 1건, 프로젝트 1건, 상세 성과, 기술 4개, 대표 역량 1건을 반복 생성할 수 있다. 기존 Profile과
  사용자가 만든 기술 overlay는 변경하지 않는다. 확인 후에는 cleanup 스크립트로 이 fixture가 만든 레코드만
  제거한다. 두 스크립트는 운영 DB에 실행하지 않는다.

  ```bash
  docker compose exec -T backend-db sh -lc \
    'mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
    < scripts/dev/seed-output-preview-demo.sql

  docker compose exec -T backend-db sh -lc \
    'mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
    < scripts/dev/cleanup-output-preview-demo.sql
  ```

- 2026-08-12 접힌 Workspace 관리 사이드바에서는 펼치기 버튼 하나만 메뉴 위에 겹쳐 고정하지 않는다.
  사이드바 전체 폭의 불투명한 sticky header를 확보하고 메뉴 목록은 그 아래에서 스크롤하게 해 첫 메뉴
  아이콘이 버튼 뒤로 비치는 현상을 막았다. 접힌 사이드바의 상단 패딩도 제거하고 메뉴 여백을 nav 내부로
  옮겨 sticky header가 테두리 바로 아래부터 덮게 함으로써 둥근 상단 중앙에 아이콘 일부가 새는 현상도
  차단했다. 펼친 상태의 기존 접기 버튼 위치와 사이드바 독립 스크롤은 유지했으며 frontend ESLint와
  `git diff --check`를 통과했다.
- 2026-08-12 Workspace 관리 헤더의 `메인페이지`는 공개 발행 여부와 무관한 플랫폼 루트(`/`)로
  이동한다. Workspace 공개 URL(`/workspace/{slug}`)은 활성 publication snapshot이 있을 때만 방문자
  페이지가 존재하며, 미발행 상태의 404는 공개 데이터가 없음을 감추는 의도된 fail-closed 동작이다.
  공개 결과 확인은 발행 관리의 `공개 페이지` 또는 미리보기 진입점을 사용한다. 또한 PDF 자동 배치는
  각 atom의 실제 DOM 높이에 이미 포함된 padding과 margin 외에 가상의 기본 간격을 중복 누적하지 않고,
  사용자가 지정한 간격만 별도로 계산한다. 이로써 항목 수에 비례해 계산 높이만 부풀어 다음 섹션이
  통째로 밀리고 앞 페이지가 크게 비는 현상을 방지한다. 변경 파일 frontend ESLint(기존 미사용 경고
  4건 외 오류 없음)와 production build를 통과했고, bind mount된 Compose frontend가 실행 중임을
  확인했다. 로그인 세션이 있는 브라우저에서의 시각 재확인과 운영 배포는 하지 않았다.
- 2026-08-12 일반 사용자의 복귀 동선을 플랫폼 메인이 아닌 계정의 Workspace로 정리했다. 공개 페이지
  우측 계정 프로필 메뉴는 현재 계정과 모든 Workspace membership을 보여주며 OWNER·ADMIN·EDITOR는
  해당 Workspace 관리 화면으로, VIEWER는 공개 페이지로 이동한다. 현재 열람 중인 Workspace도 별도
  표시한다. 모바일 페이지 메뉴에도 같은 Workspace 이동 목록을 제공한다. Workspace 관리 헤더의
  `메인페이지`는 플랫폼 역할이 있는 운영자에게만 노출하며 일반 계정에는 숨긴다. 권한 판정은 기존
  `/api/auth/me`의 membership과 platform role만 사용하고 다른 Workspace의 비공개 데이터를 추가로
  조회하지 않는다. frontend 대상 파일 ESLint(기존 미사용 경고 4건 외 오류 없음)와 production build를
  통과했다. 로그인 상태 시각 확인 전이며 운영에는 배포하지 않았다.
- 2026-08-12 계정 프로필 메뉴가 Workspace 이동의 단일 진입점이 되면서 플랫폼 메인 헤더의 일반 사용자
  `내 워크스페이스` CTA를 제거했다. 플랫폼 운영자의 `플랫폼 운영` 진입점은 유지한다. 프로필 메뉴의
  Workspace 항목은 테두리·배경·아이콘·hover/focus 상태·이동 방향 표시와 `관리 열기/페이지 열기` 문구를
  갖는 전체 클릭 카드로 변경해 단순 정보 행으로 오인하지 않게 했다. 모바일 Workspace 목록도 동일하게
  클릭 가능한 카드 형태를 사용한다. frontend 대상 파일 ESLint와 production build를 통과했다. 로그인
  상태 시각 확인 전이며 운영에는 배포하지 않았다.
- 2026-08-12 계정 프로필 메뉴의 Workspace 이름이 이동 문구와 한 줄 폭을 경쟁해 잘리던 레이아웃을
  수정했다. 메뉴는 화면 폭을 넘지 않는 최대 24rem을 사용하고, 카드에서 이름과 `역할·이동 목적`을 두
  줄로 분리하며 이름은 말줄임 대신 자연스럽게 줄바꿈한다. frontend 대상 파일 ESLint와 production
  build를 통과했으며 운영에는 배포하지 않았다.
- 2026-08-12 PDF 페이지 계산에서 조건부 렌더링 결과가 비어 있는 atom의 `0px` 실측값을 버리고 타입별
  추정 높이로 되돌리던 오류를 수정했다. 이력서와 포트폴리오 측정기는 0px도 height map에 보존하고,
  공통 레이아웃 엔진은 값의 truthy 여부가 아니라 존재 여부로 fallback을 결정한다. 화면에 없는 항목이
  계산상 공간만 차지해 다음 상세 항목을 밀어내는 현상을 방지한다. frontend 대상 파일
  ESLint(기존 `dragRef` 미사용 경고 1건 외 오류 없음)와 production build를 통과했다. 로그인 상태
  시각 확인 전이며 운영에는 배포하지 않았다.
- 2026-08-12 이력서 기술 스택 구성 화면의 데이터 경계를 정리했다. 고정된 `DB 60개` 문구와 달리
  실제 모달에는 Workspace 원본 기술만 전달되어 공용 카탈로그 기술이 검색되지 않던 문제를 수정했다.
  화면은 Workspace 원본 수와 공용 카탈로그 수를 분리해 표시하며, 카탈로그에만 있는 기술은 사용자가
  `핵심 기술` 또는 `프로젝트·학습` 위치를 선택하면 Workspace 원본에 추가한 뒤 현재 출력 템플릿에
  포함한다. 기존 Workspace 원본 기술의 활용 구분은 바꾸지 않고, 출력 위치는 PrintTemplate의
  `contentOverrides.skillGroupOverrides`에 기술 ID별로 저장한다. 과거 `WORK` 활용 구분도 출력에서는
  `WORK_EXPERIENCE`와 같은 핵심 기술로 호환한다. frontend 대상 파일 ESLint(기존 `dragRef` 미사용 경고
  1건 외 오류 없음)와 production build를 통과했다. 인증 세션이 없는 테스트 브라우저에서는 관리 출력
  원본 API가 401을 반환해 실제 화면 시각 확인은 하지 못했으며 운영에는 배포하지 않았다.
- 2026-08-12 출력 기술 스택 모달을 `선택된 기술`과 `카탈로그에서 추가` 화면으로 분리했다.
  `선택된 기술`은 현재 템플릿의 노출 기술과 `핵심 기술`/`프로젝트·학습` 배치를 확인·이동하는 기준
  화면이며, `카탈로그에서 추가`는 공용 카탈로그 검색과 Workspace 원본 추가, 출력 포함·제외 및 영역
  이동을 담당한다. 화면을 전환하는 것만으로는 출력 구성이 변경되지 않는다.
- 2026-08-12 문구 인라인 편집 모드에서 기술 스택의 화면용 선택 버튼이 `print:hidden`으로 제거되며
  기술명까지 인쇄되지 않던 문제를 수정했다. 화면에서는 선택 버튼을 유지하고, 인쇄 매체에서는 같은
  현재 템플릿 값을 읽는 정적 기술명 요소를 별도로 렌더링한다. 따라서 편집 모드를 끄거나 템플릿을
  먼저 저장하지 않아도 현재 선택·배치된 기술이 브라우저 PDF 인쇄에 포함된다.
- 2026-08-12 자동 페이지 분할과 사용자의 `N페이지로 강제` 배치 책임을 분리했다. 자동 분할은 실측
  A4 경계를 지키지만, 강제 배치는 사용자가 빈 공간을 직접 활용하려는 명시적 override이므로 자동
  판단보다 우선한다. 강제 배치값을 페이지 계산 직후 자동 삭제하지 않으며, 사용자가 화면의 강제 배치
  해제 버튼으로 되돌린다.
- 2026-08-12 페이지 atom 높이를 `offsetHeight`만으로 측정하면서 섹션 헤더의 `margin-top`과
  `margin-bottom`을 누락해, 계산상 한 페이지이지만 실제 DOM은 하단 경계를 넘던 문제를 추가로
  수정했다. 페이지 엔진에는 콘텐츠·padding·border 높이와 계산된 외부 세로 margin을 합산해
  전달한다.
- 2026-08-12 인쇄 미리보기 구성 관리의 드래그 순서 UI에 삽입 위치 표시를 추가했다. 마우스는 대상
  카드의 위·아래 절반을 기준으로 `before`/`after`를 계산하고, 터치·펜은 현재 형제 순서를 기준으로
  같은 위치를 계산한다. 섹션과 경력·프로젝트 등의 재귀 하위 항목 모두 실제 저장될 카드 경계에 파란
  선과 `여기에 배치` 배지를 표시하며, 표시 요소는 레이아웃 높이를 바꾸지 않아 드래그 중 카드가
  흔들리지 않는다. 고정 섹션은 드롭 대상으로 안내하지 않는다. frontend 대상 파일 ESLint와 production
  build를 통과했고, 소스 bind mount를 사용하는 Compose `frontend-next`가 실행 중이며 인쇄 경로 요청이
  200인 것을 로그로 확인했다. 로그인 브라우저의 실제 드래그 시각 확인은 사용자가 수행해야 하며
  운영에는 배포하지 않았다.
- 2026-08-12 구성 관리의 `기술 스택` 아래에 `핵심 기술 스택`과 `프로젝트/학습` 출력 그룹을
  독립 항목으로 노출했다. 두 그룹은 기존 `skills-group:CORE`,
  `skills-group:PROJECT_LEARNING` 출력 ID를 사용하므로 전체 기술 스택과 별개로 포함·제외할 수 있고,
  `group:skills` 순서 override로 출력 순서도 변경·저장된다. 기술 원본의 활용 구분이나 Workspace
  데이터는 수정하지 않으며 현재 출력 템플릿 구성에만 영향을 준다. frontend 대상 ESLint는 기존
  `dragRef` 미사용 경고 1건 외 오류 없이 통과했고 production build도 통과했다. 소스 bind mount의
  Compose 개발 화면에는 별도 재배포 없이 반영되며, 운영에는 배포하지 않았다.
- 2026-08-12 인쇄 미리보기와 실제 PDF에서 `기술 스택`, `핵심 역량`, `직장 경력`, `핵심 프로젝트`,
  `학력·교육 및 자격증`, `사전질문`에 공통 적용되는 섹션 제목을 `14pt/1.25`에서
  `12.5pt/1.2`로 조정했다. 본문 `10pt`보다 높은 정보 위계는 유지하면서 제목이 차지하는 시각적·세로
  공간을 줄였다. 이 규칙은 `.resume-page`와 인쇄 매체에만 적용하며 공개 웹페이지 타이포그래피는
  변경하지 않는다. production build를 통과했으며 소스 bind mount의 Compose 개발 화면에서 직접
  확인할 수 있다. 운영에는 배포하지 않았다.
- 2026-08-12 경력·프로젝트 상세 atom 앞의 반복 `상세 경험` 라벨을 제거하고, 세부 항목의
  세로 padding을 축소했다. 회사 정보는 `회사명·고용형태`와 `기간`을 하나의 메타 행에 배치하고,
  인라인 편집이 필요한 회사명에만 내용 너비를 허용해 기존 `width: 100%` 램퍼가 고용형태를
  다음 줄로 밀어내던 문제를 제거했다. `FULL_TIME` 등 표준 고용 코드는 인쇄물에서
  `정규직` 등의 사용자 표시어로 변환하며, 이미 자유 문자열로 저장된 값은 그대로 유지한다. frontend
  ESLint는 기존 `dragRef` 미사용 경고 1건 외 오류 없이 통과했고 production build도 통과했다.
  운영에는 배포하지 않았다.
- 2026-08-12 Compose의 `frontend-next`가 예외·OOM 로그 없이 `ExitCode 0`으로 종료되어
  `localhost:3000`이 연결 거부된 사례를 확인했다. 즉시 `docker compose up -d frontend-next`로
  복구했고 `/`와 Workspace 인쇄 route의 HTTP 200을 확인했다. 정확한 종료 신호의 발신자는
  로그만으로 특정할 수 없으므로 특정 빌드를 원인으로 단정하지 않는다. 개발 프론트가 다시
  예기치 않게 정상 종료되면 자동 복구되도록 `restart: unless-stopped`를 적용했다. 사용자가
  `docker compose stop frontend-next`로 명시적으로 중지한 경우는 재시작하지 않는다.
- 2026-08-12 문구 편집 모드에서 사전질문 원본이 0건일 때 편집 진입점만 제공하려고 빈
  `cover-letter-header` 출력 atom을 추가해, 같은 내용인데도 편집 모드에서 빈 섹션과 추가 페이지가
  생기던 문제를 수정했다. 빈 사전질문의 첫 추가 버튼은 A4 캔버스 밖 편집 안내 바에 배치하고, 기술
  선택·사전질문 추가 등 페이지 내부 편집 버튼은 절대 배치와 `print:hidden`으로 처리해 측정 높이에
  참여하지 않게 했다. 따라서 내용과 출력 구성이 같으면 편집 모드 전환만으로 atom 집합과 페이지 수가
  달라지지 않으며, 실제 문구 수정으로 줄바꿈 높이가 변할 때만 페이지를 다시 계산한다. 현재 페이지
  엔진은 세로 A4용 1차원 흐름과 별도 DOM 페이지 경계까지 구현되어 있다. 향후 좌우·지그재그 배치는
  현재 `pageIndex`를 확장하는 방식이 아니라 ADR-004의 안정적인 page/region/placement 모델을 먼저
  도입한다. frontend Prettier와 production build는 통과했고 ESLint는 기존 `dragRef` 미사용 경고 1건
  외 오류가 없다. Compose `frontend-next` 실행과 `/`, Workspace 인쇄 route HTTP 200을 확인했다.
  로컬에만 반영했으며 운영에는 배포하지 않았다.
- 2026-08-12 ADR-004 `OutputLayout` v1을 실제 인쇄 편집 UI에 연결했다. 각 A4 페이지의 상단에서
  1열/2열을 전환할 수 있고, 2열에서는 atom 또는 연결된 상세 atom 묶음을 좌우 region으로 끌어
  배치한다. drop 대상 열은 파란 점선과 안내 문구로 표시하며, 열 DOM의 실제 높이가 페이지 콘텐츠
  높이를 넘으면 빨간 `열 높이 초과` 경고를 표시한다. 2열에서 좁아진 텍스트 높이를 다시 1열 paginator
  합계에 넣지 않아 편집 중 페이지 수가 왕복하지 않게 했다. 배치는 기존 템플릿 snapshot의
  `__outputLayout`에 저장되고 `__forcedPageOverrides` 호환 projection도 함께 유지한다. 자유 폭·span·
  지그재그 grid는 아직 구현하지 않았다. `frontend-next`의 TypeScript 검사와 production build를
  통과했고, ESLint는 기존 `dragRef` 미사용 경고 1건 외 오류가 없다. Compose에서는 backend health와
  frontend 실행 상태를 확인했으며 `/`, Workspace 인쇄 route, `/api/health`가 모두 HTTP 200으로
  응답했다. 인증 세션이 없는 자동 브라우저에서는 편집 캔버스까지 진입할 수 없으므로 좌우 drop과
  저장·재진입 동작은 비공개 베타 계정으로 수동 확인한다. 로컬에만 반영했으며 운영에는 배포하지 않는다.
- 2026-08-12 최초 2열 전환 시 placement가 없는 atom을 모두 왼쪽 열에 표시해 오른쪽이 비고,
  1열용 회사명·기간 행이 반쪽 폭에서 잘리던 문제를 수정했다. 섹션 헤더와 첫 본문, 본문과 상세 atom을
  하나의 의미 블록으로 묶고 원래 읽기 순서를 유지하는 분할 경계 중 양쪽 실측 높이 차가 가장 작은
  위치를 선택한다. 2열 버튼을 다시 누르면 현재 페이지를 이 기준으로 재분배하며 이후에는 개별 atom을
  좌우로 이동할 수 있다. 2열 전용 CSS는 기간 행의 안전한 줄바꿈과 섹션 여백만 조정하고 내용을
  축소하거나 자르지 않는다. TypeScript, production build와 ESLint(기존 `dragRef` 경고 1건 외 오류
  없음)를 통과했고 Compose Workspace 인쇄 route HTTP 200을 확인했다. 운영에는 배포하지 않았다.

## 12. 장애 대응 메모

### `/admin`에서 `workspaces[0]` 오류

원인: 새 프론트와 구버전 backend의 `/api/auth/me` 응답 계약 불일치.

대응:

1. 브라우저 강력 새로고침
2. backend가 새 응답을 제공하는지 확인
3. frontend의 `normalizeMe()`가 누락 배열을 빈 배열로 처리하는지 확인
4. 배포 순서가 backend → worker → frontend였는지 확인

### Docker Desktop에 `backend-run-*`이 여러 개 표시됨

`docker compose run backend`는 Compose의 정상 `backend` 서비스와 별도로 one-off 컨테이너를 만든다.
명령이 종료되지 않았거나 `--rm` 없이 실행하면 Docker Desktop에 `backend-run-*`으로 남는다.

- 일회성 명령은 `docker compose run --rm backend ...` 형식으로 실행한다.
- 정상 서비스는 `docker compose ps`에서 확인한다.
- 정리 전 `docker inspect <name>`의 `com.docker.compose.oneoff=True`를 확인하고 해당 one-off 컨테이너만
  제거한다. DB나 이름이 고정된 `self-intro-backend` 서비스 컨테이너는 함께 제거하지 않는다.

### Finder 휴지통 복원 후 `frontend-next`가 `EPERM`으로 종료됨

macOS Finder로 프로젝트를 휴지통에서 복원하면 복원된 디렉터리에 `com.apple.macl` 또는
`com.apple.provenance` 확장 속성이 붙을 수 있다. Docker Desktop bind mount가 이를 가진 파일을
읽지 못하면 `scandir '/app/app'`, `open '/app/.env.local'`, `open '/app/tsconfig.json'` 같은 `EPERM`
오류와 함께 `frontend-next`가 종료된다.

1. `docker compose ps -a frontend-next`와 `docker compose logs --tail=100 frontend-next`에서 위 증상을
   확인한다.
2. `ls -ldeO@ frontend-next frontend-next/app frontend-next/.env.local frontend-next/tsconfig.json`으로
   복원된 경로의 확장 속성을 확인한다.
3. 프로젝트 루트에서 아래처럼 확인된 macOS 복원 속성만 제거한다. 다른 확장 속성이나 Docker volume은
   함께 삭제하지 않는다.

   ```bash
   xattr -dr com.apple.macl frontend-next
   xattr -dr com.apple.provenance frontend-next
   ```

4. `docker compose up -d frontend-next`로 프런트만 다시 시작한다.
5. 로그의 `Ready`와 `curl -I http://127.0.0.1:3000/`의 `200`을 확인한다. 소스와 DB volume은 이 절차로
   변경되지 않는다.

### MFA 등록 화면에서 시작 실패

1. `MFA_ENCRYPTION_KEY`가 주입됐는지 확인한다.
2. Base64 디코딩 결과가 정확히 32바이트인지 확인한다.
3. Secret 원문을 로그나 화면 캡처에 남기지 않는다.
4. 운영 키가 유실된 경우 임의 DB 수정으로 우회하지 말고 복구 절차 구현 전 배포를 중단한다.

### 복구 코드 로그인 후 관리 화면 대신 MFA 복구 화면이 표시됨

의도된 동작이다. 현재 비밀번호를 다시 확인하고 새 인증 앱의 QR을 등록한다. 화면을 닫거나 15분이
지나 복구 세션이 만료됐다면 남아 있는 미사용 복구 코드로 다시 로그인한다. 새 TOTP 검증 전에는 기존
인증 앱 설정이 유지되며, 검증 완료 후에는 모든 기기에서 로그아웃된다.

### 로그인 후 바로 403

플랫폼 계정이 MFA 미등록 상태면 의도된 제한이다. `/api/auth/me`의
`mfaEnrollmentRequired`와 MFA 등록 화면 노출 여부를 확인한다.

### Workspace Skill 목록이 500을 반환함

1. backend 로그에서 `SkillResponse.from(WorkspaceSkill)` 경로의 `LazyInitializationException`인지 확인한다.
2. `WorkspaceSkillRepository.findAllByWorkspaceIdOrderByDisplayOrderAsc`가 `skill` entity graph를 유지하는지
   확인한다. OSIV를 켜서 우회하지 않는다.
3. 요청 Workspace의 Membership 인가와 `workspace_id` 조건을 제거하거나 전역 `/api/skills`로 대체하지
   않는다.
4. 권한 있는 사용자 조회 200, 빈 다른 Workspace 200, 타 Workspace 접근 404 회귀 테스트를 함께 실행한다.

### Vector sync DLQ에 메시지가 쌓임

1. 운영자는 RabbitMQ 관리 화면에서 `selfintro.queue.vector-sync.dlq`의 **건수와 오류 header만** 확인한다.
   payload에는 개인정보가 있으므로 캡처·메신저·일반 로그로 복사하지 않는다.
2. AI Worker 로그와 Oracle/NVIDIA 연결 상태를 확인하고 원인을 먼저 복구한다.
3. `GET /api/v1/vector-sync/reconciliation` dry-run에서 고아 namespace 수를 확인한다.
4. 플랫폼 운영자 전용 전체 vector backfill은 먼저 고아 namespace를 삭제하고 현재 원본을 재생성하므로
   update·delete 이벤트 누락을 모두 source of truth에서 복구한다. DLQ 원문을 수동 복사해 재발행하는
   방식보다 이를 우선한다.
5. 재처리 후 dry-run의 고아 namespace가 0인지 확인한다.
6. 검증 전 DLQ를 purge하지 않는다. 기본 7일 TTL 전에 복구하지 못하면 개인정보 삭제 정합성을 수동
   감사하고 incident로 기록한다.

## 13. 문서 갱신 규칙

다음 항목을 변경하면 이 문서를 같은 PR 또는 작업 단위에서 반드시 수정한다.

- 환경변수와 Secret
- 인증·MFA·세션·권한 정책
- Workspace 소유권과 공개 범위
- migration 및 데이터 복구 절차
- OCI/AWS/Azure adapter와 Kubernetes 설정
- Docker Compose 실행·검증 방법
- 배포 순서와 출시 차단 조건

각 갱신에는 구현 여부, 실제 검증 결과, 운영 배포 여부를 구분해 기록한다.

## 14. OutputLayout v2 로컬 검증 기록

- 2026-08-12 인쇄 배치를 페이지 전체 1·2열 방식에서 `Page → Row → Column → Placement` 구조로
  확장했다. 페이지 도구에서 빈 Row를 먼저 만드는 방식은 큰 공백과 의미 없는 빈 영역을 만들기 때문에
  제거했다. 기존 atom을 대상 atom의 왼쪽·오른쪽 drop zone으로 옮기면 같은 Row의 Column으로 즉시
  묶이며, 기존 Row의 2열 폭과 Column 간격은 후속 조정할 수 있다. 저장돼 있던 빈 Row는 렌더링에서
  제외하고 v1 저장본은 첫 Row로 자동 승격한다.
- 페이지 여백은 템플릿 공통 `top/right/bottom/left` mm 값으로 저장하며 각 값은 5~30mm로 제한한다.
- 인쇄 프리뷰의 전역 설정은 상단에 개별 버튼을 늘리지 않고 왼쪽 `문서 설정` 패널에서 관리한다.
  패널은 `용지`, `글꼴·간격`, `구성`, `보기`, `템플릿` 탭으로 구분한다.
- `글꼴·간격` 탭은 본문 줄 간격을, `구성` 탭은 섹션 노출·순서 패널을, `보기` 탭은 편집
  가이드와 화면 맞춤을, `템플릿` 탭은 불러오기·Workspace 저장·브라우저 임시 저장을 제공한다.
- 상단 툴바에는 실행 취소·다시 실행, 문서 설정, 확대, 문구 편집, AI 대화, 저장 메뉴, 인쇄와
  닫기처럼 현재 작업에서 즉시 실행하는 기능만 남긴다. 서버 템플릿 저장과 브라우저 저장은 하나의
  `저장` 메뉴로 통합하되 저장 위치와 지속 범위를 각각 표시한다.
- 출력 전용 보충 내용은 상단 편집 안내 바에서 만들지 않는다. 오른쪽 `구성 관리` 하단의
  `사용자 정의 섹션 추가`에서 생성하며, 한 문서에 여러 사용자 정의 섹션과 각 섹션별 여러 항목을
  만들 수 있다. 이 내용은 Workspace 원본 이력에 쓰지 않고 인쇄 템플릿의 `contentOverrides`에
  저장한다. 지원 공고에서 불러온 문항은 별도의 `지원 공고 문항` 묶음으로 유지한다.
  상하 여백 변경은 paginator의 실제 콘텐츠 높이에도 반영해 미리보기와 브라우저 인쇄 계산을 맞춘다.
- 인쇄 편집 툴바는 최대 100단계의 로컬 Undo/Redo를 제공한다. 블록 배치·페이지 고정·노출 여부·순서·
  간격·줄간격·기술 구성·인라인 문구·추가 항목처럼 출력 결과를 바꾸는 상태만 기록하고, 확대율·패널
  열림 같은 보기 상태는 제외한다. 버튼과 `Ctrl/Command+Z`, `Ctrl/Command+Shift+Z`(`Ctrl+Y` 포함)를
  지원하며 입력창과 contenteditable에 포커스가 있을 때는 브라우저의 기본 텍스트 Undo를 우선한다.
- 줄간격·열 폭·열 간격·페이지 여백·인라인 문구처럼 짧은 시간 안에 연속 변경되는 같은 필드는 700ms
  구간을 하나의 Undo 단계로 병합한다. 페이지 여백은 특정 페이지 도구가 아니라 템플릿 전역 `문서 설정`
  패널에서 관리하며 모든 페이지에 동일하게 적용한다. 패널은 캔버스 왼쪽에 고정되고 오른쪽 경계를
  드래그해 240~420px 범위에서 너비를 조절할 수 있다.
- 화면 프리뷰의 페이지 번호와 페이지 레이아웃 안내는 페이지 위 단일 헤더에 합쳐 중복 라벨과 겹침을
  제거한다. 이 헤더는 화면 편집용이며 인쇄 결과에는 포함되지 않는다.
- Row·Column 조합을 만들 때 모든 atom에 생기는 `placement`를 강제 페이지 override로 잘못 투영해,
  블록 하나를 옆으로 옮기면 페이지의 모든 블록에 `강제 위치 배치됨`이 표시되던 문제를 수정했다.
  `placement.pageLocked`를 별도 상태로 두고 사용자가 `N페이지로 강제`를 실행한 atom만 강제 배치로
  투영한다. v2 저장본에 `pageLocked`가 없으면 `false`로 정규화해 잘못 저장된 안내를 제거하며,
  강제 배치를 해제해도 기존 Row·Column 좌표는 유지한다.
- 이 변경은 프론트 출력 JSON 규격과 UI만 수정하며 신규 DB migration이나 인프라 종속성을 추가하지
  않는다. 운영에는 배포하지 않는다.

## 15. 지원 공고 화면의 데이터 소유권과 역할 경계

- `job_posting`에 저장됐다는 사실만으로 플랫폼 공통 카탈로그가 되지 않는다. 사용자 입력, URL 수집,
  운영자 입력 등 유입 방식과 관계없이 최초 상태는 `REVIEW_REQUIRED`이며, 재노출 권한 증빙을 통과한
  공고만 모든 Workspace가 참조하는 공유 카탈로그가 된다.
- 공유 카탈로그의 원본 수정·AI 보강·숨김·삭제와 권한 심사는 플랫폼 운영자만 수행한다. 단, 플랫폼
  운영자 역할은 승인 권한일 뿐 저작물 이용 허락을 대신하지 않는다.
- 일반 Workspace의 `공통 공고 찾기` API는 승인된 공고의 회사·직무·지역·고용형태·마감일·출처·원본
  URL만 반환한다.
  직무 상세, 지원·우대 자격, 수집 방식과 외부 식별자는 화면에서만 숨기는 것이 아니라 응답 계약에서
  제외한다. 사용자는 `원본 보기`로 채용 사이트에서 최신 내용과 마감 여부를 확인한다.
- Workspace 지원 기록은 공통 공고를 참조하되 상태·메모·관심도·매칭 결과·자기소개서·지원용 문서를
  해당 Workspace에만 저장한다. 다른 Workspace와 공유하거나 공통 원본에 역으로 반영하지 않는다.
- 두 화면은 데이터 소유권과 권한이 다르므로 API와 mutation은 분리한다. 사용자가 화면 차이를 역할
  오류로 오해하지 않도록 목록 탐색의 기본 패턴과 용어만 통일한다.
- Workspace `지원 현황`은 리스트·보드·마감 캘린더를 제공한다. 지도는 위경도 저장·노출·검색 반경의
  Workspace 계약이 확정되지 않아 이번 변경에 포함하지 않는다.
- 플랫폼 운영자는 운영자 계정으로 공통 카탈로그의 수집·원본 작업이 보이는지 확인하고, 베타테스터는
  별도 브라우저 세션에서 자기 Workspace의 상태·메모만 수정할 수 있는지 확인한다.
- `./scripts/e2e/workspace-isolation-compose.sh`는 임시 일반 사용자와 Workspace 두 세트를 생성해 같은
  공고를 각각 저장한 뒤, 한 Workspace의 상태·메모·관심도 변경이 다른 Workspace에 전파되지 않는지
  목록 API로 재검증한다. 최종 PDF object key와 템플릿 소유권 격리까지 확인하고 fixture를 자동 정리한다.
- 2026-08-12 기준 해당 프런트 파일 ESLint·TypeScript·프로덕션 빌드와 Compose 격리 E2E를 통과했으며
  운영에는 배포하지 않는다.


### 15.3 지원 현황과 공고 공유 심사 UI 경계

- 일반 Workspace에는 별도의 `지원 공고 관리` 메뉴를 두지 않는다. `지원 현황` 안에서 `내 지원`과
  `공고 가져오기`를 전환한다. 가져온 뒤의 상태·메모·자기소개서·이력서/PDF는 전부 Workspace 비공개
  overlay로 관리한다.
- `공고 가져오기`는 V223의 재노출 권한 심사를 통과한 공통 공고 검색과 Workspace 비공개 원본 등록을
  명확히 분리한다. 공통 공고는 플랫폼 원본을 참조하고, URL·직접 입력은 V224의
  `owner_workspace_id`와 `scope_key=WORKSPACE:{id}`가 설정된 별도 원본을 만든다.
- URL 가져오기는 `POST /api/worker/workspaces/{slug}/job-applications/manage/parse-url`에서
  Membership 쓰기 권한을 먼저 검사하고 저장 없이 해석 결과만 반환한다. 사용자가 원문과 결과를
  검토한 뒤 `POST .../private-sources`를 호출해야 비공개 원본과 지원 건이 함께 생성된다. 전역
  `/api/worker/job-postings/parse-url` 또는 운영자용 ingest API를 일반 사용자 UI에서 호출하지 않는다.
- 같은 Workspace와 URL 조합은 하나의 비공개 원본만 가진다. 지원 목록에서 제외하면 지원 건과 그
  하위 상태·자기소개서만 제거되고 원본은 남는다. 다시 가져올 때 기존 비공개 원본의 최신 입력값을
  갱신하고 새 지원 건을 연결하므로 중복 원본과 재등록 막힘이 생기지 않는다.
- URL 없는 직접 입력은 건마다 독립 원본을 만들 수 있다. 비공개 원본은 권한 심사 대상이나 공통
  카탈로그 후보가 아니며, 플랫폼 목록·수집·중복 병합·재수집 ID 경로에서 조회되지 않는다.
- 플랫폼 운영자 메뉴의 명칭은 `공고 공유 심사`이며, 개인 지원 파이프라인 UI를 노출하지 않는다.
  권한 근거·허락 주체·증빙·허용 범위·계약 버전·만료를 검토하고 승인·격리·공유 불가만 결정한다.
- 스크린샷 가져오기는 `POST .../private-sources/screenshots/uploads`에서 Workspace 전용 1회성 티켓을
  발급한 뒤 presigned PUT으로 업로드한다. PNG·JPEG·WebP만 허용하고 1장 8MB, 최대 5장, 전체 25MB로
  제한한다. 일반 Workspace 이미지 API의 공고 스크린샷 scope는 차단해 이 경계를 우회할 수 없다.
- `POST .../private-sources/screenshots/parse`는 현재 Membership 쓰기 권한과 티켓의 Workspace·상태·
  만료를 확인하고, 객체 저장소 HEAD 결과의 MIME·크기를 다시 검증한다. 객체 저장소 SDK 타입이나
  presigned URL을 AI Worker에 넘기지 않고 클라우드 중립 `ObjectStoragePort.read`로 서버 내부에서
  바이트를 읽는다. OCI S3 호환 저장소를 현재 사용하지만 AWS S3·Azure Blob 어댑터로 교체 가능하다.
- 해석 결과는 저장하지 않은 초안이다. 성공·실패 모두 원본 객체를 즉시 삭제하며 사용자가 목록에서
  제거하면 `DELETE .../uploads/{uploadId}`로 즉시 취소한다. 기본 티켓 만료는 30분, 만료 정리는 10분
  간격이다. `app.job-posting.workspace-screenshot-upload-ttl-minutes`와
  `app.job-posting.workspace-screenshot-cleanup-delay-millis`로 조정한다. 객체 키·이미지 내용은 로그에
  남기지 않는다.
- V225는 티켓의 Workspace 소유권·상태·만료와 객체 키를 저장한다. 배포 전 Flyway V225 성공, private
  bucket 저장, 해석 후 객체·티켓 상태 `DELETED`, 다른 Workspace 티켓의 400 차단을 확인한다.
- Compose에서는 API와 AI Worker의 `STORAGE_ENDPOINT`, bucket, credential, path-style 설정을 반드시
  동일하게 유지한다. API만 로컬 MinIO를 명시하고 Worker가 `.env`의 운영 OCI 값을 읽으면 presigned
  PUT은 성공해도 Worker의 HEAD/GET이 다른 저장소로 향해 `업로드가 완료되지 않았거나 파일을 찾을 수
  없습니다`로 실패한다. `docker compose config`로 두 서비스의 최종 환경 변수를 비교한 뒤 Worker를
  재생성하고 실제 PNG 업로드부터 분석·저장·임시 객체 삭제까지 확인한다.
- 2026-08-12 로컬 검증: core/AI/API 컴파일, `WorkspaceJobScreenshotUploadServiceTest`, 기존
  `WorkspaceJobApplicationPermissionTest`, frontend ESLint와 production build를 통과했다. 새 backend
  JAR로 backend와 AI Worker를 Compose 재생성했고, 소스 bind mount 방식의 frontend 개발 컨테이너에도
  변경이 반영되었다. backend와 AI Worker health가 `UP`, frontend `/`가 HTTP 200임을 확인했다. Compose
  MySQL에는 V225가 성공 적용되어 티켓 테이블과 Workspace FK·상태/만료
  인덱스가 생성되었다. 실제 로컬 테스트 계정에서 PNG 선택, presigned PUT, AI 분석, 추출 초안 검토·수정,
  비공개 지원 공고 저장까지 브라우저 UAT를 통과했다. 분석 결과는 회사명과 공고 제목의 경계를 완벽히
  구분하지 못했으므로 저장 전 검토 단계가 필수임도 확인했다. 성공한 원본은 분석 직후 삭제되었고,
  최초 실패 시 남은 임시 객체와 UAT 공고·지원·티켓은 검증 후 정리했다. 운영에는 배포하지 않았다.

#### V224 로컬 검증과 복구

- `job_posting`과 `job_posting_source_url`의 기존 URL 유일성은 `scope_key + URL` 유일성으로 바뀐다.
  따라서 같은 URL도 플랫폼과 서로 다른 Workspace가 각자 보관할 수 있지만, 한 Workspace 안에서는
  중복되지 않는다.
- 배포 전 `flyway_schema_history`에서 V224 성공을 확인하고, 플랫폼 원본의 `scope_key=PLATFORM`, 비공개
  원본의 `owner_workspace_id`와 `WORKSPACE:{id}` 일치를 대조한다. 두 Workspace에서 같은 URL을 등록해
  서로 다른 행이 생성되고, 상대 Workspace의 목록·상세 API가 404인지 확인한다.
- V224 이후 되돌리기는 서로 다른 scope에 같은 URL이 존재할 수 있으므로 단순 컬럼 삭제로 수행하지
  않는다. 먼저 URL 충돌 보고서를 만들고 보존할 원본을 결정한 뒤에만 이전 unique index를 복구한다.
### 15.1 외부 채용 사이트 수집 운영 원칙

- 공개 페이지라고 해서 자동 수집과 재배포가 자동으로 허용되는 것은 아니다. 출시 전 각 출처의 최신
  이용약관·robots 정책·API 조건을 확인하고, 공식 API나 서면 제휴가 있으면 이를 우선한다. 허가 범위가
  불명확한 출처는 운영 수집 대상에서 끄고 사용자가 직접 등록한 공개 원본 URL만 관리한다.
- 일반 사용자에게는 공고 본문·자격 요건·이미지·첨부 파일·원본 HTML을 재배포하지 않는다. 회사·직무·
  지역·고용형태·마감일처럼 탐색에 필요한 최소 사실 정보와 원본 링크만 제공하며, 원본 사이트의 로그인·
  접근 제한·봇 차단을 우회하지 않는다.
- 수집기는 출처별 활성화 스위치, 요청 속도 제한, 재수집 주기와 즉시 중단 수단을 가져야 한다. 만료된
  공고는 노출을 중지하고, 권리자 정정·삭제 요청이 오면 원본과 파생 검색·Vector 데이터까지 추적해
  처리한다.
- 최소 메타데이터와 링크만 제공하는 조치는 재전재 위험을 낮추지만 무단 자동 수집 자체를 허가하는
  근거는 아니다. 상업 SaaS 공개 전에는 출처별 이용 허락과 국내 저작권법상 데이터베이스제작자 권리,
  부정경쟁 위험을 법률 전문가와 별도로 검토한다.

### 15.2 공유 카탈로그 권한 심사와 V223 운영 절차

- V223은 `job_posting`에 권한 근거·증빙·허락 주체·허용 범위·약관 버전·철회 연락처·만료 시각과
  심사 상태를 추가한다. 기존 행은 전부 `UNKNOWN / REVIEW_REQUIRED`로 격리되며 자동 승인하거나
  추정 backfill하지 않는다.
- 허용하는 근거는 `EMPLOYER_DIRECT_SUBMISSION`, `WRITTEN_LICENSE`, `OFFICIAL_API_LICENSE` 세
  가지다. 공식 API도 저장과 회원 대상 재노출을 명시적으로 허용하는 약관이어야 한다. 단순 공개 URL,
  robots 허용, 운영자 판단, 출처 표시는 승인 근거가 아니다.
- 운영자는 관리 화면의 `공통 카탈로그 공유 권한`에서 다음을 모두 확인한다.
  1. 허락 주체가 공고 또는 데이터의 이용을 허락할 권한을 가졌는지
  2. 증빙 원본의 보관 위치와 계약·약관 버전을 다시 열어 확인할 수 있는지
  3. 허용 범위에 저장·검색·베타 사용자 대상 재노출이 포함되는지
  4. 만료·철회 조건과 연락처가 무엇인지
- 승인에는 권한 근거, 증빙 참조, 허락 주체, 권한 확인 내용, 허용 범위가 필수다. 만료된 권한은 승인할
  수 없고, 만료 시점 이후에는 별도 배치 없이 카탈로그 조회와 신규 저장이 즉시 거부된다.
- 공고 원본을 수정하면 기존 증빙이 수정본까지 포괄한다고 추정하지 않고 `REVIEW_REQUIRED`로 되돌린다.
  재승인 전까지 기존 Workspace 지원 기록은 보존하지만 공유 검색과 다른 Workspace의 신규 저장은
  차단한다.
- 모든 심사 변경은 `job_posting_permission_review_event`에 append-only 이력으로 남고 보안 감사에도
  기록한다. 이력은 근거를 대신하지 않으며, 증빙 원본은 별도 접근 통제된 저장소에 보관한다.
- 운영 API는 `PUT /api/admin/job-postings/{id}/permission-review`, 심사 이력은
  `GET /api/admin/job-postings/{id}/permission-review-events`다. Workspace 카탈로그 API와 저장 API는
  서버에서 같은 `isSharedCatalogEligible` 조건을 다시 검사하므로 프런트 숨김만으로 보호하지 않는다.
- 로컬 검증은 `JobPostingPermissionTest`, `WorkspaceJobApplicationPermissionTest`,
  `JobPostingCrudServiceTest`를 실행하고, Compose 기동 후 Flyway history의 V223 성공과 운영자 승인 전후
  Workspace 카탈로그 노출 차이를 확인한다. 이 절차는 로컬 검증용이며 별도 승인 전 운영 배포하지 않는다.

### 15.3 Workspace 공고 입력 경로 통합 회귀 검증

- 직접 입력, 원본 URL 가져오기, 스크린샷 가져오기는 서로 다른 수집 방식이지만 모두 현재 Workspace가
  소유하는 비공개 `job_posting` 원본으로 저장한다. 수집 방식은 각각 `MANUAL`, `URL_INGEST`,
  `IMAGE_INGEST`로 보존한다.
- 직접 입력은 존재하지 않는 원본 URL을 임의로 만들지 않는다. URL·스크린샷 입력으로 저장한 링크는
  `WORKSPACE:{workspaceId}` 범위에만 속하며, 다른 Workspace의 목록·상세 조회에서는 노출하지 않는다.
- 스크린샷 분석을 마치거나 사용자가 취소한 임시 객체는 삭제하고 티켓을 무효화한다. 만료 객체 삭제가
  실패하면 티켓을 먼저 삭제 처리하지 않아 다음 정리 주기에서 재시도할 수 있어야 한다.
- 2026-08-12 로컬 자동 검증에서 `WorkspaceJobApplicationPermissionTest`,
  `WorkspaceJobScreenshotUploadServiceTest`,
  `SaasSecurityFoundationIntegrationTest.workspacePrivateJobImportRoutesKeepAllSourcesInsideOwningWorkspace`를
  실행해 위 수렴 규칙, 다른 Workspace 접근 차단, 임시 객체 정리 재시도 계약을 확인했다. Gradle 결과는
  `BUILD SUCCESSFUL`이다.
- 로그인된 베타 계정의 실제 Chrome에서 지원하지 않는 파일 형식과 장당 8MB 초과 이미지를 각각
  선택해, 서버 요청 전에 오류 안내가 `alert`로 노출되고 분석 버튼이 비활성 상태로 유지되는지 확인했다.
  두 입력 이후 Workspace 81의 삭제되지 않은 임시 티켓 수는 0이었다. 분석 요청이 서버 검증에서
  실패하는 경우에도 프런트가 발급된 티켓을 취소하며, 취소가 실패한 객체는 30분 만료 정리가 재시도한다.
- 비로그인 브라우저에서 Workspace 지원 관리 주소로 직접 진입하면 원래 주소가 `next`에 보존된 로그인
  화면으로 이동하는 것을 확인했다. 로그인된 베타 계정의 정상 PNG 선택·분석·검토·비공개 저장 UAT도
  완료했다. 이 검증으로 운영 배포하지 않았다.

### 15.4 현재 변경 inventory와 관리 API 경계 재감사

- 2026-08-12 working tree 전체를 파일 단위로 다시 계산했다. 총 717개 경로를 9개 리뷰 세트로 분류했고
  `manual-review=0`이다. V220~V225는 SaaS schema, 공고 스크린샷 정리 scheduler는 Job·AI·Vector,
  이미지 scope 계약은 Workspace 콘텐츠, 출력 미리보기 fixture는 프런트 제품 흐름으로 귀속했다.
- Profile·Experience·Study의 일반 Workspace 관리 mutation은 canonical slug와 Membership 계약으로
  이미 전환되어 있으므로 미완료 범위에서 제외했다. 남은 API 경계 작업은 역할로 잠긴
  `/api/admin/**` 호환 endpoint와 canonical Workspace API가 없는 레거시 도메인의 유지·이관·제거
  결정을 뜻한다.
- inventory와 문서 경계만 정리했으며 stage·commit·운영 배포는 수행하지 않았다.

### 15.5 canonical Workspace API와 1차 관리자 호환 경로 제거

- `canonical API`는 같은 기능을 제공하는 여러 주소 중 앞으로 기준으로 유지할 공식 단일 경로를 뜻한다.
  Workspace 소유 콘텐츠는 `/api/workspaces/{slug}/...`와 Membership 검증을 기준으로 삼고, 플랫폼 운영
  기능만 `/api/admin/**`에 둔다.
- Study CRUD·AI, Competency CRUD·AI, Portfolio CRUD·AI의 기본 공개 Workspace 기반
  `/api/admin/**` 호환 endpoint를 제거했다. 관리 UI가 이미 canonical 경로를 사용하고 있었으며,
  Portfolio AI 생성에 남아 있던 마지막 호출도
  `/api/workspaces/{slug}/portfolio/case-studies/manage/{id}/revisions/generate`로 이관했다.
- 공통 학습 분류 원본 자체는 플랫폼 데이터로 유지하되, 기본 공개 Workspace를 암묵적으로 선택하던
  `/api/admin/study-taxonomy-curation` 호환 endpoint는 제거했다. Workspace의 공개 학습 분류 선택은
  slug와 Membership을 검증하는 canonical 구성 API만 사용한다. 공고 권한 심사·플랫폼 전체 방문
  통계·후원·외부 서비스 상태는 같은 원칙으로 `/api/admin/**`에 유지한다.
- 범용 이미지 업로드의 `/api/admin/images/presigned-upload` 호환 endpoint를 제거했다. 이미지 갤러리와
  Study Markdown 편집기는 Workspace slug를 필수로 전달하고
  `/api/workspaces/{slug}/images/presigned-upload`만 사용한다. 서버는 Membership 역할을 확인한 뒤
  해당 Workspace ID로만 저장 경로를 발급한다.
- 지원 공고 screenshot은 범용 이미지 endpoint에 합치지 않는다. 지원 건 생성 전 임시 private object,
  upload ticket, TTL·cleanup 계약이 있는 전용 Workspace screenshot 경로를 계속 사용한다. 이 경로는
  공개 콘텐츠 이미지와 생명주기가 다르기 때문이다.
- 사용되지 않는 레거시 화면의 옛 호출은 호환 endpoint로 네트워크 요청하지 않고 클라이언트에서 410으로
  중단한다. 활성 UI의 canonical 이관과 레거시 컴포넌트 제거를 분리해, 오래된 화면이 기본 Workspace를
  추정하여 다른 Workspace에 쓰는 동작을 막았다.
- `ImageUploadControllerTest`로 Workspace 역할 확인, Workspace ID 전달, 공고 screenshot scope 거부를
  고정했다. frontend lint와 production build를 함께 통과해야 이 경계 작업을 완료로 본다.
- 2026-08-12 최신 코드로 `backend`, `frontend-next`, `nginx` 이미지를 다시 빌드하고 컨테이너를
  재생성했다. backend health가 정상이며 Flyway 130개 migration과 schema V225가 최신 상태임을
  확인했다. 재생성 뒤 기존 Chrome 세션의 Workspace 관리·출력 화면과 관련 manage API가 200으로
  응답했고, 새 인앱 브라우저에서는 메인 화면 DOM 렌더링과 console error·warning 0건을 확인했다.
- 새 인앱 브라우저에는 인증 세션이 없으므로 실제 파일 선택부터 presigned PUT, 갤러리 재조회,
  다른 Workspace 접근 거부까지의 사용자 흐름은 로그인된 브라우저 UAT로 남긴다. UAT에서는 Network에
  `/api/admin/images/presigned-upload` 요청이 발생하지 않는지도 함께 확인한다.
- frontend API 모듈을 다시 역참조해 호출처가 0개인 Experience AI, Experience Tree mutation,
  PrintTemplate의 전역·`/api/admin/**` 메서드를 제거했다. 활성 화면은 각각 Workspace slug가 포함된
  canonical manage API만 사용한다. 공통 학습 자료·분류, 방문 통계, 후원, 공고 권한 심사처럼 실제 플랫폼
  운영 화면이 사용하는 관리자 API는 제거하지 않았다.
- 위 미사용 계약 제거 뒤 대상 ESLint, frontend production build, `git diff --check`를 통과했고 전체
  inventory는 717개·`manual-review=0`을 유지했다. 서버 호환 endpoint 제거는 보안 통합 테스트와 외부
  소비자 여부를 별도로 확인한 뒤 다음 경계 작업에서 진행한다.
- 후속 조사에서 Experience AI, Experience Tree 관리 mutation, PrintTemplate 관리의 활성 소비자가 모두
  Workspace canonical controller를 사용함을 확인해 기본 Workspace를 암묵적으로 선택하던 서버
  `/api/admin/**` 호환 endpoint도 제거했다. 공개 읽기 endpoint와 공통 플랫폼 운영 endpoint는 보존했다.
  `SaasSecurityFoundationIntegrationTest`에 세 관리자 namespace가 다시 등록되지 않는 회귀 검증을 추가했고
  해당 테스트는 단독 통과했다.
- 같은 보안 통합 테스트 클래스 전체 실행에서 기존 공고 fixture 1건이 200 대신 400으로 실패했다. 원인은
  제거한 controller가 아니라 권한 검증되지 않은 공통 공고를 Workspace에 재노출하지 못하도록 강화한
  정책(`공통 카탈로그 재노출 권한이 검증되지 않았거나 만료`)과 fixture가 맞지 않는 것이었다. 실제 정책은
  완화하지 않고, 테스트 공고에 권리자 직접 제출·허용 범위·증빙 참조·만료 시각을 명시했다. 보정 후
  `SaasSecurityFoundationIntegrationTest` 전체가 `BUILD SUCCESSFUL`로 통과했다.
- 활성 UI가 이미 Workspace canonical API를 사용하던 대표 프로젝트 배치도 기본 공개 Workspace를
  선택하던 `/api/admin/experience-placements` 호환 endpoint를 제거했다. 함께 제거한 두 endpoint가
  다시 등록되지 않도록 보안 통합 테스트에 회귀 검증을 고정했다. 이후 backend Spotless 및
  `SaasSecurityFoundationIntegrationTest` 전체, frontend ESLint와 production build를 모두 통과했다.
- 지원 공고의 플랫폼 관리자 경계도 같은 원칙으로 축소했다. `/api/admin/job-postings`에는 공통 공고
  목록·상세 읽기, 재노출 권한 심사와 append-only 심사 이력, dedup·좌표 backfill 정합성 작업만 남긴다.
  과거 개인 지원 CRUD·메모·저장/제외·지원 상태/이력·지망·Jobplanet·개인 설정 매핑은 제거했다. 활성
  Workspace UI는 이미 `/api/workspaces/{slug}/job-applications/manage/**`만 사용하며, 사용되지 않는
  레거시 UI의 옛 메서드는 네트워크 호출 없이 410으로 중단한다. RequestMapping 회귀 테스트는 플랫폼
  GET·권한 심사 PUT이 유지되고 개인 mutation이 다시 등록되지 않는지를 함께 검증한다.
- 이 변경은 로컬 코드와 테스트에만 적용하며 stage·commit·운영 배포하지 않는다.

### 15.6 고객 지원 접근 승인과 최소 진단 절차

- 고객 지원을 이유로 플랫폼 운영자가 Workspace 관리 화면이나 원문 데이터에 직접 접근하지 않는다.
  지원 담당자는 `고객 지원 접근` 화면에서 Workspace slug, 구체적인 사유, 필요한 진단 범위와
  15·30·60분 중 하나를 선택해 요청한다. 요청은 24시간 안에 승인되지 않으면 만료된다.
- 승인 주체는 해당 Workspace의 `OWNER`다. 소유자는 `지원 접근 승인` 화면에서 요청자, 사유, 범위와
  시간을 확인하고 승인·거절한다. 승인된 접근도 소유자와 요청자 모두 즉시 철회할 수 있다. 요청,
  승인, 거절, 철회는 최근 비밀번호 재인증을 요구한다.
- 현재 허용 범위는 `PROFILE_READ`, `EXPERIENCE_READ`, `STUDY_READ`뿐이다. 응답은 프로필 설정·공개
  여부, 경험 수, 학습 전체·공개 수 같은 최소 진단값만 반환한다. 이름·소개·이메일·전화번호·경험 및
  학습 원문은 반환하지 않으며 사용자 가장, 일반 Workspace 관리 권한, 쓰기 권한도 부여하지 않는다.
- 서버는 요청자 계정, 대상 Workspace, 범위와 활성 만료 시각을 매 조회마다 다시 검증한다. 활성 승인이
  없거나 범위가 맞지 않으면 리소스 존재 여부를 숨기는 404로 거부한다. 프런트 메뉴 노출은 보안 경계가
  아니며 `/api/ops/support-access/**`는 플랫폼 역할, `/api/workspaces/{slug}/support-access/**`는
  Membership `OWNER`를 서버에서 각각 검증한다.
- 보안 감사 이벤트는 `SUPPORT_ACCESS_REQUESTED`, `SUPPORT_ACCESS_APPROVED`,
  `SUPPORT_ACCESS_DENIED`, `SUPPORT_ACCESS_REVOKED`, `SUPPORT_DATA_ACCESSED`를 남긴다. 활성·범위
  검증 실패는 `SUPPORT_ACCESS_NOT_ACTIVE` 거부 사유로 기록한다. 감사 기록에 진단 원문이나 연락처
  값을 넣지 않는다.
- V227은 지원 요청과 선택 범위, 승인·거절·철회 주체 및 시각을 저장한다. 로컬 검증은
  `SupportAccessRequestTest`, backend bootJar, frontend TypeScript·대상 ESLint·production build와
  Compose backend 재빌드를 통과했다. Flyway에서 V227 적용 성공과 backend `UP`, frontend HTTP 200도
  확인했다. 플랫폼 운영자와 별도 Workspace OWNER fixture의 실제 요청→승인→세 범위 최소 진단→철회→
  철회 후 404 흐름 및 감사 이벤트도 `scripts/e2e/support-access-compose.sh`로 통과했다. 사람의 화면 UX
  확인과 운영 provider 설정을 마치기 전에는 운영 배포하지 않는다.

### 15.7 Account 탈퇴와 익명화 검증

- V228은 `app_user.withdrawn_at`을 추가한다. Account 탈퇴는 활성 Workspace OWNER와 플랫폼 역할을
  blocker로 다루며, 조건이 정리된 Account만 익명화한다.
- service 단위 테스트로 OWNER 차단과 일반 Membership 중지, 이메일·MFA·초대 식별자 제거,
  `ACCOUNT_WITHDRAWN` 감사 이벤트 계약을 검증했다.
- 2026-08-13 로컬 Compose에서 backend를 새 이미지로 재빌드·재생성했다. Flyway가 V227에서 V228로
  전진해 성공 이력을 남겼고, `app_user.withdrawn_at DATETIME(6) NULL` 생성과 backend health를
  확인했다. frontend TypeScript·ESLint·production build와 Account 탈퇴 service 테스트도 통과했다.
- `scripts/e2e/account-withdrawal-compose.sh`는 일회용 개인 초대와 일반 Account를 만들고 Mailpit 이메일
  확인, 서로 다른 두 로그인 세션, 탈퇴 준비 상태, 명시적 재인증 없는 DELETE 401, 재인증 후 탈퇴 204,
  두 세션 `/api/auth/me` 401, 기존 이메일·비밀번호 재로그인 401을 검증한다. DB에서는 `DELETED`,
  난수 로그인 ID, 이메일 제거, `withdrawn_at`, `ACCOUNT_WITHDRAWN` 감사 이벤트를 확인하고 fixture를
  종료 시 삭제한다. 2026-08-13 로컬 Compose 최종 실행은 전 단계 통과했다.
- 이 변경은 로컬 코드에만 적용하며 stage·commit·운영 배포하지 않았다. 법정·계약상 보존 기간과 운영
  복구 정책 확정은 출시 전 검증 단계로 남긴다.

### 15.8 Support Access Compose 인수 검증

- `scripts/e2e/support-access-compose.sh`는 임시 `SUPPORT` 역할 계정과 별도 Workspace `OWNER`를 만들고,
  운영 역할의 MFA 등록·TOTP 로그인부터 지원 접근 요청, OWNER 승인, `PROFILE_READ`·`EXPERIENCE_READ`·
  `STUDY_READ` 최소 진단, OWNER 즉시 철회, 철회 후 404 차단을 검증한다.
- 최초 실행에서 Workspace OWNER 승인 API가 컨트롤러의 OWNER 정책에 도달하기 전에 레거시
  `ROLE_ADMIN` 쓰기 규칙에 의해 403으로 막히는 설정 누락을 확인했다. 해당 Support Access POST 경로만
  인증 사용자에게 통과시키고 최종 권한은 `WorkspaceAccessPolicy`의 OWNER 검증이 담당하도록 수정했다.
- 2026-08-13 로컬 Compose 최종 실행에서 세 범위 진단과 요청·승인·접근 3회·철회·철회 후 거부 감사
  이벤트 수까지 모두 통과했다. fixture는 종료 시 삭제하며 운영 배포는 수행하지 않았다.

### 15.9 2026-08-13 SaaS 로컬 출시 게이트 재검증

- 검증한 코드 HEAD는 `test/saas-workspace-isolation-fixture`의 `57d0697`이고, 결과를 기록한 문서 branch까지
  포함하면 `main`보다 86개 commit, 772개 파일 앞선 적층 구조다. `main` merge·원격 push·운영 배포는
  수행하지 않았다.
- `docker compose build backend backend-worker frontend-next` 병렬 빌드가 통과했다. backend와 worker의
  BuildKit Gradle cache는 `sharing=locked`로 고정해 공유 journal lock timeout을 재발하지 않게 했다.
- Compose MySQL의 최신 Flyway 이력은 V224~V228을 포함해 모두 `success=1`이고 backend health는 `UP`다.
- `scripts/e2e/workspace-isolation-compose.sh` 9단계가 Profile, 공개 revision·rollback, canonical slug,
  Study·Experience Tree, Skill·Competency, 공통 공고의 Workspace별 지원 상태, 최종 PDF key·template,
  핵심 프로젝트, 통계·후원, 초대·역할·소유권 이전·폐쇄와 Vector cleanup을 모두 통과했다. 공통 공고는
  실행별 고유 URL과 승인 증적을 가진 fixture를 생성하고 종료 시 삭제하므로 기존 운영 데이터에 의존하지 않는다.
- `scripts/e2e/registration-onboarding-compose.sh`는 실제 Mailpit 확인 메일, 확인 전 로그인 차단, 일회용
  확인 링크, 첫 비공개 Workspace, 발행 전 404, schema v3 첫 발행과 공개 화면 200을 통과했다.
- `scripts/e2e/account-withdrawal-compose.sh`는 두 로그인 세션, 최근 비밀번호 재인증, 탈퇴 뒤 전체 세션
  만료, 기존 자격 증명 재로그인 차단, DB 익명화와 감사 이벤트를 통과했다.
- `scripts/e2e/support-access-compose.sh`는 SUPPORT MFA, OWNER 승인, 세 최소 진단 범위, 즉시 철회,
  철회 뒤 404와 감사 이벤트를 통과했다.
- 현재 HEAD에서 backend `./gradlew test`와 frontend `npm run build`가 모두 성공했다. 자동화된 로컬 출시
  게이트는 통과했으며 다음 단계는 운영자와 별도 베타 사용자가 브라우저에서 작성·공개 구성·AI·PDF,
  반응형 화면과 실패 복구 메시지를 직접 확인하는 사람의 UX UAT다.
- 2026-08-13 사람의 UX UAT를 인앱 브라우저에서 시작했다. 비로그인 제품 메인의 로그인·초대 가입 CTA,
  공개 데모의 데스크톱 렌더링과 console warning/error 0건을 확인했다. 390x844 viewport에서는 미리보기
  패널을 닫은 뒤에도 240px 관리 사이드바가 본문 폭을 차지해 콘텐츠가 읽을 수 없을 정도로 좁아지는
  결함을 확인했다. 모바일에서는 본문을 단일 열로 유지하고 관리 메뉴를 명시적인 오버레이 drawer로
  열고 닫도록 수정했으며, 아이콘만 남는 데모 상단 버튼에도 접근 가능한 이름을 부여했다. 이 변경은
  로컬 전용 후속 branch에서 검증하며 운영 배포는 수행하지 않는다.
- 별도 비공개 베타 Account의 초대 가입·메일 확인·로그인·첫 Workspace 생성, 원본 프로필 저장,
  공개 프로필 구성 초안, schema v3 첫 발행과 공개 페이지 렌더링, 로그인된 OWNER의 비공개 PDF 편집기
  진입을 실제 Chrome에서 연속 검증했다. 공개본은 v1에서 프로필 revision과 경험 revision을 고정했고,
  공개 페이지에는 선택된 이름·직무·소개·GitHub만 노출됐다. 일반 베타 Account에는 MFA를 요구하지 않았다.
- 원본 프로필 폼은 필수 항목이 화면 밖에 남아 있으면 저장되지 않지만 이유를 충분히 설명하지 못했다.
  필수 표시, 누락 필드명 오류 영역, 라벨과 입력 요소의 명시적 연결을 추가했다. 대상 ESLint를 통과했으며
  fixture 정리와 운영 배포는 전체 사람 UAT가 끝난 뒤 별도 단계에서 수행한다.
- 경험 원본으로 UAT 프로젝트를 추가한 뒤 경험 공개 구성 초안을 저장하고 v2·v3·v4를 발행했다. 각 발행은
  기존 v1~v3을 변경하지 않고 새 프로필·경험 revision과 공개 snapshot을 만들었고, 발행 전 초안은 공개
  화면에 반영되지 않았다. 경험 공개가 꺼진 채 타임라인·대표 프로젝트만 켜진 조합에서는 공개 화면에
  나타나지 않는 정상 동작이 사용자에게 결함처럼 보였다. 하위 노출을 켜면 부모 경험 공개도 자동으로
  켜고, 부모 경험 공개를 끄면 타임라인과 연결된 대표 배치도 함께 끄도록 관리 UI를 보정했다. 전체 사람
  UAT가 끝날 때까지 이 전용 fixture와 기존 revision은 유지하며 운영 배포는 수행하지 않는다. 실제
  Chrome에서 부모 공개 해제 시 타임라인·대표 배치가 함께 꺼지고 하위 노출 재활성화 시 부모 공개가 함께
  켜지는 것을 확인했다. v4는 profile revision #46, experience revision #46, 구성 v4를 고정했고 익명 공개
  경험 화면에서 UAT 프로젝트와 상세 링크를 렌더링했다. 대상 ESLint와 Next.js production build가
  통과했으며 Compose의 backend·DB·frontend-next·nginx를 포함한 실행 서비스도 정상이다.
- 별도 비공개 베타 Account로 Workspace 설정·원본 기록·공개 구성·지원/PDF 메뉴를 순회하고, 계정 정보에
  현재 Account·Workspace 역할·플랫폼 역할·로그아웃이 구분되어 표시되는 것을 확인했다. 일반 Account에는
  플랫폼 운영 메뉴가 노출되지 않으며 `/ops`를 직접 입력해도 운영 폼 없이 전용 차단 화면만 표시된다.
  다른 Workspace의 관리 URL을 직접 입력하면 데이터는 노출되지 않았지만 slug alias 확인 effect가
  `checking` 상태 전환 때 정리되어 요청 결과를 반영하지 못하고 무한 로딩하던 결함을 확인했다. effect가
  완료될 때까지 유지되도록 상태 의존성을 분리해 alias면 canonical 관리 URL로 이동하고, 미소속·미존재면
  명시적인 접근 불가 화면으로 종료되게 수정했다. 운영 배포는 수행하지 않았다.
- 같은 베타 Workspace에서 AI 학습 계획의 주간 가능 시간을 0분으로 설정하면 생성 버튼이 비활성화되고,
  300분과 빈 집중 목표로 생성하면 외부 AI provider를 호출하지 않는 Workspace 자료 검색 경로로 계획 #1이
  저장되는 것을 확인했다. 해당 Workspace에는 공개 학습 자료가 없어 후보 0개·연결 자료 0개와 자료 추가
  안내가 표시되는 것도 확인했다. 집중 목표를 입력하는 추천·피드백 경로는 NVIDIA NIM 호출과 비용·운영
  Secret에 의존하므로 이번 로컬 사람 UAT에서는 실행하지 않았고 provider 계약 검증 항목으로 남긴다.
- 검증 기준 HEAD `282b487`에서 frontend format·ESLint(error 0·warning 0)·TypeScript·production build와
  backend Spotless·전체 test를 통과했다. 같은 실행 중 Compose 환경에서 가입·Mailpit 확인·첫 발행,
  Account 탈퇴·전체 세션 만료·익명화, Support Access 승인·최소 진단·철회, 두 사용자·두 Workspace의
  9단계 격리 E2E를 연속 재실행해 모두 통과했다. fixture는 각 스크립트의 cleanup으로 정리되며 운영 배포와
  운영 provider 호출은 수행하지 않았다.
