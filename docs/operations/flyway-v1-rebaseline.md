# Flyway V1 재기준화 운영 가이드

## 목적

누적된 V1~V235 migration을 현재 검증된 스키마와 동일한 단일 `V1__baseline_schema.sql`로 재기준화한다.
새 데이터베이스는 V1을 실행해 스키마를 만들고, 기존 로컬·운영 데이터베이스는 데이터를 유지한 채
Flyway 이력만 기준선 1로 전환한다.

## 기준 스키마와 범위

- 기존 migration 140개를 빈 MySQL 8.0 데이터베이스에 순서대로 실행해 109개 애플리케이션 테이블을 재현했다.
- 재현 결과를 운영 스키마와 비교했으며 테이블·컬럼·키·인덱스 구조가 일치함을 확인했다.
- V1은 스키마 DDL만 포함한다. 개인 정보, 경력·학습 데이터, 운영 설정, demo·seed 데이터는 포함하지 않는다.
- 기존 데이터는 V1 파일로 옮기지 않고 데이터베이스 백업과 기존 데이터베이스 자체로 보존한다.
- 이후 변경은 V2부터 순차 번호로 추가한다. `out-of-order` migration은 허용하지 않는다.

## 상시 안전 설정

- `FLYWAY_BASELINE_ON_MIGRATE=false`
- `JPA_DDL_AUTO=validate`
- `spring.flyway.out-of-order=false`

`baseline-on-migrate`는 기존 데이터베이스 전환 시 한 번만 명시적으로 활성화한다. 상시 활성화하면 잘못된
데이터베이스를 정상 기준선으로 오인할 수 있다. Hibernate는 스키마를 수정하지 않고 검증만 수행한다.

## 새 데이터베이스 검증

1. 빈 MySQL 8.0 데이터베이스를 생성한다.
2. 상시 안전 설정으로 API를 기동한다.
3. `flyway_schema_history`에 `V1` SQL migration 한 건이 성공으로 기록됐는지 확인한다.
4. 애플리케이션 테이블 109개와 Hibernate `validate` 성공을 확인한다.
5. API health와 핵심 읽기 smoke test를 수행한다.

## 기존 로컬·운영 데이터베이스 전환

아래 절차는 로컬과 운영에 동일하게 적용하되 운영은 maintenance window에서 수행한다.

1. API와 Worker의 쓰기를 중단한다.
2. 데이터와 `flyway_schema_history`를 포함한 전체 백업을 생성한다.
3. 별도 데이터베이스에 백업을 복원하고 테이블·행 수 및 애플리케이션 기동을 확인한다.
4. 현재 migration 성공 건수, 최대 version, 애플리케이션 테이블 수를 기록한다.
5. `flyway_schema_history`를 즉시 삭제하지 않고 시각이 포함된 백업 이름으로 변경한다.
6. `FLYWAY_BASELINE_ON_MIGRATE=true`, `JPA_DDL_AUTO=validate`로 API를 한 번만 기동한다.
7. 새 `flyway_schema_history`에 version 1의 `BASELINE` 한 건이 생성되고 V1 SQL이 기존 스키마에 재실행되지
   않았는지 확인한다.
8. API를 중단하고 `FLYWAY_BASELINE_ON_MIGRATE=false`로 되돌린다.
9. API, Worker 순서로 재기동하고 health, 로그인, 공개 Workspace, 관리 읽기·쓰기 smoke test를 수행한다.
10. 전환 전후 핵심 테이블 행 수와 스키마 구조를 비교한다.

기존 이력 백업 테이블은 첫 V2 migration의 운영 적용과 복구 rehearsal이 끝날 때까지 보존한다. 삭제는 별도
승인 작업으로 취급한다.

## 롤백

- 새 V2 migration 적용 전 문제가 발생하면 애플리케이션을 중단하고 새 이력 테이블을 보존한 뒤, 변경 전
  이력 테이블 이름을 복원한다.
- 데이터나 스키마가 변경됐다면 이력 테이블만 되돌리지 않는다. 검증한 전체 백업을 복원한다.
- 운영에서 `repair`, 이력 행 직접 수정, 임의 역 SQL을 먼저 실행하지 않는다.

## 현재 상태

- V1 DDL 생성과 빈 MySQL 적용 검증: 완료 (109개 테이블, 862개 컬럼, 355개 제약조건)
- 운영 스키마와 전체 migration 재현 스키마 비교: 완료 (정규화한 구조 비교 결과 차이 없음)
- 새 DB Flyway 경로 검증: 완료 (`V1` SQL migration 1건 실행)
- 기존 DB 일회성 baseline 경로 검증: 완료 (`BASELINE` version 1 생성, V1 SQL 미실행)
- V1 스키마 대상 Hibernate `validate`: 완료
- 전체 백엔드 테스트: 완료 (`./gradlew test`, 20개 task 성공)
- migration과 엔티티 정의 정합화: 완료 (`BINARY(32)`, `CHAR(64)`, `DECIMAL(4,3)`, `TINYINT`)
- 로컬 보존 DB 이력 전환: 미실행
- 운영 DB 백업·복원 rehearsal 및 이력 전환: 미실행
- main 병합·배포: 미실행

위 완료 항목은 폐기 가능한 MySQL 검증 환경에서 수행했다. 로컬 보존 DB와 운영 DB의 데이터 및
`flyway_schema_history`에는 아직 어떤 변경도 적용하지 않았다. 운영 전환은 백업을 실제로 별도 DB에
복원해 검증한 뒤 별도 승인 시점에만 진행한다.
