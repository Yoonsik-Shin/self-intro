#!/usr/bin/env bash
set -euo pipefail

E2E_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E_BASE_URL="${E2E_BASE_URL:-http://localhost:8080}"
E2E_RUN_KEY="$(date +%s)-$$"
E2E_EMAIL="withdrawal-e2e-$E2E_RUN_KEY@example.invalid"
E2E_INVITATION_CODE="withdrawal-e2e-invite-$E2E_RUN_KEY"
E2E_PASSWORD="Withdraw-${E2E_RUN_KEY:0:12}!Aa1"
E2E_NICKNAME="탈퇴 UAT $E2E_RUN_KEY"
E2E_TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/self-intro-withdrawal-e2e.XXXXXX")"
E2E_COOKIE_A="$E2E_TMP_DIR/session-a.cookies"
E2E_COOKIE_B="$E2E_TMP_DIR/session-b.cookies"
E2E_RESPONSE="$E2E_TMP_DIR/response.json"
E2E_STATUS=""
E2E_USER_ID="0"

if [[ "$E2E_BASE_URL" != http://localhost:* && "$E2E_BASE_URL" != http://127.0.0.1:* ]]; then
    echo "ERROR: 이 스크립트는 로컬 Docker Compose API에서만 실행할 수 있습니다." >&2
    exit 1
fi

cd "$E2E_ROOT_DIR"

db_exec() {
    docker compose exec -T backend-db sh -lc \
        'mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N'
}

cleanup() {
    set +e
    db_exec <<SQL >/dev/null 2>&1
DELETE FROM security_audit_event
WHERE actor_user_id = $E2E_USER_ID
   OR (target_type = 'APP_USER' AND target_id = '$E2E_USER_ID');
DELETE FROM app_user WHERE id = $E2E_USER_ID;
DELETE FROM registration_invitation
WHERE code_hash = UNHEX(SHA2('$E2E_INVITATION_CODE', 256));
SQL
    rm -rf "$E2E_TMP_DIR"
}
trap cleanup EXIT INT TERM

csrf_token() {
    local cookie_jar="$1"
    [[ -f "$cookie_jar" ]] || return 0
    awk '$6 == "XSRF-TOKEN" { token=$7 } END { print token }' "$cookie_jar"
}

request() {
    local cookie_jar="$1"
    local method="$2"
    local path="$3"
    local body="${4:-}"
    local token=""
    local args=(
        -sS -o "$E2E_RESPONSE" -w '%{http_code}'
        -X "$method" -b "$cookie_jar" -c "$cookie_jar"
        -H 'Accept: application/json'
        -H 'User-Agent: Mozilla/5.0 SelfIntroAccountWithdrawalE2E'
    )
    if [[ "$method" != "GET" ]]; then
        token="$(csrf_token "$cookie_jar")"
        if [[ -n "$token" ]]; then
            args+=(-H "X-XSRF-TOKEN: $token")
        fi
    fi
    if [[ -n "$body" ]]; then
        args+=(-H 'Content-Type: application/json' --data "$body")
    fi
    E2E_STATUS="$(curl "${args[@]}" "$E2E_BASE_URL$path")"
}

assert_status() {
    local expected="$1"
    local label="$2"
    if [[ "$E2E_STATUS" != "$expected" ]]; then
        echo "FAIL: $label (expected=$expected, actual=$E2E_STATUS)" >&2
        if [[ -s "$E2E_RESPONSE" ]]; then
            jq -c 'del(.password, .token, .secret)' "$E2E_RESPONSE" 2>/dev/null || true
        fi
        exit 1
    fi
    echo "PASS: $label ($E2E_STATUS)"
}

wait_for_backend() {
    local attempt
    for attempt in $(seq 1 60); do
        if curl -fsS "$E2E_BASE_URL/actuator/health" 2>/dev/null |
            jq -e '.status == "UP"' >/dev/null 2>&1; then
            echo "PASS: backend health UP"
            return 0
        fi
        sleep 1
    done
    echo "FAIL: backend가 60초 안에 healthy 상태가 되지 않았습니다." >&2
    exit 1
}

wait_for_verification_token() {
    local attempt mail_id token
    for attempt in $(seq 1 30); do
        mail_id="$(
            docker compose exec -T mailpit wget -qO- 'http://127.0.0.1:8025/api/v1/messages?limit=100' |
                jq -r --arg email "$E2E_EMAIL" \
                    '.messages[] | select(.Subject == "Self-Intro 이메일 확인" and any(.To[]; .Address == $email)) | .ID' |
                head -1
        )"
        if [[ -n "$mail_id" && "$mail_id" != "null" ]]; then
            token="$(
                docker compose exec -T mailpit wget -qO- "http://127.0.0.1:8025/api/v1/message/$mail_id" |
                    jq -r '.Text' |
                    grep -o '#token=[A-Za-z0-9_-]*' |
                    head -1 |
                    cut -d= -f2
            )"
            if [[ -n "$token" ]]; then
                printf '%s' "$token"
                return 0
            fi
        fi
        sleep 1
    done
    echo "FAIL: Mailpit에서 가입 확인 token을 찾지 못했습니다." >&2
    return 1
}

echo "[1/6] Compose 서비스 확인"
docker compose ps --status running backend backend-db mailpit >/dev/null
wait_for_backend

echo "[2/6] 탈퇴 전용 임시 계정 가입과 이메일 확인"
db_exec <<SQL >/dev/null
INSERT INTO registration_invitation (
    code_hash, label, recipient_email_canonical, expires_at, max_uses, used_count,
    sent_count, status, created_at
) VALUES (
    UNHEX(SHA2('$E2E_INVITATION_CODE', 256)), 'Compose 탈퇴 UAT', '$E2E_EMAIL',
    DATE_ADD(NOW(6), INTERVAL 2 DAY), 1, 0, 0, 'ACTIVE', NOW(6)
);
SQL
curl -sS -o /dev/null -c "$E2E_COOKIE_A" "$E2E_BASE_URL/api/auth/csrf"
request "$E2E_COOKIE_A" POST /api/auth/registrations \
    "$(jq -cn \
        --arg invitationCode "$E2E_INVITATION_CODE" \
        --arg email "$E2E_EMAIL" \
        --arg password "$E2E_PASSWORD" \
        --arg nickname "$E2E_NICKNAME" \
        '{invitationCode:$invitationCode,email:$email,password:$password,nickname:$nickname,termsAccepted:true,privacyAccepted:true,marketingAccepted:false}')"
assert_status 202 "초대 기반 임시 계정 가입"
E2E_USER_ID="$(db_exec <<SQL
SELECT id FROM app_user WHERE email_canonical = '$E2E_EMAIL';
SQL
)"
[[ "$E2E_USER_ID" =~ ^[0-9]+$ ]] || {
    echo "FAIL: 임시 계정 ID를 찾지 못했습니다." >&2
    exit 1
}
E2E_VERIFICATION_TOKEN="$(wait_for_verification_token)"
request "$E2E_COOKIE_A" POST /api/auth/email-verifications \
    "$(jq -cn --arg token "$E2E_VERIFICATION_TOKEN" '{token:$token}')"
assert_status 204 "임시 계정 이메일 확인"
unset E2E_VERIFICATION_TOKEN

echo "[3/6] 서로 다른 두 세션 로그인"
request "$E2E_COOKIE_A" POST /api/auth/login \
    "$(jq -cn --arg username "$E2E_EMAIL" --arg password "$E2E_PASSWORD" \
        '{username:$username,password:$password}')"
assert_status 200 "세션 A 로그인"
curl -sS -o /dev/null -c "$E2E_COOKIE_B" "$E2E_BASE_URL/api/auth/csrf"
request "$E2E_COOKIE_B" POST /api/auth/login \
    "$(jq -cn --arg username "$E2E_EMAIL" --arg password "$E2E_PASSWORD" \
        '{username:$username,password:$password}')"
assert_status 200 "세션 B 로그인"
request "$E2E_COOKIE_A" GET /api/auth/me
assert_status 200 "세션 A 인증 확인"
request "$E2E_COOKIE_B" GET /api/auth/me
assert_status 200 "세션 B 인증 확인"

echo "[4/6] 탈퇴 조건과 재인증 강제 확인"
request "$E2E_COOKIE_A" GET /api/account/withdrawal-readiness
assert_status 200 "탈퇴 준비 상태 조회"
jq -e '.eligible == true and .activeMembershipCount == 0 and .ownedWorkspaceBlockers == [] and .platformRoleBlockers == [] and .confirmationPhrase == "계정 탈퇴"' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_A" DELETE /api/account '{"confirmation":"계정 탈퇴"}'
assert_status 401 "비밀번호 재확인 없는 탈퇴 차단"
request "$E2E_COOKIE_A" POST /api/auth/reauthenticate \
    "$(jq -cn --arg password "$E2E_PASSWORD" '{password:$password}')"
assert_status 204 "탈퇴 직전 비밀번호 재확인"

echo "[5/6] 계정 탈퇴와 모든 세션 무효화"
request "$E2E_COOKIE_A" DELETE /api/account '{"confirmation":"계정 탈퇴"}'
assert_status 204 "계정 탈퇴 완료"
request "$E2E_COOKIE_A" GET /api/auth/me
assert_status 401 "탈퇴 처리 세션 A 무효화"
request "$E2E_COOKIE_B" GET /api/auth/me
assert_status 401 "동시 로그인 세션 B 무효화"
curl -sS -o /dev/null -c "$E2E_COOKIE_A" "$E2E_BASE_URL/api/auth/csrf"
request "$E2E_COOKIE_A" POST /api/auth/login \
    "$(jq -cn --arg username "$E2E_EMAIL" --arg password "$E2E_PASSWORD" \
        '{username:$username,password:$password}')"
assert_status 401 "탈퇴 전 이메일과 비밀번호 재로그인 차단"

echo "[6/6] DB 익명화와 감사 로그 확인"
E2E_WITHDRAWAL_STATE="$(db_exec <<SQL
SELECT CONCAT(
    status, '|',
    login_id LIKE CONCAT('withdrawn-', id, '-%'), '|',
    email IS NULL, '|',
    email_canonical IS NULL, '|',
    withdrawn_at IS NOT NULL
)
FROM app_user
WHERE id = $E2E_USER_ID;
SQL
)"
[[ "$E2E_WITHDRAWAL_STATE" == "DELETED|1|1|1|1" ]] || {
    echo "FAIL: 계정 상태·로그인 식별자·연락처 익명화가 예상과 다릅니다 ($E2E_WITHDRAWAL_STATE)." >&2
    exit 1
}
E2E_AUDIT_COUNT="$(db_exec <<SQL
SELECT COUNT(*)
FROM security_audit_event
WHERE event_type = 'ACCOUNT_WITHDRAWN'
  AND actor_user_id = $E2E_USER_ID
  AND target_type = 'APP_USER'
  AND target_id = '$E2E_USER_ID'
  AND result = 'SUCCESS';
SQL
)"
[[ "$E2E_AUDIT_COUNT" == "1" ]] || {
    echo "FAIL: ACCOUNT_WITHDRAWN 감사 로그가 정확히 1건이어야 합니다 (actual=$E2E_AUDIT_COUNT)." >&2
    exit 1
}

echo "PASS: 임시 가입 → 두 세션 → 재인증 → 탈퇴 → 전체 세션 만료 → 재로그인 차단 → 익명화 Compose UAT"
