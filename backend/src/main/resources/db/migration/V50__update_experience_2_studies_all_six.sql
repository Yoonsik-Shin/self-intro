-- V50: Upsert all 6 Experience 2 related study articles and link them to normalized STAR experience_details
-- Target Experience ID: 2 ([청년 일경험] 고객문의 수집 및 CS 통합 관리 페이지 구현)

-- 1. Remove obsolete legacy study slugs if present
DELETE FROM study_experience_detail WHERE study_id IN (SELECT id FROM study WHERE slug IN ('naver-cafe-session-playwright-automation', 'inquiry-thread-parsing-and-automatic-mapping'));
DELETE FROM study WHERE slug IN ('naver-cafe-session-playwright-automation', 'inquiry-thread-parsing-and-automatic-mapping');

-- 2. Study 1: Playwright 세션 우회 및 E2E 답변 자동화
INSERT INTO study (slug, title, summary, content_markdown, status, category_id, learned_at, created_at, updated_at)
VALUES (
    'playwright-naver-session-bypass-e2e-automation',
    'Playwright 브라우저 자동화를 통한 네이버 카페 보안 세션 우회 및 E2E 답변 자동화',
    '네이버 2단계 인증 및 CAPTCHA 보안 탐지를 우회하기 위해 Playwright Headless 브라우저 워커와 자바 백엔드를 연동하고, OTP 8자리 번호 수신 및 AES/GCM 암호화 세션 쿠키 서빙을 안전하게 계층화한 아키텍처',
    '# Playwright 브라우저 자동화를 통한 네이버 카페 보안 세션 우회 및 E2E 답변 자동화

## 1. 기술 개념 및 핵심 이론

### Protocol API vs Headless Browser Automation
- **단순 Protocol API 호출의 한계**: 네이버 카페 등 보안 정책이 강화된 외부 플랫폼은 단순 HTTP REST API 호출 시 CAPTCHA 챌린지, 일회용 디바이스 OTP, TLS Fingerprinting으로 인해 즉시 차단(HTTP 403 / 429)됩니다.
- **Playwright Headless Browser 선택**: Chromium 커널 기반의 Playwright는 모바일 User-Agent 모킹, Stealth 봇 탐지 방지 래퍼, 및 DOM 조작 이벤트를 완전히 재현하므로 실제 사용자의 브라우징 행위를 완벽히 에뮬레이션합니다.

| 기술 구분 | Protocol API (cURL/Axios) | Playwright Headless Browser |
|---|---|---|
| **실행 엔진** | HTTP 네트워킹 라이브러리 | Chromium 브라우저 커널 내장 패키지 |
| **보안 우회력** | CAPTCHA / OTP 2FA 대응 불가 | 8자리 일회용 OTP 입력 및 모바일 쿠키 extraction 가능 |
| **세션 수명 관리** | 수동 갱신 개입 요구됨 | 쿠키 수명 주기 동기화 및 자동 갱신 파이프라인 구축 |

---

## 2. 내부 동작 메커니즘 및 아키텍처

### 1) OTP 로그인 및 쿠키 Extraction 시퀀스
```mermaid
sequenceDiagram
    actor Admin as 관리자
    participant Nginx as Nginx 프록시
    participant Java as Spring Boot (cs-api)
    participant Worker as Browser Worker (Playwright)
    participant Naver as 네이버 인증 서버

    Admin->>Nginx: 1. 네이버 앱 8자리 일회용 OTP 번호 제출
    Nginx->>Java: 2. POST /api/v1/naver/sessions/one-time-login
    Java->>Worker: 3. POST /api/naver/login/one-time (Timeout: 20s)
    Note over Worker: Playwright Chromium 구동 및 OTP 입력
    Worker->>Naver: 4. 일회용 번호 인증 요청
    Naver-->>Worker: 5. 인증 성공 및 NID_AUT, NID_SES 쿠키 반환
    Worker-->>Java: 6. 쿠키 JSON 반환
    Note over Java: AES-256-GCM 쿠키 암호화 후 DB 저장
    Java-->>Nginx: 7. HTTP Set-Cookie & X-Naver-Cookie 헤더 서빙
    Nginx-->>Admin: 8. 세션 갱신 완료
```

### 2) 쿠키 전송 보안 강화 아키텍처
```mermaid
flowchart LR
    subgraph Client["내부 시스템 (n8n / API Client)"]
        Req["HTTP GET /api/v1/naver/sessions"]
    end
    subgraph Backend["cs-api (Spring Security)"]
        RespBody["JSON Body: { id, status, updatedAt } (쿠키 미포함)"]
        RespHeader1["Set-Cookie: NID_AUT=...; Secure; HttpOnly"]
        RespHeader2["X-Naver-Cookie: NID_AUT=...; NID_SES=..."]
    end
    Req --> Backend
    Backend -->|보안 전송| RespHeader1
    Backend -->|Header 주입| RespHeader2
    Backend -->|로그 누출 차단| RespBody
```

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) Browser Worker (Playwright JS) OTP 자동 로그인
```javascript
// browser-worker/src/tasks/naverCafe.js (Sanitized)
const { chromium } = require("playwright");

async function oneTimeLogin(otpCode) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
    });
    const page = await context.newPage();

    try {
        await page.goto("https://nid.naver.com/nidlogin.login?mode=number");
        await page.fill("#dis_num", otpCode);
        await page.click("#log\\.login");
        await page.waitForNavigation({ waitUntil: "networkidle" });

        const cookies = await context.cookies();
        const sessionCookies = cookies.filter(c => ["NID_AUT", "NID_SES"].includes(c.name));
        return sessionCookies;
    } finally {
        await browser.close();
    }
}
```

### 2) Java RestClient 확장 타임아웃 및 세션 헤더 서빙
```java
// NaverSessionService.java (Sanitized)
@Service
public class NaverSessionService {
    private final RestClient restClient;

    public NaverSessionService(RestClient.Builder builder) {
        // Playwright 브라우저 구동 대기시간을 고려해 20초 타임아웃 설정
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(20000);
        this.restClient = builder.requestFactory(factory).baseUrl("http://browser-worker:3000").build();
    }

    public void renewSessionWithOtp(String otpCode) {
        List<CookieDto> cookies = restClient.post()
            .uri("/api/naver/login/one-time")
            .body(Map.of("code", otpCode))
            .retrieve()
            .body(new ParameterizedTypeReference<>() {});

        String encrypted = PiiEncryptionUtils.encrypt(objectMapper.writeValueAsString(cookies));
        naverSessionRepository.save(new NaverCafeSession("default", encrypted, SessionStatus.ACTIVE));
    }
}
```

### 3) 트러블슈팅 인사이트
- **응답 바디 쿠키 누출 방지**: n8n 노코드 워크플로우나 모니터링 시스템에서 API 응답 JSON 바디를 전체 로깅할 때 세션 쿠키가 평문으로 노출되는 보안 위협을 방지하고자, JSON 응답 바디에서는 쿠키 필드를 제거하고 HTTP `Set-Cookie` 및 단일 커스텀 헤더 `X-Naver-Cookie` 방식으로 전송을 분리했습니다.
- **Extended Read Timeout (20s)**: Playwright Chromium 인스턴스 론칭 시 발생하는 3~5초의 오버헤드를 고려하여 Spring RestClient의 `ReadTimeout`을 20초로 보장함으로써 타임아웃 실패율을 방지했습니다.',
    'PUBLISHED',
    4,
    '2026-07-20',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    summary = VALUES(summary),
    content_markdown = VALUES(content_markdown),
    updated_at = NOW();


-- 3. Study 2: RFC 5322 이메일 헤더 파싱 및 HMAC 해시 스레드/FSM 엔진
INSERT INTO study (slug, title, summary, content_markdown, status, category_id, learned_at, created_at, updated_at)
VALUES (
    'email-header-rfc5322-thread-fsm-engine',
    'RFC 5322 이메일 헤더 파싱 및 HMAC 해시 기반 문의 스레드/상태 자동 제어 엔진',
    'Message-ID 및 In-Reply-To 헤더 추적과 발신자 HMAC-SHA256 해시 Heuristic 매칭을 결합하여 파편화된 이메일 문의를 단일 대화 트리로 통합하고 FSM 자동 상태 전이를 보장한 백엔드 엔진',
    '# RFC 5322 이메일 헤더 파싱 및 HMAC 해시 기반 문의 스레드/상태 자동 제어 엔진

## 1. 기술 개념 및 핵심 이론

### RFC 5322 이메일 헤더 규격
- **Message-ID**: 메일 생성 시 발신 서버가 부여하는 전역 고유 식별자 (`<unique-string@domain.com>`).
- **In-Reply-To**: 직전 부모 메일의 `Message-ID` 참조.
- **References**: 해당 이메일 스레드 내 선조 메일들의 `Message-ID` 리스트 체인.

### FSM (Finite State Machine) 상태 전이
고객이 회신 메일을 보냈을 때, 문의 상태가 해결(`RESOLVED`)에서 오픈(`OPEN`)으로 자동 복귀하고 이력을 남기는 유한 상태 머신 패턴을 적용합니다.

---

## 2. 내부 동작 메커니즘 및 아키텍처

### 1) 2-Tier 계층형 이메일 스레드 매칭 트래버스
```mermaid
flowchart TD
    Start[신규 이메일 문의 유입] --> CheckHeader{In-Reply-To / References<br/>헤더 존재 여부}
    CheckHeader -->|존재함| Tier1[Tier 1: Parent Message-ID DB 조회]
    Tier1 --> Match1{부모 문의 발견?}
    Match1 -->|발견| LinkParent[부모 Inquiry ID 매핑]
    
    CheckHeader -->|유실/없음| Tier2[Tier 2: Heuristic Fallback]
    Match1 -->|미발견| Tier2
    
    Tier2 --> HashCalc[발신자 이메일 HMAC-SHA256 해시 연산]
    Tier2 --> RegexTitle[제목 정규화: Re:, Fwd: 제거]
    HashCalc & RegexTitle --> QueryIndex[email_sender_hash B-Tree 인덱스 & 제목 검색]
    QueryIndex --> Match2{후보군 발견?}
    Match2 -->|발견| LinkParent
    Match2 -->|미발견| CreateNew[독립 신규 Inquiry 생성]
```

### 2) FSM 문의 상태 전이도
```mermaid
stateDiagram-v2
    [*] --> NEW: 고객 첫 문의 접수
    NEW --> OPEN: 상담원 담당자 할당
    OPEN --> RESOLVED: 상담원 답변 완료
    RESOLVED --> OPEN: 고객 추가 메일 회신 유입 (FSM Auto Transition)
    RESOLVED --> [*]: 30일 경과 후 자동 종결
```

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) 이메일 발신자 HMAC-SHA256 해시 연산
```java
// EmailAddressUtils.java (Sanitized)
public class EmailAddressUtils {
    public static String normalizeEmail(String email) {
        if (email == null) return "";
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public static String calculateSenderHash(String email, String secretKey) {
        String normalized = normalizeEmail(email);
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hash = mac.doFinal(normalized.getBytes(StandardCharsets.UTF_8));
            return Hex.encodeHexString(hash);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC Hash Generation Failed", e);
        }
    }
}
```

### 2) 이메일 스레드 병합 및 FSM 상태 전환
```java
// IntegrateInquiryDataUseCase.java (Sanitized)
@Transactional
public void processIncomingEmail(EmailInquiryDto dto) {
    String senderHash = EmailAddressUtils.calculateSenderHash(dto.getSenderEmail(), hmacSecret);
    
    // Tier 1 & Tier 2 candidate search
    Optional<CustomerInquiry> parentOpt = findParentInquiry(dto.getInReplyTo(), senderHash, dto.getSubject());

    CustomerInquiry inquiry;
    if (parentOpt.isPresent()) {
        inquiry = parentOpt.get();
        inquiry.addThreadMessage(dto.getContent(), dto.getMessageId());
        
        // FSM 상태 전환: RESOLVED -> OPEN
        if (inquiry.getStatus() == InquiryStatus.RESOLVED) {
            inquiry.changeStatus(InquiryStatus.OPEN);
            workLogRepository.save(new InquiryWorkLog(inquiry, "Auto-Reopened by Customer Email Reply"));
        }
    } else {
        inquiry = CustomerInquiry.createNewEmailInquiry(dto, senderHash);
    }
    inquiryRepository.save(inquiry);
}
```

### 3) 트러블슈팅 인사이트
- **헤더 유실 대응**: 일부 메일 클라이언트가 회신 시 `In-Reply-To` 헤더를 누출/삭제하는 현상이 관측되어, 발신자 이메일 HMAC 해시(`email_sender_hash`)와 정규화된 제목(`Re:` 제거)을 조합한 Tier 2 Heuristic 매칭을 적용해 스레드 이탈율을 최소화했습니다.
- **감사 로깅(Audit Log)**: 자동 상태 전환 시 무단 상태 변경으로 오해받는 것을 방지하기 위해 `InquiryWorkLog` 시스템 감사 테이블에 자동 변경 주체("SYSTEM")와 사유를 기록했습니다.',
    'PUBLISHED',
    4,
    '2026-07-20',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    summary = VALUES(summary),
    content_markdown = VALUES(content_markdown),
    updated_at = NOW();


-- 4. Study 4: Nginx auth_request 계층 SSO 연동
INSERT INTO study (slug, title, summary, content_markdown, status, category_id, learned_at, created_at, updated_at)
VALUES (
    'nginx-auth-request-sso-unified-access-control',
    'Nginx auth_request 및 X-Remote-User 헤더 기반 어드민 툴 통합 단일 인증(SSO) 계층',
    '사설 LAN/VPN 배포 환경에서 Nginx 경계 보안과 백엔드 auth_request 서브루틴 연동을 결합하여 개별 어드민 도구들(n8n, Grafana, MinIO)의 SSO 통합 접근 제어를 단일 지점에서 완성한 아키텍처',
    '# Nginx auth_request 및 X-Remote-User 헤더 기반 어드민 툴 통합 단일 인증(SSO) 계층

## 1. 기술 개념 및 핵심 이론

### 경계 네트워크 보안 및 Nginx auth_request 지시어
- **Perimeter Security**: 외부 노출 관문을 Nginx 프록시 하나로 통일하고, 백엔드 API 및 다른 어드민 모니터링 툴의 포트 바인딩을 제거하여 Docker 사설 브릿지 네트워크 영역에 격리합니다.
- **auth_request 서브루틴**: Nginx가 클라이언트 요청을 업스트림 어드민 툴로 전달하기 전, 백엔드 검증 컨트롤러로 내부 sub-request를 보내 200 OK일 때만 접속을 허용하는 경량 인증 위임 메커니즘입니다.

---

## 2. 내부 동작 메커니즘 및 아키텍처

### 1) 경계 네트워크 및 Nginx Header Auth 구조
```mermaid
graph LR
    User([사설 LAN/VPN 사용자]) -->|1. HTTP Basic Auth| Nginx[cs-frontend-nginx:8888]
    Nginx -->|2. X-Remote-User 터널링| Backend[cs-api:8080 (Spring Security)]
    Backend -->|3. admin_member DB 검증| DB[(PostgreSQL)]
```

### 2) auth_request 통합 단일 인증(SSO) 시퀀스
```mermaid
sequenceDiagram
    actor Admin as 관리자
    participant Nginx as Nginx 프록시
    participant Backend as Spring Security (cs-api)
    participant Tool as Internal Admin Tool (n8n/Grafana/MinIO)

    Admin->>Nginx: /n8n/ 접속 요청 (cs_admin_access 쿠키 포함)
    Nginx->>Backend: internal sub-request GET /api/v1/auth/admin-tool-check
    Backend->>Backend: cs_admin_access 쿠키 검증
    alt 쿠키 유효 (HTTP 200 OK)
        Backend-->>Nginx: HTTP 200 OK
        Nginx->>Tool: 프록시 패스 연동
        Tool-->>Admin: 어드민 툴 화면 노출
    else 쿠키 무효 (HTTP 403 Forbidden)
        Backend-->>Nginx: HTTP 403 Forbidden
        Nginx-->>Admin: 302 Redirect to / (메인 화면)
    end
```

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) Nginx auth_request 서브루틴 구성
```nginx
# nginx.conf (Sanitized)
server {
    listen 8888;

    # 어드민 툴 권한 검증 서브루틴 경로
    location = /_admin_tool_auth {
        internal;
        proxy_pass http://cs-api:8080/api/v1/auth/admin-tool-check;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Original-URI $request_uri;
    }

    # n8n 어드민 툴 경로
    location /n8n/ {
        auth_request /_admin_tool_auth;
        error_page 403 = @error403;
        proxy_pass http://n8n-container:5678/;
    }

    location @error403 {
        return 302 /;
    }
}
```

### 2) Spring Security NginxHeaderAuthFilter
```java
// NginxHeaderAuthFilter.java (Sanitized)
public class NginxHeaderAuthFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String remoteUser = req.getHeader("X-Remote-User");
        
        if (StringUtils.hasText(remoteUser)) {
            Optional<AdminMember> admin = adminRepository.findByUsername(remoteUser);
            if (admin.isPresent()) {
                UsernamePasswordAuthenticationToken auth = 
                    new UsernamePasswordAuthenticationToken(admin.get(), null, admin.get().getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        chain.doFilter(req, res);
    }
}
```

### 3) 트러블슈팅 인사이트
- **X-Remote-User 헤더 변조 방지**: 브라우저 클라이언트가 임의로 `X-Remote-User` 헤더를 조작해 전송하는 위협을 차단하기 위해, Nginx 프록시 설정에서 클라이언트 입력 헤더를 무조건 `proxy_set_header X-Remote-User $remote_user;`로 덮어쓰도록(overwrite) 강제 설정했습니다.
- **단일 쿠키 SSO**: 개별 툴마다 로그인을 반복하던 비효율을 `cs_admin_access` 단일 쿠키 인증 서브루틴으로 일원화하여 어드민 도구 통합 SSO 접근 체계를 정착시켰습니다.',
    'PUBLISHED',
    4,
    '2026-07-20',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    summary = VALUES(summary),
    content_markdown = VALUES(content_markdown),
    updated_at = NOW();


-- 5. Study 5: Grafana Alloy, Loki, Logback JSON 관측성 모니터링
INSERT INTO study (slug, title, summary, content_markdown, status, category_id, learned_at, created_at, updated_at)
VALUES (
    'grafana-loki-alloy-logback-centralized-observability',
    'Grafana Alloy, Loki, Logback JSON 로깅을 활용한 사내 시스템 중앙 집중 모니터링',
    'Logback의 Machine-Readable JSON Line 로그 파이프라인과 Grafana Alloy/Loki를 Docker Volume 수집 방식으로 결합하여 분산 컨테이너의 실시간 예외 에러 추적 및 5xx 지표 대시보드를 구축한 관측성 아키텍처',
    '# Grafana Alloy, Loki, Logback JSON 로깅을 활용한 사내 시스템 중앙 집중 모니터링

## 1. 기술 개념 및 핵심 이론

### Observability 3대 요소와 Logback JSON Appender
- **Observability (관측성)**: Logs, Metrics, Traces를 결합해 시스템 내부 상태를 외부 출력 지표로 디버깅하는 능력.
- **Logback JSON Appender**: 수동 SSH 접속과 파일 풀스캔 비효율을 해소하기 위해 Logback 출력을 Machine-Readable 단일줄 JSON 포맷으로 표준화합니다.

| 구별 항목 | 레거시 Plain Text 로깅 | Machine-Readable JSON Line 로깅 |
|---|---|---|
| **출력 형태** | 표준 멀티라인 텍스트 스택트레이스 | 단일줄 구조화 JSON (`timestamp`, `level`, `traceId`) |
| **파싱 복잡도** | 정규식 멀티라인 Multiline 파서 필요 | Grafana Alloy / LogQL 자동 필드 추출 가능 |
| **보존/롤링** | 파일 크기 관리 불투명 | `maxHistory`(30일), `maxFileSize`(100MB), `totalSizeCap`(3GB) 명확 |

---

## 2. 내부 동작 메커니즘 및 아키텍처

### 1) 관측성 데이터 수집 및 인덱싱 파이프라인
```mermaid
flowchart TD
    subgraph AppContainer["JVM Application (cs-api)"]
        SLF4J[SLF4J Logger] --> Logback[Logback JSON Layout]
        Logback --> LogFile["/var/log/app/app.log (Docker Volume)"]
    end
    
    subgraph MonitoringStack["Docker Compose Observability Stack"]
        LogFile -->|Volume Mount Tailing| Alloy[Grafana Alloy Container]
        Alloy -->|HTTP Push| Loki[Grafana Loki Storage Engine]
        Loki -->|LogQL Query| Grafana[Grafana Dashboard UI]
    end

    Grafana -->|실시간 5xx 감시| Admin[운영 관리자]
```

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) logback-spring.xml 설정
```xml
<!-- logback-spring.xml (Sanitized) -->
<configuration>
    <appender name="JSON_FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>/var/log/app/app.log</file>
        <encoder class="net.logstash.logback.encoder.LogstashEncoder" />
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>/var/log/app/app-%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>
            <maxFileSize>100MB</maxFileSize>
            <maxHistory>30</maxHistory>
            <totalSizeCap>3GB</totalSizeCap>
        </rollingPolicy>
    </appender>

    <root level="INFO">
        <appender-ref ref="JSON_FILE" />
    </root>
</configuration>
```

### 2) Grafana Alloy 파이프라인 구성
```alloy
// config.alloy (Sanitized)
local.file_match "app_logs" {
    paths = ["/var/log/app/*.log"]
}

loki.source.file "log_scrape" {
    targets    = local.file_match.app_logs.targets
    forward_to = [loki.write.local_loki.receiver]
}

loki.write "local_loki" {
    endpoint {
        url = "http://loki:3100/loki/api/v1/push"
    }
}
```

### 3) 트러블슈팅 인사이트
- **멀티라인 파싱 병목 해소**: 기존 예외 스택트레이스가 여러 줄로 분생되어 Loki에서 별도 줄로 분리 수집되는 문제를 `LogstashEncoder` 단일줄 JSON 변환으로 근본 해결했습니다.
- **안정적 디스크 롤링**: Logback `SizeAndTimeBasedRollingPolicy`를 통해 총 용량 제한(`totalSizeCap=3GB`)을 두어 로컬 디스크 고갈 위협을 원천 차단했습니다.',
    'PUBLISHED',
    4,
    '2026-07-20',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    summary = VALUES(summary),
    content_markdown = VALUES(content_markdown),
    updated_at = NOW();


-- 6. Link all 6 studies to experience_detail (6, 7, 8, 10, 25, 9)
-- Study 1 (Playwright) -> Detail 6
INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, 6 FROM study s WHERE s.slug = 'playwright-naver-session-bypass-e2e-automation'
AND NOT EXISTS (SELECT 1 FROM study_experience_detail sed WHERE sed.study_id = s.id AND sed.experience_detail_id = 6);

-- Study 2 (Email Thread FSM) -> Detail 7
INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, 7 FROM study s WHERE s.slug = 'email-header-rfc5322-thread-fsm-engine'
AND NOT EXISTS (SELECT 1 FROM study_experience_detail sed WHERE sed.study_id = s.id AND sed.experience_detail_id = 7);

-- Study 3 (JPA PII Encryption) -> Detail 8
INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, 8 FROM study s WHERE s.slug = 'db-level-pii-encryption-and-migration'
AND NOT EXISTS (SELECT 1 FROM study_experience_detail sed WHERE sed.study_id = s.id AND sed.experience_detail_id = 8);

-- Study 4 (Nginx SSO) -> Detail 10
INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, 10 FROM study s WHERE s.slug = 'nginx-auth-request-sso-unified-access-control'
AND NOT EXISTS (SELECT 1 FROM study_experience_detail sed WHERE sed.study_id = s.id AND sed.experience_detail_id = 10);

-- Study 5 (Grafana Observability) -> Detail 25
INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, 25 FROM study s WHERE s.slug = 'grafana-loki-alloy-logback-centralized-observability'
AND NOT EXISTS (SELECT 1 FROM study_experience_detail sed WHERE sed.study_id = s.id AND sed.experience_detail_id = 25);

-- Study 6 (n8n Ingestion) -> Detail 9
INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, 9 FROM study s WHERE s.slug = 'n8n-multichannel-ingestion-idempotent-engine'
AND NOT EXISTS (SELECT 1 FROM study_experience_detail sed WHERE sed.study_id = s.id AND sed.experience_detail_id = 9);
