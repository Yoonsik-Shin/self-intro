-- V46: Rewrite all 11 Study notes into genuine technical deep-dive articles (Theory, Mechanism, Code Snippets, Insights)

UPDATE study SET content_markdown = '# JPA Converter와 HMAC 해싱을 통한 개인정보(PII) 암호화 및 무중단 데이터 마이그레이션

## 1. 기술 개념 및 핵심 이론

### JPA Attribute Converter란?
- JPA 2.1부터 표준 도입된 `AttributeConverter<X, Y>` 인터페이스는 자바 엔티티 필드 타입(X)과 데이터베이스 컬럼 타입(Y) 간의 변환 로직을 캡슐화하는 영속성 계층 메커니즘입니다.
- `convertToDatabaseColumn(X attribute)`: 엔티티가 `INSERT`/`UPDATE`되어 영속성 컨텍스트에서 DB로 저장되기 직전 자동으로 암호화 로직이 실행됩니다.
- `convertToEntityAttribute(Y dbData)`: DB에서 `SELECT`하여 엔티티로 로딩(Hydration)될 때 자동으로 복호화 로직이 실행됩니다.
- 서비스 레이어나 비즈니스 도메인의 코드 수정 없이 엔티티 필드 레벨 선언만으로 투명한(Transparent) 투명 암복호화를 달성합니다.

### HMAC-SHA256 해시와 등치 검색(Equi-Join) 원리
- **AES/GCM 암호화의 한계**: 보안성을 높이기 위해 매 암호화마다 무작위 IV(Initialization Vector)를 사용하는 AES/GCM 암호문은 동일한 평문("user@test.com")이라도 매번 무작위 암호문이 생성됩니다. 따라서 `WHERE email = ''암호문''` 형태의 DB 등치 검색(Equi-Join) 및 B-Tree 인덱스 조회가 불가능합니다.
- **HMAC 해결책**: 서버만 보유한 Secret Key와 평문을 조합하여 SHA-256 단방향 해시값을 생성합니다. 동일한 평문에 대해 항상 일관된 64자리 헥사 해시값이 생성되므로, `WHERE email_hash = ''HMAC(평문)''` 쿼리로 B-Tree 인덱스를 타는 속도 빠른 조회가 가능합니다.

---

## 2. 내부 동작 메커니즘 및 무중단 이관 전략

### 무중단 마이그레이션 (관용적 복호화: Decrypt-or-PassThrough)
- 기존 수십만 건의 평문 데이터가 DB에 적재된 상황에서 암호화 스키마로 전환할 때, 마이그레이션 도중 수신된 요청이 복호화 예외를 던지지 않도록 예외 처리 패턴을 설계했습니다.
- `convertToEntityAttribute` 실행 시 `Cipher.doFinal()`이 `BadPaddingException` 또는 `IllegalBlockSizeException`을 던지면(미암호화 평문 데이터인 경우), 예외를 삼키고 평문 string을 그대로 반환합니다.
- 백그라운드 배치 스크립트가 `email_hash`가 null인 행을 순차 스캔하여 암호화 업데이트를 이관 수행합니다.

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) JPA EncryptedStringConverter 구현 코드
```java
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) return null;
        try {
            byte[] iv = generateRandomIv(IV_LENGTH);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, getSecretKeySpec(), new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] cipherText = cipher.doFinal(attribute.getBytes(StandardCharsets.UTF_8));
            byte[] combined = ByteBuffer.allocate(iv.length + cipherText.length).put(iv).put(cipherText).array();
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new IllegalStateException("PII Encryption Failed", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        try {
            byte[] decoded = Base64.getDecoder().decode(dbData);
            ByteBuffer bb = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[IV_LENGTH];
            bb.get(iv);
            byte[] cipherText = new byte[bb.remaining()];
            bb.get(cipherText);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, getSecretKeySpec(), new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (BadPaddingException | IllegalBlockSizeException e) {
            // Decrypt-or-PassThrough: 아직 암호화되지 않은 레거시 평문 데이터 대응
            return dbData;
        } catch (Exception e) {
            throw new IllegalStateException("PII Decryption Failed", e);
        }
    }
}
```

### 2) HMAC-SHA256 해시 생성기
```java
public class HmacUtils {
    public static String calculateHmac(String plainText, String secretKey) {
        try {
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKeySpec);
            byte[] hash = sha256Hmac.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Hex.encodeHexString(hash);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC Generation Failed", e);
        }
    }
}
```

### 3) 트러블슈팅 인사이트
- **GCM Nonce(IV) 재사용 금지**: 동일 키로 동일 IV를 재사용하면 엑스오어(XOR) 키스트림 분석으로 암호문이 복호화될 수 있습니다. 매 암호화 시 `SecureRandom`으로 12바이트 IV를 동적 생성해야 합니다.
- **인덱스 스키마 설계**: `email_hash` 컬럼에 B-Tree 인덱스를 걸어 풀스캔 없는 `O(log N)` 등치 조회를 달성했습니다.'
WHERE slug = 'db-level-pii-encryption-and-migration';

UPDATE study SET content_markdown = '# AI 튜터 메시징 대화형 세션 아키텍처 설계 및 구현

## 1. 기술 개념 및 핵심 이론

### 팩토리 패턴(Factory Pattern) 기반 다형적 학습 도메인 캡슐화
- 학습 플랫폼 내 문제풀이, 오답 복습, 챌린지, 개념 보강 등 4가지 서로 다른 학습 도메인을 단일 대화형 AI 세션 인터페이스로 통합하는 패턴입니다.
- `AiTutorSessionFactory`는 각 도메인 엔티티의 상태(학습 이력, 문제 난이도, 오답 유형)를 캡슐화하여 공통 `AiTutorSessionContext`로 변환하여 LLM 프롬프트 생성기로 전달합니다.

### SQS 비동기 Pub/Sub 메시징 및 Redis 멱등성(Idempotency) 보장
- **LLM Latency 격리**: 외부 LLM API(OpenAI/Claude 등) 통신의 지연시간(수 초)이 HTTP 웹 스레드를 점유하지 않도록 AWS SQS 큐로 메시지 수발신을 분리했습니다.
- **Redis INCR 기반 멱등키 보장**: SQS 메시지 재시도(Retry)가 일어날 때 `INCR idempotency:session:{messageId}` 와 TTL을 사용하여 중복 세션 응답 작성을 원자적으로 방지했습니다.

---

## 2. 내부 동작 메커니즘 및 아키텍처

```mermaid
graph LR
    User[Student App] -->|1. Prompt Request| BFF[NestJS BFF]
    BFF -->|2. Enqueue Message| SQS[AWS SQS Queue]
    SQS -->|3. Consume| Worker[Worker Engine]
    Worker -->|4. Redis Lock & Idempotency Check| Redis[(Redis)]
    Worker -->|5. Multi-Doc Tx| Mongo[(MongoDB Session Store)]
```

### MongoDB Replica Set Multi-Document Transaction
- 세션 상태 전이(ACTIVE ↔ COMPLETED)와 대화 메시지 기록(`SessionMessage`)이 원자적으로 처리되어야 하므로 MongoDB Replica Set 트랜잭션을 적용했습니다.

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) Redis 멱등키 검증 코드
```typescript
async function processAiMessage(event: SqsMessage): Promise<void> {
    const { idempotenceKey, sessionId, userPrompt } = JSON.parse(event.Body);
    
    // Redis Atomic Lock (10초 TTL)
    const isNewMessage = await redisClient.set(`idempotency:KEY_ID`, ''LOCKED'', ''NX'', ''EX'', 10);
    if (!isNewMessage) {
        console.warn(`[Duplicate Message Dropped] Key: KEY_ID`);
        return;
    }

    const sessionContext = await aiTutorSessionFactory.createContext(sessionId);
    const llmResponse = await llmClient.generateResponse(sessionContext, userPrompt);
    
    await mongoSessionRepository.appendMessageWithTx(sessionId, userPrompt, llmResponse);
}
```

### 2) 인사이트
- **도메인 격리**: 팩토리 패턴을 사용함으로 신규 학습 컨텍스트(예: AI 면접 모드)가 추가되더라도 기존 AI 파이프라인 수정을 제로화했습니다.
- **비동기 멱등성**: 네트워크 실패에 따른 SQS 재전송 상황에서도 Redis Lock으로 동일 메시지가 중복 처리되는 이중 과금을 방지했습니다.'
WHERE slug = 'ai-tutor-session-architecture';

UPDATE study SET content_markdown = '# 실시간 학생 Presence 추적 및 이상 행동 감지 시스템 구축

## 1. 기술 개념 및 핵심 이론

### WebSocket Connection Cost vs 경량 HTTP Ping/Pong Polling
- **상태 추적의 난제**: 수천 명의 동시 접속 학생 상태(온라인, 오프라인, 자리비움)를 실시간 모니터링할 때 WebSocket 연결 유지 비용(메모리, 커넥션 락)이 큽니다.
- **대안**: 1분 주기 경량 HTTP Ping API와 Redis Sorted Set(ZSET) 타임스탬프 슬라이딩 윈도우를 조합하여 서버 리소스 사용량을 90% 이상 절감하면서도 유효 접속 상태를 추적했습니다.

### 비동기 이상 행동 규칙 엔진 (Threshold Rule Engine)
- 연속 문제 스킵, 풀이 시간 이상 지연 등 이상 이벤트를 API 스레드에서 직접 처리하지 않고 SQS 비동기 파이프라인에 투입하여 실시간 점수화 및 교사 알림을 생성합니다.

---

## 2. 내부 동작 메커니즘 및 타임아웃 판정

```mermaid
graph TD
    A[Student Ping HTTP] -->|1. ZADD timestamp| B[(Redis ZSET: presence_online)]
    C[Presence Evaluator Cron] -->|2. ZREMRANGEBYSCORE old| B
    C -->|3. Active Sessions| D[Teacher Dashboard API]
```

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) Redis ZSET 기반 Presence 추적 코드
```java
@Service
@RequiredArgsConstructor
public class StudentPresenceService {
    private final StringRedisTemplate redisTemplate;
    private static final String PRESENCE_KEY = "presence:online_students";

    public void recordPing(Long studentId) {
        long currentTimestamp = System.currentTimeMillis();
        redisTemplate.opsForZSet().add(PRESENCE_KEY, String.valueOf(studentId), currentTimestamp);
    }

    public Set<String> getActiveStudents(long timeoutMillis) {
        long now = System.currentTimeMillis();
        long minScore = now - timeoutMillis; // 2분 이내 핑을 보낸 학생만 오프라인 제외
        return redisTemplate.opsForZSet().rangeByScore(PRESENCE_KEY, minScore, now);
    }
}
```

### 2) 인사이트
- **웹소켓 오버헤드 해소**: 웹소켓 지속 연결 없이도 Redis In-Memory 스코어 쿼리로 수천 명의 접속을 원활히 관측했습니다.
- **이상 행동 즉각 통지**: Hexagonal Architecture 포트/어댑터를 통해 알림 도메인과 데이터 유입계를 분리하여 확장성을 확보했습니다.'
WHERE slug = 'realtime-student-presence-and-monitoring';

UPDATE study SET content_markdown = '# 제출 문항 도메인의 CQRS 리팩토링 및 6만 건 데이터 마이그레이션

## 1. 기술 개념 및 핵심 이론

### CQRS (Command Query Responsibility Segregation) 패턴
- **개념**: 시스템의 명령(Command: C/U/D) 모델과 조회(Query: Read) 모델을 분리하는 소프트웨어 아키텍처 패턴입니다.
- **도입 배경**: 학생 답안 제출 쓰기 트래픽과 학원/교사 통계 대시보드 조회 읽기 트래픽의 access pattern이 극단적으로 달라 단일 MongoDB 컬렉션(`SubmittedProblem`)에서 집계 쿼리 실행 시 DB Lock 및 I/O 병목이 심화되었습니다.
- **해결**: 쓰기 모델은 트랜잭션 중심 구조로 유지하고, 읽기 모델은 4개의 집계 전용 컬렉션(`class-submitted`, `student-submitted`, `total-submitted`, `academy-submitted`)으로 분리했습니다.

---

## 2. 내부 동작 메커니즘 및 Eventual Consistency

```mermaid
graph LR
    A[Student Submit Answer] -->|1. Command Write| W[(SubmittedProblem DB)]
    W -->|2. Domain Event| SQS[SQS Event Bus]
    SQS -->|3. Async Sync Worker| R[(Read Models: Statistics DB)]
    Teacher[Teacher Dashboard] -->|4. Fast Query| R
```

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) CQRS 읽기 모델 업데이트 핸들러
```typescript
@EventsHandler(ProblemSubmittedEvent)
export class ProblemSubmittedHandler implements IEventHandler<ProblemSubmittedEvent> {
    constructor(private readonly readModelRepo: ReadModelRepository) {}

    async handle(event: ProblemSubmittedEvent): Promise<void> {
        const { academyId, classId, studentId, isCorrect, elapsedTime } = event;

        // 학급/학생/전체/학원 4개 Read Model 전용 컬렉션에 Atomic Incr 반영
        await Promise.all([
            this.readModelRepo.incrementClassStat(classId, isCorrect, elapsedTime),
            this.readModelRepo.incrementStudentStat(studentId, isCorrect, elapsedTime),
            this.readModelRepo.incrementAcademyStat(academyId, isCorrect, elapsedTime),
        ]);
    }
}
```

### 2) 인사이트
- **대시보드 응답속도 혁신**: 수초 이상 소요되던 MongoDB `$group` 집계 조회를 Pre-aggregated Read Model 조회로 변경하여 10ms 이내로 단축시켰습니다.
- **이벤트 정합성**: 쓰기 성능 손실 없는 비동기 이벤트를 통해 최종 정합성(Eventual Consistency)을 보장했습니다.'
WHERE slug = 'cqrs-refactoring-and-data-migration';

UPDATE study SET content_markdown = '# Spring Boot 백오피스 서버 단독 구축 및 Redis 세션 기반 크로스도메인 해결

## 1. 기술 개념 및 핵심 이론

### Spring Session Data Redis 분산 인증 메커니즘
- **서버 무상태성(Stateless)과 세션 공유**: 분산 백오피스 환경에서 서블릿 세션을 Tomcat 힙 메모리가 아닌 외부 Redis 인메모리 스토어에 보관하는 메커니즘입니다.
- `SessionRepositoryFilter`가 서블릿 요청을 가로채 `HttpSession`을 Redis 기반 `RedisSession`으로 래핑하여 다중 서버 간 동일한 세션 ID 인증을 처리합니다.

### Cross-Domain CORS & SameSite Cookie 정책
- 브라우저 보안 정책 상 프론트엔드(`admin.example.com`)와 백엔드(`api.example.com`) 도메인이 다를 때, `Set-Cookie`의 `SameSite` 속성이 `None`이고 `Secure` 플래그가 활성화되어야 크로스 도메인 요청에서 인증 쿠키가 전달됩니다.

---

## 2. 내부 동작 메커니즘 및 헤더 처리

```mermaid
graph LR
    Browser[Admin Frontend] -->|1. Cross-Domain Req| Nginx[Nginx Sub-Proxy]
    Nginx -->|2. Pass SameSite=None| Spring[Spring Boot Security]
    Spring -->|3. Session Lookup| Redis[(Redis Session Store)]
```

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) Spring Security & CookieSerializer 설정
```java
@Configuration
@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 3600)
public class RedisSessionConfig {

    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setCookieName("ADMIN_SESSION_ID");
        serializer.setSameSite("None"); // Cross-Domain 쿠키 전송 허용
        serializer.setUseSecureCookie(true);
        serializer.setCookiePath("/");
        return serializer;
    }
}
```

### 2) HMAC-SHA256 헤더 서명 알고리즘 (NCP 카카오 알림톡)
```java
public String makeSignature(String url, String timestamp, String accessKey, String secretKey) {
    String space = " ";
    String newLine = "\n";
    String method = "POST";

    String message = new StringBuilder()
        .append(method).append(space).append(url).append(newLine)
        .append(timestamp).append(newLine).append(accessKey)
        .toString();

    SecretKeySpec signingKey = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(signingKey);
    byte[] rawHmac = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
    return Base64.getEncoder().encodeToString(rawHmac);
}
```

### 3) 인사이트
- **크로스 도메인 인증 차단 해제**: CookieSerializer와 Nginx 프록시 레이어의 `SameSite=None; Secure` 설정을 조합해 도메인 분리 환경에서 SSO 로그인 세션 유지를 완성했습니다.'
WHERE slug = 'spring-boot-backoffice-and-session-auth';

UPDATE study SET content_markdown = '# 사내 공용 라이브러리 모노레포 구축 및 CLI 스캐폴딩 도구 개발

## 1. 기술 개념 및 핵심 이론

### Monorepo Workspaces & Symlink 의존성 관리
- **개념**: 여러 유틸리티 패키지(`@susimdal/common`, `@susimdal/core`, `@susimdal/infra`)를 단일 레포지토리에서 관리하고 npm/pnpm workspaces를 사용하여 레포 내부 패키지 간 심볼릭 링크(symlink)로 의존성을 연결합니다.
- **도입 효과**: 코드 복사-붙여넣기 파편화를 방지하고, 공통 예외 인터셉터나 DB 래퍼 수정 시 전사 서비스에 일괄 적용이 가능합니다.

### Node.js Commander 기반 CLI 스캐폴딩 도구
- 신규 백엔드 마이크로서비스 셋업 시 커스텀 CLI 명령(`susimdal new <name>`)을 통해 Dockerfile, GitHub Actions CI/CD, NestJS 모듈 구조 템플릿을 자동으로 스캐폴딩(Scaffolding)하는 유틸리티입니다.

---

## 2. 모노레포 레이어 아키텍처

```
packages/
├── common/  # HTTP 예외 코드, 공통 Logger, Types
├── core/    # NestJS 서버 보일러플레이트, Interceptor
└── infra/   # MongoDB, Redis, SQS 연결 래퍼
```

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) Commander 기반 CLI 구현 코드
```typescript
#!/usr/bin/env node
import { Command } from ''commander'';
import * as fs from ''fs-extra'';
import * as path from ''path'';

const program = new Command();

program
    .command(''new <serviceName>'')
    .description(''Create a new microservice boilerplate'')
    .action(async (serviceName) => {
        const targetDir = path.join(process.cwd(), serviceName);
        const templateDir = path.join(__dirname, ''../templates/backend'');

        console.log("[Scaffolding] Creating microservice: " + serviceName + "...");
        await fs.copy(templateDir, targetDir);
        
        // package.json serviceName 치환
        const pkgPath = path.join(targetDir, ''package.json'');
        const pkgContent = await fs.readJson(pkgPath);
        pkgContent.name = "@susimdal/" + serviceName;
        await fs.writeJson(pkgPath, pkgContent, { spaces: 2 });

        console.log("[Success] Microservice " + serviceName + " created successfully!");
    });

program.parse(process.argv);
```

### 2) 인사이트
- **표준화**: 전사 마이크로서비스의 에러 포맷과 로깅 규격을 통일하여 아키텍처 일관성을 달성했습니다.
- **생산성**: 신규 모듈 셋업 시간을 수일에서 수분 이내로 감축시켰습니다.'
WHERE slug = 'common-packages-and-cli-scaffolding';

UPDATE study SET content_markdown = '# Playwright 브라우저 자동화를 통한 네이버 카페 보안 세션 우회 및 E2E 답변 자동화

## 1. 기술 개념 및 핵심 이론

### Headless Browser & Cookie Context Injection
- **개념**: 화면 렌더링 없이 백그라운드에서 동작하는 Node.js 기반 Playwright 브라우저 제어 라이브러리입니다.
- **로그인 보안 우회 기법**: CAPTCHA 및 2단계 인증으로 인해 단순 HTTP Request 로그인 생성이 불가능한 구조를 해결하기 위해, OTP 입력으로 인증된 쿠키(`NID_AUT`, `NID_SES`)를 AES/GCM으로 암호화 보관 후 브라우저 Context에 주입(`browserContext.addCookies()`)하여 보안 세션을 유지합니다.

---

## 2. 내부 동작 메커니즘 및 세션 헬스체크

```mermaid
graph TD
    A[OTP Login Worker] -->|1. Extract Cookies| B[NID_AUT, NID_SES]
    B -->|2. AES/GCM Encrypt| DB[(Database Session Store)]
    Cron[Session Health Cron] -->|3. Check Valid| DB
    Worker[Answer Automation Worker] -->|4. Inject Cookies & DOM Action| Cafe[Naver Cafe Mobile DOM]
```

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) Playwright 세션 쿠키 주입 및 답글 작성 코드
```typescript
async function postAutomatedReply(postUrl: string, commentText: string, sessionCookies: any[]) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    // 1. 저장된 NID_AUT / NID_SES 세션 쿠키 주입
    await context.addCookies(sessionCookies);
    const page = await context.newPage();

    // 2. 모바일 네이버 카페 게시글 접근
    await page.goto(postUrl, { waitUntil: ''domcontentloaded'' });

    // 3. 댓글 입력 폼 클릭 및 innerHTML DOM 주입
    await page.click(''.btn_comment'');
    await page.fill(''#comment_text_area'', commentText);
    await page.click(''.btn_register'');

    await browser.close();
}
```

### 2) 인사이트
- **세션 자동 헬스체크**: 30분 주기로 세션 갱신 여부를 판별해 캡차 챌린지를 방지하고 무중단 E2E 자동 답변 시스템을 안착시켰습니다.'
WHERE slug = 'naver-cafe-session-playwright-automation';

UPDATE study SET content_markdown = '# 이메일 및 카페 문의의 다형적 통합 수집과 헤더 기반 스레딩/상태 제어 엔진 구축

## 1. 기술 개념 및 핵심 이론

### RFC 5322 이메일 헤더 스레딩 표준 (`Message-ID`, `In-Reply-To`, `References`)
- **개념**: 이메일 프로토콜 표준(RFC 5322)에서 각 메일은 고유한 `Message-ID`를 가집니다. 회신 메일은 이전 메일의 ID를 `In-Reply-To` 및 `References` 헤더에 포함합니다.
- **스레드 복원 알고리즘**: 헤더 체인을 역추적하여 부모 문의(`ParentInquiry`)를 찾아내고 개별 메일들을 하나의 대화 스레드 트리(Thread Tree) 구조로 묶어냅니다.

### 발신자 HMAC 해싱 및 Heuristic 제목 파싱
- 헤더 정보가 유실된 웹 문의의 경우, 발신자 이메일의 HMAC-SHA256 해시(`email_sender_hash`)와 정규식으로 정제된 제목(Re:, Fwd: 제거)을 기반으로 최근 24시간 내 동일 발신자의 오픈 문의에 회신으로 결속합니다.

---

## 2. 유한 상태 머신(FSM) 기반 문의 상태 전이

```mermaid
stateDiagram-v2
    [*] --> OPEN: 신규 문의 접수
    OPEN --> RESOLVED: 상담원 답변 완료
    RESOLVED --> OPEN: 고객 추가 회신 유입 (자동 재오픈)
```

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) RFC 헤더 기반 스레드 추적 구현 코드
```java
public InquiryThread resolveThread(ParsedEmail email) {
    String inReplyTo = email.getInReplyTo();
    List<String> references = email.getReferences();

    // 1. In-Reply-To 헤더로 direct parent search
    if (StringUtils.hasText(inReplyTo)) {
        Optional<Inquiry> parent = inquiryRepository.findByMessageId(inReplyTo);
        if (parent.isPresent()) {
            return parent.get().getThread();
        }
    }

    // 2. References 헤더 체인 스캔
    for (String refId : references) {
        Optional<Inquiry> refInquiry = inquiryRepository.findByMessageId(refId);
        if (refInquiry.isPresent()) {
            return refInquiry.get().getThread();
        }
    }

    // 3. Heuristic 발신자 HMAC & 제목 기반 결속
    return resolveHeuristicThread(email.getSenderEmail(), email.getCleanSubject());
}
```

### 2) 인사이트
- **상태 제어 누락 방지**: RESOLVED 상태 문의에 추가 회신이 올 때 상태를 OPEN으로 자동 복귀시켜 문의 누락율을 0%로 만들었습니다.'
WHERE slug = 'inquiry-thread-parsing-and-automatic-mapping';

UPDATE study SET content_markdown = '# Azure 로그 비용 과다 진단 및 보관 기간 최적화 (RET-001, RET-002)

## 1. 기술 개념 및 핵심 이론

### Log Analytics Workspace (LAW) 비용 과금 구조 & `Usage` 테이블
- **과금 메커니즘**: Azure LAW는 수집 데이터 용량(GB) 당 비용이 부과됩니다. 과금 대상 여부는 `Usage` 테이블의 `IsBillable == true`로 판단됩니다.
- **진단 알고리즘 (RET-001)**: `Usage` 테이블을 DataType별로 서머리 쿼리하여 비용을 과다 유발하는 톱 레이블을 식별하고, Azure Retail Prices REST API를 동적 호출해 USD 금액으로 실시간 변환합니다.

### Log Retention Tiers (Analytics vs Basic vs Archive)
- **Analytics Tier**: 31일 기본 보존, 실시간 KQL 쿼리 가능 ($2.30/GB).
- **Archive Tier**: 장기 보존(최대 7년), 쿼리 시 복원 필요 ($0.02/GB).
- **최적화 (RET-002)**: 보안 로그만 365일 Analytics 유지하고 디버그/운영 로그는 31일 후 Archive 티어로 전환하는 시뮬레이션을 수행합니다.

---

## 2. 내부 동작 메커니즘 및 쿼리 연동

```mermaid
graph LR
    LAW[(Azure LAW)] -->|1. KQL Usage Query| Engine[LogDoctor Engine]
    PricesAPI[Azure Retail Prices API] -->|2. Fetch Price per GB| Engine
    Engine -->|3. Retention Simulation| Report[Optimization Report]
```

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) Usage KQL 쿼리 및 가격 연동 코드 (Python)
```python
def analyze_law_usage(kql_client, workspace_id, price_per_gb=2.30):
    kql_query = """
    Usage
    | where TimeGenerated > ago(30d)
    | where IsBillable == true
    | summarize BillableGB = sum(Quantity) / 1024 by DataType
    | sort by BillableGB desc
    """
    response = kql_client.query_workspace(workspace_id, kql_query)
    
    results = []
    for row in response.tables[0].rows:
        data_type, gb = row[0], row[1]
        cost_usd = gb * price_per_gb
        results.append({"dataType": data_type, "gb": gb, "costUsd": cost_usd})
    return results
```

### 2) 인사이트
- **빌링 쇼크 방지**: Daily Quota 소진율 모니터링 경보를 구성하여 요금 폭탄을 사전 방지했습니다.'
WHERE slug = 'azure-log-cost-retention-optimization';

UPDATE study SET content_markdown = '# 클라우드 인프라 생존 및 앱 관측성 진단 아키텍처 (DET-001, DET-002, DET-003)

## 1. 기술 개념 및 핵심 이론

### 관측성 사각지대(Observability Blind Spot) 해결
- **문제점**: 리소스(VM, App Service)는 정상 동작 중이나, Azure Monitor Agent(AMA)가 다운되거나 Diagnostic Settings 배관이 이탈하여 로그 수집이 끊기는 모니터링 사각지대가 발생합니다.
- **해결 방안**: 계정 키를 직접 읽지 않고 LAW 텔레메트리(`Heartbeat`, `AppRequests`)만을 분석하여 인프라 생존 여부와 배관 유효성을 판별합니다.

### P95 Latency & Error Rate 수계 계산 (DET-003)
- `AppRequests` 테이블에서 헬스체크 봇 및 AlwaysOn 노이즈 요청을 제외하고 정제된 P95 지연시간(`percentile(DurationMs, 95)`)과 5xx 에러 비율을 실시간 추적합니다.

---

## 2. 내부 진단 상태 머신

```mermaid
graph TD
    Check[Diagnostic Check] -->|No Diagnostic Setting| CRITICAL[Critical: 배관 이탈]
    Check -->|Platform Logs Only| WARNING[Warning: 앱 로그 미유입]
    Check -->|Telemetry Healthy| HEALTHY[Healthy: 관측성 완비]
```

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) HTTP P95 Latency & 에러율 산출 KQL 쿼리
```kql
AppRequests
| where TimeGenerated > ago(1h)
| where Url !contains "health" and ClientIP != "127.0.0.1"
| summarize 
    TotalCount = count(),
    ErrorCount = countif(toint(ResultCode) >= 500),
    P95LatencyMs = percentile(DurationMs, 95)
    by Name
| extend ErrorRate = (todouble(ErrorCount) / TotalCount) * 100
```

### 2) 인사이트
- **사각지대 제로화**: 에러율 > 15% 및 P95 Latency > 5,000ms 자동 탐지로 인프라 관측성을 정착시켰습니다.'
WHERE slug = 'cloud-infrastructure-app-observability-diagnostics';

UPDATE study SET content_markdown = '# 지능형 로그 필터링 및 민감 정보 마스킹 엔진 (PRV-001, PRV-002, PRV-003, FLT-001, FLT-002, FLT-003)

## 1. 기술 개념 및 핵심 이론

### 프로덕션 디버그 로거 유입 감지 (PRV-001)
- **개념**: 개발 환경용 디버그 로거가 프로덕션에 방치되어 불필요한 LAW 수집 비용을 유발하는 현상입니다.
- **탐지 원리**: App Settings 환경변수(`ENV=production`)와 KQL `SeverityLevel <= 1` (Verbose/Debug) 유입량을 교차 검증하여 과다 디버그 로깅 수집 원인을 적발합니다.

### PII (개인정보) 실시간 마스킹 (FLT-001) & 노이즈 Fingerprinting (FLT-003)
- **PII Masking**: 이메일, 전화번호, JWT Token 정규식 패턴으로 마스킹(`***MASKED***`) 처리합니다.
- **Log Fingerprinting**: 에러 로그 앞 150글자의 지문(Fingerprint)을 해싱하여 반복 생성되는 고빈도 노이즈 로그를 그룹핑하고 LAW DCR Transformation KQL을 자동 생성하여 유입을 차단합니다.

---

## 2. 노이즈 필터링 및 컨텍스트 점수화 파이프라인

```mermaid
graph LR
    Log[Raw Log] -->|1. Regex Mask| PII[PII Masked Engine]
    PII -->|2. Hash First 150 Chars| FP[Fingerprint Hash]
    FP -->|3. Evaluate Context| Score[Context Quality Score: 0-100]
```

---

## 3. 핵심 구현 코드 및 트러블슈팅 인사이트

### 1) Python 정규식 PII 마스킹 처리 엔진 코드
```python
import re

class PiiMasker:
    EMAIL_REGEX = r''[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}''
    TOKEN_REGEX = r''Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*''

    @classmethod
    def mask_log_message(cls, message: str) -> str:
        if not message:
            return message
        # 1. 이메일 마스킹
        masked = re.sub(cls.EMAIL_REGEX, ''[EMAIL_MASKED]'', message)
        # 2. Authorization Bearer 토큰 마스킹
        masked = re.sub(cls.TOKEN_REGEX, ''Bearer [TOKEN_MASKED]'', masked)
        return masked
```

### 2) 인사이트
- **보안 & 비용 동시 달성**: PII 마스킹을 통한 컴플라이언스 준수와 노이즈 KQL 차단을 통한 수집 비용 감축을 완수했습니다.'
WHERE slug = 'intelligent-log-filtering-pii-masking-engine';
