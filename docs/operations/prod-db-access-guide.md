# 운영 DB 로컬 접속 가이드 (DataGrip)

- 최종 갱신: 2026-08-18
- 대상: Oracle 26ai ATP(2차, 벡터), MySQL HeatWave(1차, 관계형)
- 관련 스크립트: [deploy/scripts/mysql-bastion-tunnel.sh](../../deploy/scripts/mysql-bastion-tunnel.sh)

두 DB 모두 운영 환경에서만 접근 가능하며 로컬에서 직접 열리지 않는다. 각각 접근 경로가 다르다.

## 1. Oracle 26ai ATP (Wallet 기반, mTLS)

Worker가 이미 사용 중인 Wallet(`oracle-atp-worker-wallet` k8s Secret)을 그대로 재사용한다.

### 1.1 Wallet 파일 로컬로 추출

```bash
mkdir -p ~/oracle-wallet && cd ~/oracle-wallet
kubectl get secret oracle-atp-worker-wallet -n self-intro -o json | python3 -c "
import json,sys,base64
d = json.load(sys.stdin)['data']
for k, v in d.items():
    if k == 'README':
        continue
    open(k, 'wb').write(base64.b64decode(v))
"
```

`kubectl get secret ... -o jsonpath='{.data.$f}'`처럼 `for` 루프에 파일명을 그대로 넣으면 안 된다.
jsonpath가 파일명의 `.`을 필드 구분자로 오인해 빈 파일이 생긴다.

### 1.2 sqlnet.ora 경로 수정

Wallet 안 `sqlnet.ora`의 `DIRECTORY` 값이 `?/network/admin` 플레이스홀더로 되어 있으므로 로컬 절대경로로 교체한다.

```bash
sed -i '' "s|?/network/admin|$HOME/oracle-wallet|" ~/oracle-wallet/sqlnet.ora
```

### 1.3 TNS alias 확인

```bash
grep -o '^[A-Za-z0-9_]*_high' ~/oracle-wallet/tnsnames.ora | head -1
```

### 1.4 DataGrip 데이터소스 설정

| 필드 | 값 |
| --- | --- |
| Driver | Oracle |
| 연결 타입 | TNS |
| TNSADMIN | `~/oracle-wallet` |
| TNS 이름 | 1.3에서 확인한 alias (예: `selfintroworker_high`) |
| 사용자 | `ADMIN` (`backend-worker-db-secret`의 `DB_USERNAME`) |
| 비밀번호 | `kubectl get secret backend-worker-db-secret -n self-intro -o jsonpath='{.data.DB_PASSWORD}' \| base64 -d` |

### 1.5 VECTOR 컬럼 조회 시 ORA-17004

`job_posting_vector` / `experience_vector` / `study_vector`의 임베딩 컬럼(VECTOR 타입) 조회 시
`ORA-17004: JDBC 4.3 does not specify a default conversion for VECTOR` 에러가 나면,
데이터소스 **고급(Advanced)** 탭에 아래 속성을 추가한다.

```
oracle.jdbc.vectorDefaultGetObjectType=String
```

## 2. MySQL HeatWave (1차 데이터소스, private subnet 전용)

MySQL은 `db-private-subnet`(private, public IP 없음) 안에만 떠 있어 OKE 파드에서만 직접 도달 가능하다.
로컬 접속은 **OCI Bastion 포트포워딩 세션 + SSH 로컬 터널**로 처리한다.

### 2.1 사전 준비 (최초 1회, 이미 완료됨)

- OCI 콘솔 → Bastion → `selfntroMysqlBastion` 생성 완료
  - 대상 VCN: `self-intro-vcn`, 대상 서브넷: `db-private-subnet`
  - CIDR 허용목록: 접속자 공인 IP (`/32`) — **IP 바뀌면 콘솔에서 갱신 필요**
- `db-private-subnet`의 Security List(`db-security-list`)에 인바운드 규칙 추가 완료
  - 기존: `10.0.40.0/24`(앱 파드 subnet) → 3306만 허용되어 있었음
  - 추가: `10.0.30.0/24`(`db-private-subnet` 자신, Bastion 프라이빗 엔드포인트도 이 대역)  → 3306 허용
  - 이 규칙 없으면 SSH 터널은 붙는데 그 뒤 MySQL 연결에서 타임아웃 남 (Bastion → MySQL 구간 차단)

### 2.2 터널 열기

```bash
export BASTION_ID="ocid1.bastion.oc1.ap-chuncheon-1.amaaaaaajjd3nqya3r763dj3ljjs7bsiuw4b4iriwjsqkuzlhdusdipupesa"
./deploy/scripts/mysql-bastion-tunnel.sh
```

- 기본 로컬 포트: `13306` (`LOCAL_PORT` 환경변수로 변경 가능)
- 기본 SSH 키: `~/.ssh/id_rsa` (`SSH_PRIVATE_KEY` 환경변수로 변경 가능 — 예: `~/.ssh/id_rsa_personal`)
- 세션 TTL 최대 3시간, 만료되면 스크립트 재실행 (자동 갱신 없음, Bastion 세션 특성상 수동)
- 세션이 `ACTIVE`가 된 직후에도 SSH 인증이 간헐적으로 `Permission denied`가 날 수 있어 스크립트 내부에 짧은 재시도 로직이 들어있음

이 창은 터널이 떠 있는 동안 계속 실행 상태여야 한다 (`Ctrl+C`로 종료).

### 2.3 DataGrip 데이터소스 설정

| 필드 | 값 |
| --- | --- |
| Driver | MySQL |
| 호스트 | `localhost` |
| 포트 | `13306` (2.2의 `LOCAL_PORT`) |
| 데이터베이스 | `self_intro` |
| 사용자 | `self_intro_app` (`backend-db-secret`의 `DB_USERNAME`) |
| 비밀번호 | `kubectl get secret backend-db-secret -n self-intro -o jsonpath='{.data.DB_PASSWORD}' \| base64 -d` |

### 2.4 접근 범위

아래 4가지가 모두 갖춰져야 실제 접속까지 이어진다. 하나만 있어도 다른 게 없으면 못 들어온다.

1. Bastion CIDR 허용목록에 등록된 공인 IP
2. 세션을 생성할 수 있는 OCI IAM 자격증명 (`self-intro-api-key` 프로필)
3. 세션 생성 시 지정한 공개키와 짝을 이루는 SSH 개인키
4. MySQL 계정 로그인 정보

### 2.5 자주 겪는 문제

| 증상 | 원인 | 조치 |
| --- | --- | --- |
| 세션 생성 자체가 실패 | 공인 IP가 Bastion CIDR 허용목록과 다름 | 콘솔에서 Bastion CIDR 허용목록 갱신 |
| SSH `Permission denied (publickey)` | 세션 ACTIVE 직후 SSH 백엔드 반영 지연 | 몇 초 뒤 재시도 (스크립트는 자동 처리) |
| SSH는 붙는데 DB 연결 타임아웃 | Security List가 Bastion 대역의 3306 인바운드를 막음 | `db-security-list`에 해당 subnet CIDR 3306 인바운드 허용 확인 |
| 3시간 넘게 접속했더니 끊김 | Bastion 세션 TTL 만료 (자동 연장 없음) | 스크립트 재실행 |
