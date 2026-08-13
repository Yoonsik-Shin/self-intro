#!/usr/bin/env bash
set -euo pipefail

E2E_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E_BASE_URL="${E2E_BASE_URL:-http://localhost:8080}"
E2E_FRONTEND_URL="${E2E_FRONTEND_URL:-http://localhost:3000}"
E2E_RUN_KEY="$(date +%s)-$$"
E2E_EMAIL="registration-e2e-$E2E_RUN_KEY@example.invalid"
E2E_CHANGED_EMAIL="registration-e2e-changed-$E2E_RUN_KEY@example.invalid"
E2E_INVITATION_CODE="registration-e2e-invite-$E2E_RUN_KEY"
E2E_PASSWORD="Reg-e2e-${E2E_RUN_KEY:0:16}!Aa1"
E2E_NEW_PASSWORD="Reset-e2e-${E2E_RUN_KEY:0:14}!Bb2"
E2E_NICKNAME="가입 UAT $E2E_RUN_KEY"
E2E_WORKSPACE_NAME="가입 UAT Workspace $E2E_RUN_KEY"
E2E_TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/self-intro-registration-e2e.XXXXXX")"
E2E_COOKIE="$E2E_TMP_DIR/user.cookies"
E2E_VISITOR_COOKIE="$E2E_TMP_DIR/visitor.cookies"
E2E_RESPONSE="$E2E_TMP_DIR/response.json"
E2E_STATUS=""
E2E_WORKSPACE_SLUG=""

if [[ "$E2E_BASE_URL" != http://localhost:* && "$E2E_BASE_URL" != http://127.0.0.1:* ]]; then
    echo "ERROR: 이 스크립트는 로컬 Docker Compose API에서만 실행할 수 있습니다." >&2
    exit 1
fi
if [[ "$E2E_FRONTEND_URL" != http://localhost:* && "$E2E_FRONTEND_URL" != http://127.0.0.1:* ]]; then
    echo "ERROR: 프런트 검증도 로컬 Docker Compose URL에서만 실행할 수 있습니다." >&2
    exit 1
fi

cd "$E2E_ROOT_DIR"

db_exec() {
    docker compose exec -T backend-db sh -lc \
        'mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N'
}

clear_uat_auth_rate_limits() {
    docker compose exec -T redis sh -lc \
        "redis-cli --scan --pattern 'self-intro:auth-rate:*' | xargs -r redis-cli DEL" \
        >/dev/null
}

cleanup() {
    set +e
    db_exec <<SQL >/dev/null 2>&1
DELETE FROM security_audit_event
WHERE actor_user_id IN (
        SELECT id FROM app_user
        WHERE email_canonical IN ('$E2E_EMAIL', '$E2E_CHANGED_EMAIL')
      )
   OR (target_type = 'APP_USER'
       AND CAST(target_id AS UNSIGNED) IN (
           SELECT id FROM app_user
           WHERE email_canonical IN ('$E2E_EMAIL', '$E2E_CHANGED_EMAIL')
       ))
   OR workspace_id IN (SELECT id FROM workspace WHERE slug = '$E2E_WORKSPACE_SLUG');
DELETE FROM workspace WHERE slug = '$E2E_WORKSPACE_SLUG';
DELETE FROM app_user
WHERE email_canonical IN ('$E2E_EMAIL', '$E2E_CHANGED_EMAIL');
DELETE FROM registration_invitation
WHERE code_hash = UNHEX(SHA2('$E2E_INVITATION_CODE', 256));
SQL
    rm -rf "$E2E_TMP_DIR"
}
trap cleanup EXIT INT TERM

# 반복 가능한 로컬 UAT를 위해 이 시나리오가 검증하는 인증 테스트 카운터만 초기화한다.
# 운영 URL에서는 스크립트 자체가 실행을 거부한다.
clear_uat_auth_rate_limits

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
        -H 'User-Agent: Mozilla/5.0 SelfIntroRegistrationOnboardingE2E'
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

wait_for_password_reset_token() {
    local attempt mail_id token
    for attempt in $(seq 1 30); do
        mail_id="$(
            docker compose exec -T mailpit wget -qO- 'http://127.0.0.1:8025/api/v1/messages?limit=100' |
                jq -r --arg email "$E2E_EMAIL" \
                    '.messages[] | select(.Subject == "Self-Intro 비밀번호 재설정" and any(.To[]; .Address == $email)) | .ID' |
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
    echo "FAIL: Mailpit에서 비밀번호 재설정 token을 찾지 못했습니다." >&2
    return 1
}

wait_for_email_change_token() {
    local attempt mail_id token
    for attempt in $(seq 1 30); do
        mail_id="$(
            docker compose exec -T mailpit wget -qO- 'http://127.0.0.1:8025/api/v1/messages?limit=100' |
                jq -r --arg email "$E2E_CHANGED_EMAIL" \
                    '.messages[] | select(.Subject == "Self-Intro 로그인 이메일 변경 확인" and any(.To[]; .Address == $email)) | .ID' |
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
    echo "FAIL: Mailpit에서 로그인 이메일 변경 token을 찾지 못했습니다." >&2
    return 1
}

echo "[1/8] Compose 서비스와 가입 화면 확인"
docker compose ps --status running backend backend-db frontend-next mailpit nginx >/dev/null
wait_for_backend
for frontend_route in signup login onboarding/workspace account/email-change; do
    E2E_FRONTEND_STATUS="$(
        curl -sS -o /dev/null -w '%{http_code}' "$E2E_FRONTEND_URL/$frontend_route"
    )"
    [[ "$E2E_FRONTEND_STATUS" == "200" ]] || {
        echo "FAIL: /$frontend_route 프런트 route (expected=200, actual=$E2E_FRONTEND_STATUS)" >&2
        exit 1
    }
done
echo "PASS: 가입·로그인·첫 Workspace·이메일 변경 프런트 route (각 200)"

echo "[2/8] 개인 초대 fixture와 실제 SMTP 확인 메일"
db_exec <<SQL >/dev/null
INSERT INTO registration_invitation (
    code_hash, label, recipient_email_canonical, expires_at, max_uses, used_count,
    sent_count, status, created_at
) VALUES (
    UNHEX(SHA2('$E2E_INVITATION_CODE', 256)), 'Compose 가입 UAT', '$E2E_EMAIL',
    DATE_ADD(NOW(6), INTERVAL 2 DAY), 1, 0, 0, 'ACTIVE', NOW(6)
);
SQL
curl -sS -o /dev/null -c "$E2E_COOKIE" "$E2E_BASE_URL/api/auth/csrf"
request "$E2E_COOKIE" POST /api/auth/registrations \
    "$(jq -cn \
        --arg invitationCode "$E2E_INVITATION_CODE" \
        --arg email "$E2E_EMAIL" \
        --arg password "$E2E_PASSWORD" \
        --arg nickname "$E2E_NICKNAME" \
        '{invitationCode:$invitationCode,email:$email,password:$password,nickname:$nickname,termsAccepted:true,privacyAccepted:true,marketingAccepted:false}')"
assert_status 202 "초대 기반 가입 요청"
E2E_ACCOUNT_STATE="$(db_exec <<SQL
SELECT CONCAT(status, '|', email_verified_at IS NULL)
FROM app_user
WHERE email_canonical = '$E2E_EMAIL';
SQL
)"
[[ "$E2E_ACCOUNT_STATE" == "PENDING_VERIFICATION|1" ]] || {
    echo "FAIL: 가입 직후 계정이 PENDING_VERIFICATION이어야 합니다." >&2
    exit 1
}
E2E_VERIFICATION_TOKEN="$(wait_for_verification_token)"
echo "PASS: Mailpit 가입 확인 메일과 fragment token"

echo "[3/8] 확인 전 로그인 차단과 단일 사용 이메일 확인"
request "$E2E_COOKIE" POST /api/auth/login \
    "$(jq -cn --arg username "$E2E_EMAIL" --arg password "$E2E_PASSWORD" \
        '{username:$username,password:$password}')"
assert_status 401 "이메일 확인 전 로그인 차단"
request "$E2E_COOKIE" POST /api/auth/email-verifications \
    "$(jq -cn --arg token "$E2E_VERIFICATION_TOKEN" '{token:$token}')"
assert_status 204 "이메일 확인 완료"
request "$E2E_COOKIE" POST /api/auth/email-verifications \
    "$(jq -cn --arg token "$E2E_VERIFICATION_TOKEN" '{token:$token}')"
assert_status 400 "확인 token 재사용 차단"
unset E2E_VERIFICATION_TOKEN

echo "[4/8] 일반 사용자 로그인과 첫 비공개 Workspace 생성"
request "$E2E_COOKIE" POST /api/auth/login \
    "$(jq -cn --arg username "$E2E_EMAIL" --arg password "$E2E_PASSWORD" \
        '{username:$username,password:$password}')"
assert_status 200 "확인된 일반 사용자 로그인"
jq -e '.authenticated == true and .mfaRequired == false' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE" GET /api/auth/me
assert_status 200 "가입 계정 세션 조회"
jq -e '.platformRoles == [] and .workspaces == []' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE" POST /api/workspaces/onboarding \
    "$(jq -cn --arg name "$E2E_WORKSPACE_NAME" '{name:$name}')"
assert_status 200 "첫 Workspace 생성"
E2E_WORKSPACE_SLUG="$(jq -r '.slug' "$E2E_RESPONSE")"
[[ "$E2E_WORKSPACE_SLUG" =~ ^w-[0-9a-f]{20}$ ]] || {
    echo "FAIL: 첫 Workspace slug 형식이 올바르지 않습니다." >&2
    exit 1
}
jq -e '.publicationStatus == "PRIVATE" and (.publicKey | length > 0)' "$E2E_RESPONSE" >/dev/null
request "$E2E_VISITOR_COOKIE" GET "/api/bff/workspaces/$E2E_WORKSPACE_SLUG/introduction?channel=WEB"
assert_status 404 "첫 발행 전 공개 접근 차단"

echo "[5/8] 원본 Profile과 공개 구성 초안 분리"
request "$E2E_COOKIE" PUT "/api/workspaces/$E2E_WORKSPACE_SLUG/profile" \
    "$(jq -cn --arg marker "$E2E_RUN_KEY" '{
        name:("가입 UAT " + $marker),
        nameEn:("Registration UAT " + $marker),
        jobTitle:"Backend Engineer",
        bio:("registration onboarding compose uat " + $marker),
        coreStackSummary:"Java / Spring",
        statusBadgeText:"LOCAL UAT",
        githubUrl:"https://github.com/example",
        email:"",
        phone:"",
        publicEmail:false,
        publicPhone:false
    }')"
assert_status 200 "신규 Workspace Profile 저장"
request "$E2E_COOKIE" GET "/api/workspaces/$E2E_WORKSPACE_SLUG/print-templates/manage/source"
assert_status 200 "첫 발행 전 비공개 출력 원본 조회"
jq -e --arg marker "$E2E_RUN_KEY" '.profile.bio == ("registration onboarding compose uat " + $marker)' "$E2E_RESPONSE" >/dev/null
request "$E2E_VISITOR_COOKIE" GET "/api/workspaces/$E2E_WORKSPACE_SLUG/print-templates/manage/source"
assert_status 401 "비로그인 출력 원본 접근 차단"
E2E_ADMIN_PRINT_STATUS="$(curl -sS -b "$E2E_COOKIE" -o /dev/null -w '%{http_code}' "$E2E_FRONTEND_URL/workspace/$E2E_WORKSPACE_SLUG/print?admin=1")"
[[ "$E2E_ADMIN_PRINT_STATUS" == "200" ]] || {
    echo "FAIL: 첫 발행 전 관리자 출력 route (expected=200, actual=$E2E_ADMIN_PRINT_STATUS)" >&2
    exit 1
}
echo "PASS: 첫 발행 전 관리자 출력 route (200)"

E2E_TEMPLATE_PAYLOAD='{"name":"가입 UAT 출력 구성","excludedIds":"[]","sectionOrder":"[]","sectionGaps":"{}","targetRole":"GENERAL","contentOverrides":"{}","baseContentFingerprint":null,"schemaVersion":2,"visible":false,"displayOrder":0,"jobPostingId":null,"lineHeight":1.625}'
request "$E2E_COOKIE" POST "/api/workspaces/$E2E_WORKSPACE_SLUG/print-templates/manage" "$E2E_TEMPLATE_PAYLOAD"
assert_status 200 "출력 구성 생성"
E2E_TEMPLATE_ID="$(jq -r '.id' "$E2E_RESPONSE")"
request "$E2E_COOKIE" GET "/api/workspaces/$E2E_WORKSPACE_SLUG/print-templates/manage/$E2E_TEMPLATE_ID/revisions"
assert_status 200 "출력 구성 첫 snapshot revision 조회"
E2E_TEMPLATE_REVISION_ID="$(jq -r 'map(select(.senderType == "SNAPSHOT"))[0].id // empty' "$E2E_RESPONSE")"
[[ -n "$E2E_TEMPLATE_REVISION_ID" ]] || {
    echo "FAIL: 출력 구성 생성 revision이 없습니다." >&2
    exit 1
}
request "$E2E_COOKIE" PUT "/api/workspaces/$E2E_WORKSPACE_SLUG/print-templates/manage/$E2E_TEMPLATE_ID" \
    "${E2E_TEMPLATE_PAYLOAD/\"excludedIds\":\"[]\"/\"excludedIds\":\"[\\\"section:skills\\\"]\"}"
assert_status 200 "출력 구성 수정"
request "$E2E_COOKIE" POST "/api/workspaces/$E2E_WORKSPACE_SLUG/print-templates/manage/$E2E_TEMPLATE_ID/revisions/$E2E_TEMPLATE_REVISION_ID/rollback"
assert_status 200 "출력 구성 snapshot rollback"
jq -e '.excludedIds == "[]"' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE" GET "/api/workspaces/$E2E_WORKSPACE_SLUG/taxonomy-schemes"
assert_status 200 "기본 taxonomy scheme 구독 조회"
jq -e 'length >= 1 and any(.[]; .subscribed == true and .primaryScheme == true)' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE" GET "/api/workspaces/$E2E_WORKSPACE_SLUG/public-page/draft/profile"
assert_status 200 "Profile 공개 구성 초안 조회"
jq -e '.showName == true and .showEmail == false and .showPhone == false' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE" PUT "/api/workspaces/$E2E_WORKSPACE_SLUG/public-page/draft/profile" \
    '{"showName":true,"showNameEn":true,"showJobTitle":true,"showBio":true,"showCoreStackSummary":true,"showStatusBadge":true,"showGithub":true,"showEmail":false,"showPhone":false,"skills":[],"competencies":[]}'
assert_status 200 "Profile 공개 구성 초안 저장"

echo "[6/8] schema v3 첫 발행·category revision·공개 snapshot"
request "$E2E_COOKIE" POST "/api/workspaces/$E2E_WORKSPACE_SLUG/publication/manage/publish"
assert_status 200 "신규 Workspace 첫 공개 발행"
jq -e '.publicationStatus == "PUBLISHED" and .revisionNumber == 1' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE" GET "/api/workspaces/$E2E_WORKSPACE_SLUG/publication/manage/revisions"
assert_status 200 "schema v3 category revision 조회"
jq -e '.revisions[0] | .revisionNumber == 1 and .schemaVersion == 3 and .profileRevisionId != null and .experienceRevisionId != null and .draftConfigVersion == 1' "$E2E_RESPONSE" >/dev/null
request "$E2E_VISITOR_COOKIE" GET "/api/bff/workspaces/$E2E_WORKSPACE_SLUG/introduction?channel=WEB"
assert_status 200 "비로그인 공개 snapshot 조회"
jq -e --arg marker "$E2E_RUN_KEY" '.profile.bio == ("registration onboarding compose uat " + $marker)' "$E2E_RESPONSE" >/dev/null
E2E_PUBLIC_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' "$E2E_FRONTEND_URL/workspace/$E2E_WORKSPACE_SLUG")"
[[ "$E2E_PUBLIC_STATUS" == "200" ]] || {
    echo "FAIL: 신규 Workspace 공개 프런트 route (expected=200, actual=$E2E_PUBLIC_STATUS)" >&2
    exit 1
}
echo "PASS: 신규 Workspace 공개 프런트 route (200)"

echo "[7/8] 비밀번호 재설정·세션 폐기·단일 사용 token"
request "$E2E_VISITOR_COOKIE" POST /api/auth/password-resets \
    "$(jq -cn --arg email "missing-$E2E_EMAIL" '{email:$email}')"
assert_status 202 "미등록 이메일 재설정 요청의 계정 비노출 응답"
request "$E2E_COOKIE" POST /api/auth/password-resets \
    "$(jq -cn --arg email "$E2E_EMAIL" '{email:$email}')"
assert_status 202 "등록 계정 비밀번호 재설정 요청"
E2E_PASSWORD_RESET_TOKEN="$(wait_for_password_reset_token)"
E2E_PASSWORD_RESET_DB_STATE="$(db_exec <<SQL
SELECT CONCAT(
    COUNT(*), '|',
    SUM(token_hash = UNHEX(SHA2('$E2E_PASSWORD_RESET_TOKEN', 256))), '|',
    SUM(HEX(token_hash) = HEX('$E2E_PASSWORD_RESET_TOKEN'))
)
FROM password_reset_token
WHERE user_id = (SELECT id FROM app_user WHERE email_canonical = '$E2E_EMAIL');
SQL
)"
[[ "$E2E_PASSWORD_RESET_DB_STATE" == "1|1|0" ]] || {
    echo "FAIL: 재설정 token은 SHA-256 hash 한 건으로만 저장되어야 합니다. (actual=$E2E_PASSWORD_RESET_DB_STATE)" >&2
    exit 1
}
echo "PASS: 비밀번호 재설정 token hash-only 저장"
request "$E2E_COOKIE" POST /api/auth/password-resets/confirm \
    "$(jq -cn --arg token "$E2E_PASSWORD_RESET_TOKEN" --arg newPassword "$E2E_NEW_PASSWORD" \
        '{token:$token,newPassword:$newPassword}')"
assert_status 204 "새 비밀번호 확정"
request "$E2E_COOKIE" GET /api/auth/me
assert_status 401 "비밀번호 변경 뒤 기존 세션 폐기"
request "$E2E_COOKIE" POST /api/auth/login \
    "$(jq -cn --arg username "$E2E_EMAIL" --arg password "$E2E_PASSWORD" \
        '{username:$username,password:$password}')"
assert_status 401 "이전 비밀번호 로그인 차단"
request "$E2E_COOKIE" POST /api/auth/login \
    "$(jq -cn --arg username "$E2E_EMAIL" --arg password "$E2E_NEW_PASSWORD" \
        '{username:$username,password:$password}')"
assert_status 200 "새 비밀번호 로그인"
request "$E2E_COOKIE" POST /api/auth/password-resets/confirm \
    "$(jq -cn --arg token "$E2E_PASSWORD_RESET_TOKEN" --arg newPassword "$E2E_PASSWORD" \
        '{token:$token,newPassword:$newPassword}')"
assert_status 400 "비밀번호 재설정 token 재사용 차단"
E2E_PASSWORD_RESET_AUDIT_COUNT="$(db_exec <<SQL
SELECT COUNT(*)
FROM security_audit_event
WHERE actor_user_id IS NULL
  AND target_type = 'APP_USER'
  AND CAST(target_id AS UNSIGNED) =
      (SELECT id FROM app_user WHERE email_canonical = '$E2E_EMAIL')
  AND event_type IN ('PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED');
SQL
)"
[[ "$E2E_PASSWORD_RESET_AUDIT_COUNT" == "2" ]] || {
    echo "FAIL: 비밀번호 재설정 요청·완료 감사 이벤트가 필요합니다. (actual=$E2E_PASSWORD_RESET_AUDIT_COUNT)" >&2
    exit 1
}
unset E2E_PASSWORD_RESET_TOKEN
echo "PASS: 비밀번호 재설정 요청·완료 감사 이벤트"

echo "[8/8] 로그인 이메일 2단계 변경·세션 폐기·단일 사용 token"
curl -sS -o /dev/null -b "$E2E_COOKIE" -c "$E2E_COOKIE" \
    "$E2E_BASE_URL/api/auth/csrf"
request "$E2E_COOKIE" POST /api/account/email-change \
    "$(jq -cn --arg currentPassword "$E2E_NEW_PASSWORD" --arg newEmail "$E2E_CHANGED_EMAIL" \
        '{currentPassword:$currentPassword,newEmail:$newEmail}')"
assert_status 202 "로그인 이메일 변경 요청"
E2E_EMAIL_CHANGE_TOKEN="$(wait_for_email_change_token)"
E2E_EMAIL_CHANGE_DB_STATE="$(db_exec <<SQL
SELECT CONCAT(
    COUNT(*), '|',
    SUM(token_hash = UNHEX(SHA2('$E2E_EMAIL_CHANGE_TOKEN', 256))), '|',
    SUM(HEX(token_hash) = HEX('$E2E_EMAIL_CHANGE_TOKEN'))
)
FROM email_change_token
WHERE user_id = (SELECT id FROM app_user WHERE email_canonical = '$E2E_EMAIL');
SQL
)"
[[ "$E2E_EMAIL_CHANGE_DB_STATE" == "1|1|0" ]] || {
    echo "FAIL: 이메일 변경 token은 SHA-256 hash 한 건으로만 저장되어야 합니다. (actual=$E2E_EMAIL_CHANGE_DB_STATE)" >&2
    exit 1
}
echo "PASS: 로그인 이메일 변경 token hash-only 저장"

clear_uat_auth_rate_limits
request "$E2E_VISITOR_COOKIE" POST /api/auth/login \
    "$(jq -cn --arg username "$E2E_EMAIL" --arg password "$E2E_NEW_PASSWORD" \
        '{username:$username,password:$password}')"
assert_status 200 "확정 전 기존 이메일 로그인 유지"
curl -sS -o /dev/null -b "$E2E_VISITOR_COOKIE" -c "$E2E_VISITOR_COOKIE" \
    "$E2E_BASE_URL/api/auth/csrf"
request "$E2E_VISITOR_COOKIE" POST /api/account/email-change/confirm \
    "$(jq -cn --arg token "$E2E_EMAIL_CHANGE_TOKEN" '{token:$token}')"
assert_status 200 "새 로그인 이메일 확정"
jq -e --arg email "$E2E_CHANGED_EMAIL" '.email == $email' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE" GET /api/auth/me
assert_status 401 "이메일 변경 뒤 기존 요청 세션 폐기"
request "$E2E_VISITOR_COOKIE" GET /api/auth/me
assert_status 401 "이메일 변경 뒤 별도 로그인 세션 폐기"

clear_uat_auth_rate_limits
request "$E2E_COOKIE" POST /api/auth/login \
    "$(jq -cn --arg username "$E2E_EMAIL" --arg password "$E2E_NEW_PASSWORD" \
        '{username:$username,password:$password}')"
assert_status 401 "이메일 변경 뒤 이전 주소 로그인 차단"
request "$E2E_COOKIE" POST /api/auth/login \
    "$(jq -cn --arg username "$E2E_CHANGED_EMAIL" --arg password "$E2E_NEW_PASSWORD" \
        '{username:$username,password:$password}')"
assert_status 200 "변경된 이메일 로그인"
request "$E2E_COOKIE" POST /api/account/email-change/confirm \
    "$(jq -cn --arg token "$E2E_EMAIL_CHANGE_TOKEN" '{token:$token}')"
assert_status 400 "로그인 이메일 변경 token 재사용 차단"
E2E_EMAIL_CHANGE_AUDIT_COUNT="$(db_exec <<SQL
SELECT COUNT(*)
FROM security_audit_event
WHERE target_type = 'APP_USER'
  AND CAST(target_id AS UNSIGNED) =
      (SELECT id FROM app_user WHERE email_canonical = '$E2E_CHANGED_EMAIL')
  AND event_type IN ('ACCOUNT_EMAIL_CHANGE_REQUESTED', 'ACCOUNT_EMAIL_CHANGED');
SQL
)"
[[ "$E2E_EMAIL_CHANGE_AUDIT_COUNT" == "2" ]] || {
    echo "FAIL: 이메일 변경 요청·완료 감사 이벤트가 필요합니다. (actual=$E2E_EMAIL_CHANGE_AUDIT_COUNT)" >&2
    exit 1
}
unset E2E_EMAIL_CHANGE_TOKEN
echo "PASS: 로그인 이메일 변경 요청·완료 감사 이벤트"

echo "PASS: 초대 가입 → SMTP 확인 → 로그인 → 비공개 Workspace → 공개 구성 → schema v3 첫 발행 → 비밀번호 재설정 → 로그인 이메일 변경 Compose UAT"
