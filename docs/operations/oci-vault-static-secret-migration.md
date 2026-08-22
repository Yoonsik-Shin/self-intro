# OCI Vault 정적 Secret 이전 — OKE Basic production 직접 전환

- 기준일: 2026-08-22
- 환경: 별도 stage 없음. 개발 기간에는 `main`이 production으로 직접 배포된다.
- 현재 범위: API SMTP username/password 2개
- 비용: 기존 OCI DEFAULT Vault, software-protected key, OKE Basic node 재사용. 예상 추가 고정비 `$0`
- 제외: OKE Enhanced, Secrets Store CSI Driver, 신규 node, Private Vault/HSM

## 1. 현재 적용 구조

Workspace 사용자가 연결한 AI API key용 `SecretProvider`와 애플리케이션 시작에 필요한 정적 Secret 전달을
구분한다. 이번 전환은 후자 중 SMTP만 대상으로 한다.

1. `self-intro-vault-reader` 비대화형 OCI IAM 사용자가 `self-intro-vault-readers` 그룹에 속한다.
2. 정책 `self-intro-vault-reader-policy`는 `self-intro` compartment의 Secret bundle 읽기만 허용한다.
3. `self-intro-prod-smtp-username`, `self-intro-prod-smtp-password`가 기존 Vault/key로 암호화되어 있다.
4. API Pod의 init container가 config-file 인증으로 두 bundle을 읽어 `emptyDir.medium: Memory`에 `0400`
   파일로 기록한다.
5. main container는 결과 volume만 read-only로 보고 OCI config와 signing private key는 mount하지 않는다.
6. `StaticSecretFileEnvironmentPostProcessor`가 파일을 Spring property로 연결한다. 필수 파일 누락, 잘못된
   파일명, symlink, NUL 값은 fail-closed한다.
7. production API는 `backend-mail-secret`을 `envFrom`으로 소비하지 않는다. 기존 SealedSecret은 즉시
   rollback용으로만 남긴다.

Bootstrap API signing private key는 SealedSecret에 남는 최소 잔여 위험이다. workload read 범위만 갖고
console password와 Secret lifecycle 권한은 없다. 90일 이내 회전하며 노출이 의심되면 OCI에서 fingerprint를
제거하고 새 key를 봉인한 뒤 Pod를 재생성한다.

## 2. stage 없는 배포 원칙

별도 stage를 새로 만들지 않는다. production에서 다음 안전장치를 결합한다.

- 코드, 단위 테스트, image 내부 bootstrap JAR, production Kustomize render를 배포 전에 검증한다.
- API Deployment를 `RollingUpdate(maxUnavailable: 0, maxSurge: 1)`로 바꿔 기존 Ready Pod를 유지한다.
- 단일 OKE node의 CPU request 여유가 부족하므로 rollout 직전에 비동기 AI Worker를 일시적으로 0으로
  내린다. 웹 API가 새 Pod로 전환된 뒤 Worker를 즉시 원복한다.
- init 실패, OCI 401/403, readiness 실패가 발생하면 rollout을 중단한다. 기존 Ready API가 계속 트래픽을
  처리한다.
- 평문 fallback은 만들지 않는다. rollback 시 이전 Deployment spec의 `backend-mail-secret` env 주입을
  복원하고 image를 되돌린다.
- 한 번에 한 Secret 그룹만 이전한다. SMTP 안정화 전 결제, DB, MFA, Worker token은 옮기지 않는다.

Argo CD self-heal이 Worker 일시 scale을 되돌릴 수 있으므로 scale, API scheduling, Worker 복원을 한 흐름에서
계속 관찰한다. node 증설이 필요해지는 경우에는 즉시 중단하고 비용을 먼저 보고한다.

## 3. 검증과 모니터링

배포 전:

```bash
cd backend
./gradlew :api:spotlessCheck :api:test :secret-bootstrap:test \
  :api:bootJar :secret-bootstrap:bootJar --no-daemon
cd ..
python3 deploy/k8s/examples/oci-vault-static-secrets/validate_inventory.py
kubectl kustomize deploy/k8s/overlays/prod/backend >/tmp/self-intro-prod-backend.yaml
```

배포 후에는 다음을 모두 확인한다.

- GitHub Actions API/Worker 품질 gate와 image build 성공
- Argo CD `Synced/Healthy`, production revision 일치
- API init container 완료, API/Worker Ready, restart 0
- API health/readiness와 `https://unbrdn.me/` HTTP 200
- API main container에 OCI config/private key가 mount되지 않음
- SMTP username/password 환경변수가 main container에 없고, memory file은 존재·`0400`이나 원문은 출력하지 않음
- 가입 확인 메일 실제 수신
- OCI 401/403, init error, Spring mail authentication error, 5xx가 없음

## 4. 회전과 장애 복구

### SMTP Secret 회전

1. SMTP provider에서 새 credential을 발급한다.
2. OCI Secret에 새 version을 추가한다.
3. API를 통제된 방식으로 재시작하고 init, readiness, 실제 메일을 확인한다.
4. 최소 30분 동안 오류·재시작·메일 실패를 관찰한다.
5. 구 SMTP credential과 이전 Secret version을 폐기한다.

### OCI signing key 회전

1. OCI IAM 사용자에 새 public key를 추가한다.
2. 새 private key/config로 SealedSecret을 갱신한다.
3. API rollout과 Vault read 성공을 확인한다.
4. 이전 fingerprint를 OCI IAM 사용자에서 제거한다.

### rollback

init 또는 readiness가 실패하면 새 rollout을 중단하고 이전 production manifest로 되돌린다. 이 manifest는
`backend-mail-secret` env 주입을 복원한다. Git에 평문을 커밋하거나 임시 환경변수로 수동 복제하지 않는다.

## 5. 후속 이전 순서

SMTP 안정화 후에도 자동으로 다른 Secret을 옮기지 않는다.

1. sandbox 결제와 외부 AI
2. Storage와 Ko-fi
3. `INTERNAL_WORKER_TOKEN` dual-token 전환
4. DB credential dual-user 전환과 ATP wallet 별도 rehearsal
5. MFA keyring·재암호화 구현 후 `MFA_ENCRYPTION_KEY`

각 그룹은 새 version, production 직접 rollout, 실제 smoke, 장애 복구 검증을 통과한 뒤에만 기존
SealedSecret 소비 경로를 제거한다.

## 6. 비용 판정

이번 SMTP 전환을 위해 만든 IAM 사용자·그룹·policy와 API key에는 별도 고정비가 없고, 기존 Vault/key와
기존 node를 재사용한다. 따라서 예상 추가 고정비는 `$0`이다. Secret 저장·API 호출 사용량이 현재 과금 또는
무료 한도를 넘어설 가능성, 신규 node, Private Vault/HSM, egress gateway가 필요해지면 생성 전에 실제 견적을
보고하고 승인을 받는다.
