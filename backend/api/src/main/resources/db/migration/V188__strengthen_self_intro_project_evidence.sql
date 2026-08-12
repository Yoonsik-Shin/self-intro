-- Self-Intro 프로젝트를 최신 소스와 커밋 기준으로 다시 구성한다.
-- 세부 사이트별 크롤링 사례는 하나의 수집 파이프라인으로 통합하고,
-- Java/Spring·RAG·운영 관측성처럼 지원 직무와 직접 연결되는 근거를 분리한다.

UPDATE experience
SET title = '이력·지원 관리 플랫폼 설계·운영 (Self-Intro)',
    summary = 'Java 21·Spring Boot와 Next.js로 경력 콘텐츠부터 채용공고 수집, RAG 기반 지원 문서 생성, 이력서 편집·PDF 출력까지 하나의 지원 워크플로우로 구축했습니다. API와 AI·크롤링 워커를 분리하고, ARM64 Kubernetes·ArgoCD 환경에 직접 배포해 운영하고 있습니다.',
    takeaway = '개인 소개 페이지를 넘어 실제 지원 과정에서 반복되는 수집·근거 검색·문서 작성·배포 문제를 제품 기능으로 전환했습니다. 기능이 늘어난 뒤에는 공용 도메인과 실행 경계를 다시 나누고 관측 가능성을 보강하며, 혼자 만든 서비스도 운영 가능한 구조로 발전시키고 있습니다.'
WHERE id = 21;

UPDATE experience_detail
SET content = '운영 트래픽과 장시간 AI 작업을 분리한 Spring Boot 멀티모듈 구조',
    display_order = 0,
    situation = '공개 포트폴리오 조회와 관리자 CRUD, 브라우저 크롤링·벡터 검색·LLM 생성이 한 Spring Boot 애플리케이션에 함께 있었습니다. 기능이 늘면서 긴 AI 작업의 의존성과 장애가 공개 API의 빌드·배포·실행 경계까지 함께 끌고 가는 구조가 됐습니다.',
    task = '도메인 모델을 중복하지 않으면서도 요청·응답 중심 API와 자원 사용량이 큰 AI·크롤링 작업을 독립적으로 배포할 수 있게 경계를 다시 나누고, 공개·관리자·워커 API의 권한 규칙도 일관되게 유지해야 했습니다.',
    action_detail = '- Gradle 프로젝트를 core·api·ai-worker 모듈로 분리하고 엔티티·리포지토리·공통 DTO는 core에서 공유\n- 공개 조회와 관리자 CRUD는 api, 채용공고 크롤링·LLM·벡터 검색·학습 계획은 ai-worker로 이동\n- 기존 30개 이상의 채용공고 엔드포인트를 CRUD와 AI 작업 책임에 따라 컨트롤러·서비스·테스트까지 분리\n- API와 워커의 Docker 이미지·Kubernetes Deployment·Service·Ingress 경로를 별도로 구성\n- MySQL은 공통 원본 저장소로 사용하고 Oracle 벡터 데이터소스는 필요한 워커에만 배선\n- Spring Security에서 /api/admin/**와 /api/worker/**를 관리자 전용으로 보호하고 공개 GET 경계 유지',
    outcome = '공통 도메인 코드를 유지하면서도 공개·CRUD API와 AI·크롤링 워커를 별도 프로세스와 배포 단위로 운영하게 됐습니다. API에서 불필요한 AI·브라우저·벡터 저장소 의존성을 제거하고, 장시간 작업의 변경과 장애를 공개 조회 경계에서 분리했습니다.',
    narrative = '공개 조회와 관리자 CRUD, 브라우저 크롤링, 벡터 검색, LLM 생성이 한 애플리케이션에 모이면서 긴 작업의 의존성과 장애가 공개 API까지 함께 영향을 주는 구조가 됐습니다. Gradle 프로젝트를 core·api·ai-worker로 분리해 엔티티와 저장소 계약은 공유하되 공개·CRUD API는 api에, 크롤링·AI·벡터 작업은 worker에 배치했습니다. 채용공고 영역은 30개가 넘는 엔드포인트를 책임에 따라 서비스와 테스트까지 나눴고, 이미지·Kubernetes 리소스·Ingress 경로도 각각 구성했습니다. 그 결과 공통 도메인을 복제하지 않으면서 장시간 작업을 독립 실행·배포할 수 있는 경계를 마련했습니다.',
    visible = 1,
    public_visible = 1,
    resume_available = 1
WHERE id = 33 AND experience_id = 21;

UPDATE experience_detail
SET content = '지원 공고별로 재사용하는 WYSIWYG 이력서·PDF 편집 워크플로우',
    display_order = 1,
    situation = '같은 경력 원본을 사용하더라도 지원 공고마다 강조할 경험과 섹션 순서, 문장 길이가 달랐습니다. 문서를 매번 별도 파일로 복사하면 원본 변경을 추적하기 어렵고, 브라우저 미리보기와 실제 A4 출력의 페이지 분할도 쉽게 어긋났습니다.',
    task = '구조화된 경력 데이터를 원본으로 유지하면서 공고별 선택·수정 내용은 템플릿으로 분리하고, 브라우저 화면에서 본 페이지 구성과 PDF 출력 결과가 최대한 일치하도록 편집 흐름을 만들어야 했습니다.',
    action_detail = '- PrintCanvas와 A4 PageLayer로 화면·인쇄 레이아웃을 동일한 컴포넌트 트리에서 렌더링\n- 섹션 실측 높이를 기반으로 페이지 분할 지점을 계산하고 사용자가 수동 분할 위치를 조정하도록 구현\n- 포함할 경력·프로젝트·스킬·자기소개 항목과 섹션 제목·순서·줄간격을 공고별로 선택\n- 인라인 WYSIWYG 수정값과 레이아웃을 PrintTemplate에 저장하고 채용공고와 연결\n- schemaVersion과 원본 fingerprint로 저장 이후 경력 데이터 변경에 따른 템플릿 드리프트 감지\n- AI 초안·사용자 피드백·수정 이력을 revision으로 보존하고 최종 PDF 스냅샷 또는 외부 PDF 업로드 지원',
    outcome = '경력 원본을 복제하지 않고도 지원 공고마다 다른 1~2페이지 이력서를 브라우저에서 편집·저장·출력할 수 있게 했습니다. 원본 변경 감지와 revision 이력을 함께 두어, 반복 지원 과정에서 문서별 선택과 수정 근거를 다시 확인할 수 있게 했습니다.',
    narrative = '지원 공고마다 강조할 경험과 섹션 순서가 달라 문서를 파일로 복제하면 원본과 파생본의 관계를 잃기 쉬웠습니다. 구조화된 경력 데이터를 원본으로 두고, 공고별 선택·수정·레이아웃만 PrintTemplate에 저장하도록 설계했습니다. 화면과 인쇄가 같은 컴포넌트 트리를 사용하게 하고 실측 높이 기반 자동 페이지 분할과 수동 조정을 함께 제공했습니다. 템플릿에는 원본 fingerprint와 revision을 남겨 데이터 변경과 AI·사용자 수정 이력을 추적했습니다. 그 결과 동일한 경력 원본에서 공고별 이력서를 반복 생성하는 실제 지원 워크플로우를 구축했습니다.',
    visible = 1,
    public_visible = 1,
    resume_available = 1
WHERE id = 34 AND experience_id = 21;

UPDATE experience_detail
SET content = 'GitOps 기반 ARM64 Kubernetes 배포·운영 환경 구축',
    display_order = 2,
    situation = 'Oracle Cloud의 ARM 기반 Kubernetes 환경에서 프론트엔드, API, AI 워커와 데이터·모니터링 컴포넌트를 운영해야 했습니다. x86 러너의 QEMU 에뮬레이션은 Java·Next.js 이미지 빌드를 크게 지연시켰고, 수동 이미지 태그 변경과 시크릿 관리는 배포 누락 위험을 만들었습니다.',
    task = 'ARM64 빌드 병목을 줄이고 코드 변경부터 클러스터 반영까지 반복 가능한 GitOps 경로를 만들면서, 운영 자격 증명과 애플리케이션·인프라 리소스를 저장소에서 안전하게 관리해야 했습니다.',
    action_detail = '- GitHub Actions의 native ARM64 runner와 Buildx로 API·워커·프론트엔드 이미지를 빌드해 OCI Registry에 커밋 SHA 태그로 저장\n- 이미지 태그를 Kustomize production overlay에 자동 반영하고 변경 커밋을 배포 상태의 단일 기준으로 사용\n- ArgoCD Application의 auto sync·prune·self-heal로 선언 상태와 클러스터 상태 동기화\n- Bitnami Sealed Secrets로 데이터베이스·AI·스토리지 자격 증명을 암호화해 Git에서 관리\n- 백엔드·프론트엔드뿐 아니라 RabbitMQ와 Prometheus·Grafana·Tempo 등 운영 컴포넌트도 Kustomize·ArgoCD 경계로 분리\n- ARM64 비호환 exporter 교체와 리소스 OOM 조정을 운영 장애 커밋으로 추적',
    outcome = 'main 반영 이후 이미지 빌드, 매니페스트 태그 갱신, 클러스터 동기화가 자동으로 이어지는 ARM64 GitOps 흐름을 운영하고 있습니다. 애플리케이션과 모니터링 리소스를 독립 Application으로 관리하고, 실제 배포 중 발생한 아키텍처 호환성과 메모리 문제도 선언 구성에 반영했습니다.',
    narrative = 'ARM Kubernetes에 여러 컴포넌트를 배포하면서 x86 러너의 에뮬레이션 빌드와 수동 태그 관리가 병목이 됐습니다. API·워커·프론트엔드 워크플로우를 native ARM64 runner로 전환하고 이미지 SHA를 Kustomize overlay에 자동 커밋하도록 구성했습니다. ArgoCD가 이를 감지해 sync·prune·self-heal을 수행하고, 시크릿은 Sealed Secrets로 관리했습니다. 이후 ARM64에서 crash하던 exporter 교체와 Prometheus·Tempo의 OOM 조정까지 운영 변경을 Git 이력으로 남겼습니다. 단순 배포 예제가 아니라 실제 서비스 상태를 계속 반영하는 GitOps 환경으로 운영하고 있습니다.',
    visible = 1,
    public_visible = 1,
    resume_available = 1
WHERE id = 37 AND experience_id = 21;

UPDATE experience_detail
SET content = '정적 HTML부터 SPA·iframe·이미지 공고까지 수용하는 다단계 수집 파이프라인',
    display_order = 3,
    situation = '채용 플랫폼마다 공고 본문 제공 방식이 달랐습니다. 정적 HTML만 읽으면 JavaScript 렌더링 페이지와 iframe 본문을 놓쳤고, 공유용 relay URL·로그인 화면·배너 이미지는 텍스트가 비거나 엉뚱한 요약 위젯을 정상 결과로 오인하게 만들었습니다.',
    task = '비용이 낮은 수집 경로를 우선 사용하되 결과가 불완전할 때만 브라우저나 비전 모델로 단계적으로 전환하고, URL·스크린샷·다중 공고 입력을 같은 구조화 데이터로 저장하는 복구 가능한 흐름이 필요했습니다.',
    action_detail = '- URL의 플랫폼·불가시 문자·추적 파라미터를 정규화하고 사람인 relay 링크는 rec_idx 기반 canonical 상세 URL로 변환\n- Jsoup 정적 fetch와 사이트별 파서를 우선 적용하고 핵심 표제어가 없을 때 Playwright 렌더링으로 폴백\n- iframe 상세요강을 탐지해 하위 프레임 텍스트를 병합하고 잡코리아 상세 프레임 404 시 AI 추출 경로로 전환\n- 텍스트 대신 배너 이미지로 제공되는 공고는 스크린샷 업로드·타일링·비전 모델 추출로 처리\n- URL·스크린샷·여러 행 입력을 SSE 진행 이벤트와 함께 수집하고 세마포어로 동시 실행 수 제한\n- 성공·실패 건수와 처리시간을 Micrometer metric으로 기록해 Prometheus에서 관찰',
    outcome = '사이트별 예외를 단일 거대 파서에 숨기지 않고 정적 fetch→브라우저 렌더링→iframe 병합→비전 추출의 명시적인 폴백으로 구성했습니다. URL과 이미지 기반 공고를 같은 지원 관리 데이터로 등록하고, 실패 위치와 처리시간을 운영 지표로 확인할 수 있게 했습니다.',
    narrative = '채용 플랫폼마다 정적 HTML, SPA, iframe, 공유용 relay URL, 배너 이미지처럼 본문 제공 방식이 달라 한 가지 수집 방법으로는 빈 값과 오탐이 반복됐습니다. URL을 먼저 canonical 형태로 정규화하고 정적 파싱을 우선 적용하되, 핵심 표제어가 없을 때만 Playwright·iframe 병합·비전 추출로 단계적으로 전환했습니다. 다중 URL과 스크린샷 입력은 같은 저장 흐름으로 합치고 SSE로 진행 상태를 전달했으며, 세마포어와 Micrometer 지표로 자원 사용과 성공·실패를 관리했습니다. 그 결과 새로운 실패 유형이 나타날 때 전체 파서를 교체하지 않고 폴백 단계를 확장할 수 있는 구조를 만들었습니다.',
    visible = 1,
    public_visible = 1,
    resume_available = 1
WHERE id = 38 AND experience_id = 21;

UPDATE experience_detail
SET content = '경력 근거를 선별해 지원 문서를 생성하는 공용 RAG 파이프라인',
    display_order = 4,
    situation = '경력·프로젝트·스터디 전체를 매번 LLM 프롬프트에 넣으면 공고와 무관한 정보까지 컨텍스트를 차지하고, 자소서·이력서·어필 분석 등 기능마다 검색과 프롬프트 조립 로직이 중복됐습니다.',
    task = '채용공고의 직무·자격요건과 관련된 근거만 선별하되 벡터 백필이 끝나지 않은 상황에서도 기능이 중단되지 않게 하고, 같은 검색 결과를 여러 지원 문서 기능이 재사용할 수 있는 공용 경계를 만들어야 했습니다.',
    action_detail = '- 경력·프로젝트와 스터디를 문맥 단위 청크로 변환하고 RabbitMQ 변경 이벤트를 통해 Oracle VECTOR 저장소와 동기화\n- 공고 설명·자격요건에서 검색 쿼리와 키워드를 만들고 dense cosine 유사도와 lexical 일치도를 0.7:0.3으로 결합\n- 경험·스터디별 Top-K 청크와 전체 핵심역량을 하나의 evidence digest로 조립\n- 벡터 결과가 없거나 백필 전이면 전체 경력 digest로 폴백해 생성 기능의 가용성 유지\n- RelevantProfileDigestService로 검색·선별·조립을 추출해 자소서, 이력서 초안, 경력 어필, 보완 프로젝트, 학습 계획에 재사용\n- LlmDispatcher에서 NVIDIA·OpenAI·Gemini·Claude 계열 공급자를 동일한 생성 인터페이스로 라우팅',
    outcome = '전체 프로필 덤프에 의존하던 생성을 공고 관련 근거 중심의 RAG 흐름으로 전환하고, 동일한 검색 파이프라인을 다섯 가지 지원·학습 기능에서 재사용했습니다. 벡터 저장소가 준비되지 않은 경우에도 전체 digest 폴백으로 기존 생성 흐름을 유지하도록 했습니다.',
    narrative = '공고마다 전체 경력 데이터를 프롬프트에 넣으면 관련성이 낮은 정보가 컨텍스트를 차지하고 기능별 검색 코드도 중복됐습니다. 경력과 스터디를 청크로 동기화한 뒤 cosine 유사도와 키워드 점수를 결합해 관련 근거를 고르고, 핵심역량과 함께 evidence digest로 조립했습니다. 검색 결과가 없으면 전체 경력 digest로 폴백하도록 해 백필 상태가 기능 장애가 되지 않게 했습니다. 이 흐름을 공용 서비스로 추출해 자소서·이력서 초안·어필 분석·보완 프로젝트·학습 계획에서 공유하고, 모델 공급자 선택은 별도 dispatcher로 분리했습니다.',
    visible = 1,
    public_visible = 1,
    resume_available = 1
WHERE id = 39 AND experience_id = 21;

UPDATE experience_detail
SET content = '외부 AI·장시간 작업의 실패 제어와 관측 가능성 구축',
    display_order = 5,
    situation = '채용공고 일괄 수집과 지원 문서 생성은 외부 AI 응답 지연, 동시 요청 제한, reasoning 텍스트 혼입, 불완전한 JSON, 프록시 timeout처럼 서로 다른 실패를 보였습니다. 로그만으로는 크롤링·검색·LLM 중 어느 구간이 병목인지 구분하기 어려웠습니다.',
    task = '외부 공급자의 일시 오류가 전체 일괄 작업으로 확산되지 않도록 동시성과 재시도를 제어하고, 사용자에게 장시간 진행 상태를 전달하면서 서버에서는 처리 구간별 지연과 실패 원인을 추적할 수 있어야 했습니다.',
    action_detail = '- URL 파싱과 다중 공고 수집에 공정한 Semaphore를 두어 외부 AI·브라우저 동시 실행 수 제한\n- NVIDIA NIM 호출에 exponential backoff 재시도와 요청별 timeout·출력 토큰 상한 적용\n- reasoning 모델에는 thinking 비활성 지시를 공통 적용하고 중복 JSON key·코드펜스·불완전 출력 정규화\n- 장시간 수집·이력서 초안 생성은 SSE 진행 이벤트와 keepalive로 분리해 프록시 대기 timeout 완화\n- @Observed와 Micrometer로 파싱 workflow trace, 성공·실패 counter, 처리시간 timer 기록\n- Spring AI Observation을 OpenTelemetry로 내보내고 Prometheus·Grafana·Tempo에서 metric과 trace 확인',
    outcome = '외부 AI와 브라우저 작업의 동시 실행·재시도·응답 정규화 경계를 공통화하고, 장시간 요청은 진행 상태를 반환하는 스트리밍 흐름으로 전환했습니다. 크롤링 성공 여부와 처리시간, AI 호출 trace를 대시보드에서 함께 확인할 수 있어 실패 지점을 코드 추측이 아닌 관측 데이터로 좁힐 수 있게 됐습니다.',
    narrative = '외부 AI·브라우저·벡터 검색이 한 요청에 연결되면서 동시 요청 제한, 잘못된 JSON, 프록시 timeout이 서로 비슷한 사용자 오류로 보였습니다. Semaphore로 자원 사용을 제한하고 NIM 호출에는 backoff와 timeout, 토큰 상한을 적용했습니다. reasoning과 JSON 형식 문제는 공용 응답 정규화 계층에서 처리하고, 긴 작업은 SSE 진행 이벤트와 keepalive로 전환했습니다. 동시에 Micrometer·OpenTelemetry를 연결해 성공·실패와 처리시간, AI 호출 trace를 Prometheus·Grafana·Tempo에서 확인하도록 구성했습니다. 이를 통해 개인 프로젝트에서도 장애를 재현하고 원인을 좁힐 수 있는 운영 피드백 루프를 만들었습니다.',
    visible = 1,
    public_visible = 1,
    resume_available = 1
WHERE id = 40 AND experience_id = 21;

-- 프로젝트와 상세 사례의 기술 태그를 최신 구조에 맞춰 다시 정렬한다.
DELETE FROM experience_detail_skill WHERE experience_detail_id IN (33, 34, 37, 38, 39, 40);

INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order) VALUES
    (33, 1, 0), (33, 5, 1), (33, 56, 2), (33, 61, 3), (33, 62, 4),
    (34, 2, 0), (34, 10, 1), (34, 64, 2),
    (37, 31, 0), (37, 35, 1), (37, 63, 2),
    (38, 1, 0), (38, 5, 1), (38, 23, 2), (38, 38, 3),
    (39, 1, 0), (39, 5, 1), (39, 38, 2), (39, 40, 3), (39, 73, 4), (39, 74, 5),
    (40, 1, 0), (40, 5, 1), (40, 38, 2), (40, 72, 3), (40, 27, 4);

DELETE FROM experience_skill WHERE experience_id = 21;

INSERT INTO experience_skill (experience_id, skill_id, list_order) VALUES
    (21, 1, 0),
    (21, 5, 1),
    (21, 2, 2),
    (21, 64, 3),
    (21, 56, 4),
    (21, 61, 5),
    (21, 62, 6),
    (21, 23, 7),
    (21, 38, 8),
    (21, 40, 9),
    (21, 74, 10),
    (21, 73, 11),
    (21, 31, 12),
    (21, 35, 13),
    (21, 63, 14),
    (21, 72, 15),
    (21, 27, 16);
