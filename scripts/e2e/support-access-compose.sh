#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE_URL="${E2E_BASE_URL:-http://localhost:8080}"
RUN_KEY="$(date +%s)-$$"
OPERATOR_LOGIN="support-e2e-operator-$RUN_KEY"
OWNER_LOGIN="support-e2e-owner-$RUN_KEY"
WORKSPACE_SLUG="support-e2e-$RUN_KEY"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/self-intro-support-access.XXXXXX")"
OPERATOR_COOKIE="$TMP_DIR/operator.cookies"
OWNER_COOKIE="$TMP_DIR/owner.cookies"
RESPONSE="$TMP_DIR/response.json"
STATUS=""
OPERATOR_ID=0
OWNER_ID=0
WORKSPACE_ID=0
REQUEST_ID=0

[[ "$BASE_URL" == http://localhost:* || "$BASE_URL" == http://127.0.0.1:* ]] || {
    echo "ERROR: 로컬 Docker Compose API에서만 실행할 수 있습니다." >&2
    exit 1
}

cd "$ROOT_DIR"
if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi
E2E_PASSWORD="${E2E_PASSWORD:-${ADMIN_PASSWORD:-}}"
[[ -n "$E2E_PASSWORD" ]] || { echo "ERROR: E2E_PASSWORD 또는 ADMIN_PASSWORD가 필요합니다." >&2; exit 1; }

db_exec() {
    docker compose exec -T backend-db sh -lc \
        'mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N'
}

cleanup() {
    set +e
    db_exec <<SQL >/dev/null 2>&1
DELETE FROM security_audit_event
WHERE actor_user_id IN ($OPERATOR_ID, $OWNER_ID) OR workspace_id = $WORKSPACE_ID;
DELETE FROM workspace WHERE id = $WORKSPACE_ID;
DELETE FROM app_user WHERE id IN ($OPERATOR_ID, $OWNER_ID);
SQL
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

csrf_token() {
    awk '$6 == "XSRF-TOKEN" { token=$7 } END { print token }' "$1" 2>/dev/null || true
}

request() {
    local jar="$1" method="$2" path="$3" body="${4:-}" token
    local args=(-sS -o "$RESPONSE" -w '%{http_code}' -X "$method" -b "$jar" -c "$jar" -H 'Accept: application/json')
    if [[ "$method" != GET ]]; then
        token="$(csrf_token "$jar")"
        [[ -z "$token" ]] || args+=(-H "X-XSRF-TOKEN: $token")
    fi
    [[ -z "$body" ]] || args+=(-H 'Content-Type: application/json' --data "$body")
    STATUS="$(curl "${args[@]}" "$BASE_URL$path")"
}

totp_code() {
    python3 -c 'import base64,hashlib,hmac,struct,sys,time
s=sys.argv[1].strip().replace(" ","").upper(); s += "="*((8-len(s)%8)%8)
k=base64.b32decode(s); c=int(time.time())//30
d=hmac.new(k,struct.pack(">Q",c),hashlib.sha1).digest(); o=d[-1]&15
print(str((struct.unpack(">I",d[o:o+4])[0]&0x7fffffff)%1000000).zfill(6))' "$1"
}

assert_status() {
    [[ "$STATUS" == "$1" ]] || {
        echo "FAIL: $2 (expected=$1 actual=$STATUS)" >&2
        jq -c . "$RESPONSE" 2>/dev/null || true
        exit 1
    }
    echo "PASS: $2 ($STATUS)"
}

echo "[1/5] Compose와 V227 확인"
docker compose ps --status running backend backend-db >/dev/null
for _ in $(seq 1 60); do
    curl -fsS "$BASE_URL/actuator/health" 2>/dev/null | jq -e '.status == "UP"' >/dev/null 2>&1 && break
    sleep 1
done
curl -fsS "$BASE_URL/actuator/health" | jq -e '.status == "UP"' >/dev/null || {
    echo "FAIL: backend health가 UP이 아닙니다." >&2; exit 1;
}
[[ "$(db_exec <<'SQL'
SELECT success FROM flyway_schema_history WHERE version = '227';
SQL
)" == 1 ]] || { echo "FAIL: V227이 적용되지 않았습니다." >&2; exit 1; }

echo "[2/5] SUPPORT 계정과 Workspace OWNER fixture 생성"
db_exec <<SQL >/dev/null
SET @password_hash = (SELECT password_hash FROM app_user WHERE login_id = '${ADMIN_USERNAME:-}' LIMIT 1);
INSERT INTO app_user (login_id, email_verified_at, password_hash, display_name, status, mfa_enabled, created_at, updated_at)
VALUES ('$OPERATOR_LOGIN', NOW(6), @password_hash, 'Support E2E Operator', 'ACTIVE', FALSE, NOW(6), NOW(6));
SET @operator_id = LAST_INSERT_ID();
INSERT INTO user_platform_role (user_id, platform_role, created_at) VALUES (@operator_id, 'SUPPORT', NOW(6));
INSERT INTO app_user (login_id, email_verified_at, password_hash, display_name, status, mfa_enabled, created_at, updated_at)
VALUES ('$OWNER_LOGIN', NOW(6), @password_hash, 'Support E2E Owner', 'ACTIVE', FALSE, NOW(6), NOW(6));
SET @owner_id = LAST_INSERT_ID();
INSERT INTO workspace (public_key, name, slug, workspace_type, status, publication_status, created_at, updated_at)
VALUES (UUID_TO_BIN(UUID()), 'Support E2E Workspace', '$WORKSPACE_SLUG', 'PERSONAL', 'ACTIVE', 'PRIVATE', NOW(6), NOW(6));
SET @workspace_id = LAST_INSERT_ID();
INSERT INTO workspace_member (workspace_id, user_id, workspace_role, status, active_owner_workspace_id, joined_at)
VALUES (@workspace_id, @owner_id, 'OWNER', 'ACTIVE', @workspace_id, NOW(6));
SQL
read -r OPERATOR_ID OWNER_ID WORKSPACE_ID <<<"$(db_exec <<SQL
SELECT
 (SELECT id FROM app_user WHERE login_id='$OPERATOR_LOGIN'),
 (SELECT id FROM app_user WHERE login_id='$OWNER_LOGIN'),
 (SELECT id FROM workspace WHERE slug='$WORKSPACE_SLUG');
SQL
)"
[[ "$OPERATOR_ID" =~ ^[0-9]+$ && "$OWNER_ID" =~ ^[0-9]+$ && "$WORKSPACE_ID" =~ ^[0-9]+$ ]] || {
    echo "FAIL: fixture ID 조회 실패" >&2; exit 1;
}

for jar in "$OPERATOR_COOKIE" "$OWNER_COOKIE"; do curl -sS -o /dev/null -c "$jar" "$BASE_URL/api/auth/csrf"; done
request "$OPERATOR_COOKIE" POST /api/auth/login "$(jq -cn --arg username "$OPERATOR_LOGIN" --arg password "$E2E_PASSWORD" '{username:$username,password:$password}')"
assert_status 200 "SUPPORT 계정 로그인"
request "$OWNER_COOKIE" POST /api/auth/login "$(jq -cn --arg username "$OWNER_LOGIN" --arg password "$E2E_PASSWORD" '{username:$username,password:$password}')"
assert_status 200 "Workspace OWNER 로그인"

request "$OPERATOR_COOKIE" POST /api/auth/mfa/enrollment
assert_status 200 "SUPPORT MFA 등록 시작"
MFA_SECRET="$(jq -r '.secret' "$RESPONSE")"
MFA_CODE="$(totp_code "$MFA_SECRET")"
request "$OPERATOR_COOKIE" POST /api/auth/mfa/enrollment/confirm "$(jq -cn --arg code "$MFA_CODE" '{code:$code}')"
assert_status 200 "SUPPORT MFA 등록 확인과 기존 세션 종료"
rm -f "$OPERATOR_COOKIE"
curl -sS -o /dev/null -c "$OPERATOR_COOKIE" "$BASE_URL/api/auth/csrf"
MFA_CODE="$(totp_code "$MFA_SECRET")"
request "$OPERATOR_COOKIE" POST /api/auth/login "$(jq -cn --arg username "$OPERATOR_LOGIN" --arg password "$E2E_PASSWORD" --arg code "$MFA_CODE" '{username:$username,password:$password,totpCode:$code}')"
assert_status 200 "SUPPORT MFA 로그인"
unset MFA_SECRET MFA_CODE

echo "[3/5] 요청과 OWNER 승인"
request "$OPERATOR_COOKIE" POST /api/ops/support-access "$(jq -cn --arg slug "$WORKSPACE_SLUG" '{workspaceSlug:$slug,reason:"Compose 고객 지원 진단 검증",scopes:["PROFILE_READ","EXPERIENCE_READ","STUDY_READ"],durationMinutes:15}')"
assert_status 200 "지원 접근 요청"
REQUEST_ID="$(jq -r '.id' "$RESPONSE")"
request "$OWNER_COOKIE" GET "/api/workspaces/$WORKSPACE_SLUG/support-access"
assert_status 200 "OWNER 요청 목록 조회"
jq -e --argjson id "$REQUEST_ID" 'any(.[]; .id == $id and .status == "PENDING")' "$RESPONSE" >/dev/null
request "$OWNER_COOKIE" POST "/api/workspaces/$WORKSPACE_SLUG/support-access/$REQUEST_ID/approve"
assert_status 200 "OWNER 지원 접근 승인"
jq -e '.status == "APPROVED" and .accessExpiresAt != null' "$RESPONSE" >/dev/null

echo "[4/5] 승인 범위별 최소 진단과 철회"
for scope in PROFILE_READ EXPERIENCE_READ STUDY_READ; do
    request "$OPERATOR_COOKIE" GET "/api/ops/support-access/$WORKSPACE_SLUG/snapshot?scope=$scope"
    assert_status 200 "$scope 최소 진단"
    jq -e --arg scope "$scope" '.scope == $scope and .data != null' "$RESPONSE" >/dev/null
done
request "$OWNER_COOKIE" POST "/api/workspaces/$WORKSPACE_SLUG/support-access/$REQUEST_ID/revoke"
assert_status 200 "OWNER 즉시 철회"
request "$OPERATOR_COOKIE" GET "/api/ops/support-access/$WORKSPACE_SLUG/snapshot?scope=PROFILE_READ"
assert_status 404 "철회 후 진단 접근 차단"

echo "[5/5] 감사 이벤트 계약 확인"
AUDIT_COUNTS="$(db_exec <<SQL
SELECT CONCAT(
 SUM(event_type='SUPPORT_ACCESS_REQUESTED'), '|',
 SUM(event_type='SUPPORT_ACCESS_APPROVED'), '|',
 SUM(event_type='SUPPORT_DATA_ACCESSED'), '|',
 SUM(event_type='SUPPORT_ACCESS_REVOKED'), '|',
 SUM(event_type='AUTHORIZATION_DENIED')
)
FROM security_audit_event WHERE workspace_id=$WORKSPACE_ID;
SQL
)"
[[ "$AUDIT_COUNTS" == "1|1|3|1|1" ]] || { echo "FAIL: 감사 이벤트 수가 다릅니다 ($AUDIT_COUNTS)" >&2; exit 1; }
echo "PASS: Support Access 요청→승인→최소 진단→철회→거부 감사 로그"
echo "DONE: Support Access Compose E2E가 완료되었습니다."
