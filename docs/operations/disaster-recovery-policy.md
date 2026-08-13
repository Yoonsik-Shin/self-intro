# Backup·복구와 Workspace 삭제 정책

- 기준일: 2026-08-11
- 적용 범위: MySQL source of truth, S3 호환 Object Storage, Oracle Vector, Redis, Oracle NoSQL
- 현재 provider: OCI MySQL HeatWave, OCI Object Storage, OKE
- 상태: **로컬 복구 rehearsal 완료, 운영 provider 증적 미승인**

## 1. 서로 다른 두 목적

Backup은 장애·잘못된 migration에서 서비스를 복구하기 위한 것이고 Workspace purge는 사용자의 데이터를
되살릴 수 없게 제거하기 위한 것이다. 오래 보존하는 backup을 무조건 안전하다고 보지 않는다. 현재
Workspace 삭제 유예는 30일이며 MySQL과 Object Storage의 recoverable backup 보존기간은 이 유예를
초과하지 않아야 한다. 그러면 폐쇄 전에 만들어진 active snapshot이 물리 purge 뒤 계속 남는 상한을
유예 안으로 제한할 수 있다.

보존기간은 최소 1일 이상이어야 하며 RPO·RTO는 운영 비용과 실제 provider 능력을 확인해 승인 기록에
남긴다. 법적 보존 의무가 별도로 생기면 일반 backup에 섞지 않고 접근 통제된 별도 정책과 근거를
정의한다. 이 문서는 법률 판단을 대신하지 않는다.

## 2. 저장소별 복구 원칙

| 저장소 | 분류 | 복구 원칙 |
| --- | --- | --- |
| MySQL | 원본·purge 제어 | 암호화 backup에서 격리 clone 복원, schema/Flyway/핵심 row 검증 |
| Object Storage | 원본·파생 파일 | public/private bucket 모두 versioning·보존 상한·복원 rehearsal 검증 |
| Oracle Vector | 재생성 가능한 파생 데이터 | MySQL Experience·Study에서 Workspace 조건으로 재색인 |
| Redis | 재생성 가능한 cache/session | cache는 재생성, DB 복원 뒤 기존 인증 session은 무효화 |
| Oracle NoSQL | 공통 catalog read model | 원본 catalog에서 재투영, Workspace 개인화 필드는 금지 |

특정 cloud SDK를 도메인에 넣지 않는다. 실제 provider 명칭과 증적은 승인 파일에 기록하지만 release gate는
보존기간·복원·versioning·재조정이라는 공통 계약만 검사한다.

## 3. 복원 순서

1. 외부 트래픽과 purge scheduler를 모두 끈 maintenance 환경에 복원한다.
2. MySQL schema, 성공 Flyway history, Workspace와 purge job/checkpoint 정합성을 확인한다.
3. Service selector가 연결되지 않은 격리 Worker에서 maintenance reconciliation을 실행한다. 이 과정은
   `DELETED` Workspace의 누락된 purge job/checkpoint를 복원하고, 활성 Membership과 사용 가능한 초대를
   다시 차단하며, 복원 때문에 중단된 `PURGING` job을 `FAILED/RESTORE_INTERRUPTED`로 바꿔 재시도
   가능하게 만든다. 활성 Workspace와 purge job의 공존, terminal job과 아직 남은 Workspace처럼 의미가
   하나로 결정되지 않는 모순은 자동 수정하지 않고 blocker로 중단한다.
4. public/private object prefix와 version, vector, cache를 dry-run으로 대조한다.
5. Redis 인증 session을 무효화하고 파생 cache를 재생성한다.
6. 운영자가 복구 결과와 purge 재조정 결과를 승인한 뒤에만 트래픽을 연다.

reconciliation runner는 `APP_RUNTIME_ROLE=worker`, `MAINTENANCE_MODE=true`,
`WORKSPACE_RESTORE_RECONCILIATION_ENABLED=true`, `WORKSPACE_PURGE_EXECUTION_ENABLED=false`일 때만
실행된다. API role에는 bean 자체가 만들어지지 않는다. 장기 실행 production Deployment에서는 maintenance와
reconciliation flag를 모두 false로 유지한다. 실제 복원 때만 외부 Service가 선택하지 않는 격리 Worker를
띄워 blocker 0과 dry-run 결과를 확인하고 즉시 종료한다. 로컬 구현과 clone rehearsal은 완료했지만 OCI 복원
환경 검증은 완료되지 않았으므로 승인 예시의 boolean은 아직 운영 증적이 아니다.

## 4. Release gate

`scripts/check-workspace-purge-release-gate.sh`는 production Kustomize overlay를 검사한다.

- 다섯 purge flag가 모두 false면 fail-closed 상태로 통과한다.
- provider flag 하나라도 true면 `deploy/recovery/workspace-purge-approval.env`가 필요하다.
- MySQL/Object backup 보존일은 `WORKSPACE_DELETION_GRACE_PERIOD` 이하여야 한다.
- 승인 만료일, 암호화, MySQL 복원, public/private bucket versioning, Object 복원, maintenance 복원,
  purge 재조정 검증이 모두 필요하다.
- 전체 실행 flag가 true면 네 provider flag도 모두 true여야 한다.

예시 파일은 형식만 보여주며 증적이 아니다. 실제 승인 파일에도 Secret, bucket credential, 사용자 이름,
이메일, Workspace 이름을 넣지 않는다. GitHub workflow를 branch protection의 required check로 지정해야
직접 main 변경에도 강제력이 생긴다. CI는 선언의 형식과 만료를 검사할 뿐 provider 콘솔의 사실 여부를
대신 증명하지 않으므로 `APPROVAL_REF`가 가리키는 내부 복구 기록을 운영자가 별도로 검토한다.

## 5. 현재 검증과 남은 일

완료:

- 현재 로컬 MySQL logical backup의 disposable clone 복원
- source/clone table 95개, 성공 Flyway migration 122개, Workspace 1개 일치
- clone과 격리 provider fixture에서 5개 purge checkpoint·잔여 0건·멱등성 검증
- 복원 직후 deterministic reconciliation, 모순 blocker, 중단된 lease의 재시도 상태 전환 구현
- API/Worker runtime role 분리와 purge scheduler·reconciliation runner의 Worker-only 생성 검증
- disposable clone에서 reconciliation을 먼저 실행한 뒤 전체 purge rehearsal 통과
- production overlay의 삭제 유예 30일 명시
- false 잠금, 증적 누락 차단, 단계적 provider 승인, 불완전한 전체 실행 차단 gate 테스트

미완료:

- OCI MySQL 자동 backup 주기·암호화·보존 30일 이하 확인과 실제 clone 복원
- OCI public/private bucket versioning·lifecycle·backup 보존 30일 이하 확인과 복원
- OCI 복원 clone에서 Service 비노출 격리 Worker reconciliation E2E와 실행 후 workload 종료 절차 검증
- required status check 설정과 운영자 승인 기록
