# Ko-fi (PayPal) 후원 결제 연동 가이드 및 매뉴얼

## 1. 개요
기존 결제대행사(PayApp) 대신 개인 창작자/개발자 후원에 최적화된 **Ko-fi (PayPal 연동)**를 사용하여 후원을 받고, **Ko-fi Webhook v2**를 통해 후원 내역을 백엔드 DB에 자동 반영합니다.

---

## 2. 사전 준비 및 설정 단계

### Step 1: Ko-fi 계정 및 PayPal 연결
1. [Ko-fi.com](https://ko-fi.com) 회원가입 및 프로필 작성 (예: `https://ko-fi.com/yourname`).
2. `Account Settings` -> `Payment Direct` 메뉴에서 본인의 **PayPal 계정** 연결.

### Step 2: Ko-fi Webhook 설정
1. Ko-fi 로그인 후 `More` -> `Settings` -> `Developer API` (또는 `Webhooks`) 클릭.
2. **Verification Token**: 화면에 표시된 고유한 Token 값을 복사.
3. **Webhook URL**: 배포된 백엔드 서버 URL 설정.
   - 예: `https://your-domain.com/api/donations/kofi/webhook`
4. [Send Test Request] 버튼을 눌러 정상 수신 테스트 가능.

---

## 3. 환경변수 (Environment Variables) 설정

백엔드 서버 환경변수에 아래 설정을 등록합니다:

```env
KOFI_PAGE_URL=https://ko-fi.com/yourname
KOFI_VERIFICATION_TOKEN=ko-fi에서_복사한_verification_token
```

* `application.yml` 기본 매핑:
  - `app.donation.kofi.page-url`: `${KOFI_PAGE_URL:https://ko-fi.com}`
  - `app.donation.kofi.verification-token`: `${KOFI_VERIFICATION_TOKEN:}`

---

## 4. 백엔드 처리 흐름 (Architecture)

1. 사용자가 서비스 모달에서 **[Ko-fi에서 후원하기]** 클릭 -> `https://ko-fi.com/yourname` 열림.
2. 후원자가 Ko-fi에서 결제(PayPal / 카드) 완료.
3. Ko-fi 서버가 등록된 Webhook URL(`POST /api/donations/kofi/webhook`)로 JSON payload 전달.
4. 백엔드 `KofiWebhookController` 및 `DonationService`:
   - `verification_token` 검증
   - `kofi_transaction_id` 중복 검증 (멱등성 보장)
   - `Donation` 및 `DonationEvent` (`KOFI` actor) 엔티티 생성 및 `PAID` 상태 저장.
5. 어드민 페이지에서 후원 내역(`Ko-fi` 표기) 및 금액/메시지 확인 가능.

---

## 5. 배포 처리 현황 (2026-07-23)

### 5.1 코드 준비 상태

| 영역 | 내용 | 상태 |
| --- | --- | --- |
| 백엔드 | `KofiWebhookController` + `DonationService.handleKofiWebhook` — 토큰 검증(상수시간 비교), `kofi_transaction_id` 멱등 처리, `DonationEventActor.KOFI` 이벤트 기록 | 완료, 단위 테스트 통과 (`DonationServiceTest` 31건, `KofiWebhookControllerTest` 2건) |
| 보안 설정 | `SecurityConfig` — webhook 경로 CSRF 예외 + `permitAll` 추가 | 완료 |
| 설정 바인딩 | `DonationProperties.Kofi(pageUrl, verificationToken)`, `application.yml`에 `KOFI_PAGE_URL` / `KOFI_VERIFICATION_TOKEN` 매핑 | 완료 |
| 프론트엔드 | `DonationModal`을 PayApp 팝업/폴링 방식에서 Ko-fi 외부 링크 오픈 방식으로 단순화. `/api/donations/config` 응답에 `kofiPageUrl` 포함 | 완료 |
| 어드민 UI | 후원 내역 탭에 `KOFI` actor 라벨(`Ko-fi`) 추가 | 완료 |

### 5.2 인프라/시크릿 처리 (신규 확인 필요했던 부분)
운영 배포 전 점검 결과, **`KOFI_VERIFICATION_TOKEN`이 클러스터에 반영되지 않은 상태**였습니다. 이 값이 비어있으면 `verifyKofiToken()`이 항상 거부하므로 실제 후원 webhook이 전부 조용히 실패하는 상황이었습니다. 아래 순서로 처리 완료:

1. `KOFI_PAGE_URL`(공개 값)은 `deploy/k8s/overlays/prod/backend/kustomization.yaml`의 `configMapGenerator`에 평문으로 추가 — 시크릿 불필요.
2. `KOFI_VERIFICATION_TOKEN`(민감 값)은 운영자가 직접 클러스터에 raw Secret으로 생성:
   ```bash
   kubectl create secret generic backend-kofi-secret -n self-intro \
     --from-literal=KOFI_VERIFICATION_TOKEN='<Ko-fi Verification Token>'
   ```
3. `deploy/k8s/overlays/prod/backend/generate-sealed-kofi-secret.sh` 실행 → `sealed-kofi-secret.yaml` 생성 (kubeseal로 암호화, 평문 없음).
4. `kustomization.yaml`의 `resources`에 `sealed-kofi-secret.yaml` 추가 (기존 payapp/db/ai/storage secret과 동일 패턴으로 누락돼 있던 부분).
5. `kubectl kustomize`로 렌더링 검증 — `backend-kofi-secret`이 deployment `envFrom`과 리소스 목록에 정상 포함되는 것 확인.

### 5.3 남은 절차
- [ ] 변경사항(백엔드/프론트/k8s manifest) 커밋 및 `main` push → CI(`deploy.yml`)가 이미지 빌드 후 `kustomization.yaml`의 `newTag`를 자동 갱신하는 bot 커밋을 남기고, GitOps 컨트롤러가 실제 클러스터에 반영.
- [ ] Ko-fi `Developer API` 설정 화면의 Webhook URL을 `https://api.unbrdn.me/api/donations/kofi/webhook`으로 등록.
- [ ] Ko-fi의 `Send Test Request`로 실제 webhook 수신 확인 (어드민 후원 내역에 `Ko-fi` 항목 생성되는지).
- [ ] 소액 실결제 1회 스모크 테스트.

### 5.4 참고: PayApp과의 관계
PayApp 연동은 유지된 채로 Ko-fi가 추가되는 구조입니다(대체 아님). `DonationEventActor`에 `PAYAPP`, `KOFI` 둘 다 존재하며, 프론트 후원 모달은 현재 Ko-fi 링크만 노출하도록 단순화되어 있어 PayApp 결제 UI는 당장 사용되지 않지만 백엔드 콜백 처리 로직은 그대로 남아있습니다.
