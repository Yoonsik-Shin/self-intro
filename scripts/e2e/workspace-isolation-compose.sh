#!/usr/bin/env bash
set -euo pipefail

E2E_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E_BASE_URL="${E2E_BASE_URL:-http://localhost:8080}"
E2E_FRONTEND_URL="${E2E_FRONTEND_URL:-http://localhost:3000}"
E2E_RUN_ID="$(date +%s)-$$"
E2E_RUN_KEY="$(printf '%s' "$E2E_RUN_ID" | tr -cd '0-9')"
E2E_USER_A="e2e-user-a-$E2E_RUN_KEY"
E2E_USER_B="e2e-user-b-$E2E_RUN_KEY"
E2E_EMAIL_A="$E2E_USER_A@example.invalid"
E2E_EMAIL_B="$E2E_USER_B@example.invalid"
E2E_SLUG_A="e2e-a-$E2E_RUN_KEY"
E2E_SLUG_A_NEW="e2e-a-public-$E2E_RUN_KEY"
E2E_SLUG_B="e2e-b-$E2E_RUN_KEY"
E2E_JOB_POSTING_URL="https://example.invalid/e2e-job-posting-$E2E_RUN_KEY"
E2E_TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/self-intro-e2e.XXXXXX")"
E2E_COOKIE_A="$E2E_TMP_DIR/user-a.cookies"
E2E_COOKIE_B="$E2E_TMP_DIR/user-b.cookies"
E2E_VISITOR_A="$E2E_TMP_DIR/visitor-a.cookies"
E2E_VISITOR_B="$E2E_TMP_DIR/visitor-b.cookies"
E2E_RESPONSE="$E2E_TMP_DIR/response.json"
E2E_STATUS=""

if [[ "$E2E_BASE_URL" != http://localhost:* && "$E2E_BASE_URL" != http://127.0.0.1:* ]]; then
    echo "ERROR: 이 스크립트는 로컬 Docker Compose URL에서만 실행할 수 있습니다." >&2
    exit 1
fi
if [[ "$E2E_FRONTEND_URL" != http://localhost:* && "$E2E_FRONTEND_URL" != http://127.0.0.1:* ]]; then
    echo "ERROR: 프런트 redirect 검증도 로컬 Docker Compose URL에서만 실행할 수 있습니다." >&2
    exit 1
fi

cd "$E2E_ROOT_DIR"

if [[ -z "${E2E_PASSWORD:-}" && -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
    E2E_PASSWORD="${ADMIN_PASSWORD:-}"
fi
if [[ -z "${E2E_PASSWORD:-}" ]]; then
    echo "ERROR: E2E_PASSWORD 또는 .env의 ADMIN_PASSWORD가 필요합니다." >&2
    exit 1
fi

db_exec() {
    docker compose exec -T backend-db sh -lc \
        'mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N'
}

vector_db_scalar() {
    local query="$1"
    docker compose exec -T oracle-vector-db bash -lc \
        'printf "SET HEADING OFF FEEDBACK OFF PAGESIZE 0 VERIFY OFF ECHO OFF\n%s\nEXIT;\n" "$1" | sqlplus -s "self_intro_vector/self_intro_vector_local@//localhost:1521/FREEPDB1"' \
        _ "$query" | tr -d '[:space:]'
}

delete_fixture_vectors() {
    local workspace_id="$1"
    [[ "$workspace_id" =~ ^[1-9][0-9]*$ ]] || return 0
    docker compose exec -T oracle-vector-db bash -lc \
        'printf "SET HEADING OFF FEEDBACK OFF VERIFY OFF ECHO OFF\nDELETE FROM experience_vector WHERE workspace_id = %s;\nDELETE FROM study_vector WHERE workspace_id = %s;\nCOMMIT;\nEXIT;\n" "$1" "$1" | sqlplus -s "self_intro_vector/self_intro_vector_local@//localhost:1521/FREEPDB1"' \
        _ "$workspace_id" >/dev/null 2>&1
}

wait_for_fixture_vectors_removed() {
    local workspace_id="$1"
    local attempt count
    [[ "$workspace_id" =~ ^[1-9][0-9]*$ ]] || {
        echo "FAIL: Vector cleanup Workspace ID가 올바르지 않습니다." >&2
        return 1
    }
    for attempt in $(seq 1 30); do
        count="$(vector_db_scalar \
            "SELECT (SELECT COUNT(*) FROM experience_vector WHERE workspace_id = $workspace_id) + (SELECT COUNT(*) FROM study_vector WHERE workspace_id = $workspace_id) FROM dual;")"
        if [[ "$count" == "0" ]]; then
            echo "PASS: E2E Workspace Vector 비동기 삭제 완료"
            return 0
        fi
        sleep 1
    done
    echo "FAIL: E2E Workspace Vector가 30초 안에 삭제되지 않았습니다." >&2
    return 1
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
    docker compose ps backend >&2 || true
    return 1
}

cleanup() {
    set +e
    local cleanup_workspace_ids
    cleanup_workspace_ids="$(db_exec <<SQL 2>/dev/null
SELECT id FROM workspace WHERE slug IN ('$E2E_SLUG_A', '$E2E_SLUG_A_NEW', '$E2E_SLUG_B');
SQL
)"
    while IFS= read -r workspace_id; do
        delete_fixture_vectors "$workspace_id"
    done <<<"$cleanup_workspace_ids"
    db_exec <<SQL >/dev/null 2>&1
DELETE FROM security_audit_event
WHERE actor_user_id IN (
    SELECT id FROM app_user WHERE login_id IN ('$E2E_USER_A', '$E2E_USER_B')
)
OR workspace_id IN (
    SELECT id FROM workspace WHERE slug IN ('$E2E_SLUG_A', '$E2E_SLUG_A_NEW', '$E2E_SLUG_B')
);
DELETE FROM workspace_membership_invitation
WHERE workspace_id IN (
    SELECT id FROM workspace WHERE slug IN ('$E2E_SLUG_A', '$E2E_SLUG_A_NEW', '$E2E_SLUG_B')
);
DELETE FROM workspace_purge_checkpoint
WHERE purge_job_id IN (
    SELECT id FROM workspace_purge_job
    WHERE workspace_id IN (
        SELECT id FROM workspace WHERE slug IN ('$E2E_SLUG_A', '$E2E_SLUG_A_NEW', '$E2E_SLUG_B')
    )
);
DELETE FROM workspace_purge_job
WHERE workspace_id IN (
    SELECT id FROM workspace WHERE slug IN ('$E2E_SLUG_A', '$E2E_SLUG_A_NEW', '$E2E_SLUG_B')
);
DELETE FROM workspace WHERE slug IN ('$E2E_SLUG_A', '$E2E_SLUG_A_NEW', '$E2E_SLUG_B');
DELETE FROM job_posting
WHERE scope_key = 'PLATFORM' AND posting_url = '$E2E_JOB_POSTING_URL';
DELETE FROM app_user WHERE login_id IN ('$E2E_USER_A', '$E2E_USER_B');
SQL
    rm -rf "$E2E_TMP_DIR"
}
trap cleanup EXIT INT TERM

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

csrf_token() {
    local cookie_jar="$1"
    if [[ ! -f "$cookie_jar" ]]; then
        return 0
    fi
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
        -H 'User-Agent: Mozilla/5.0 SelfIntroWorkspaceIsolationE2E'
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

login() {
    local cookie_jar="$1"
    local login_id="$2"
    curl -sS -o /dev/null -c "$cookie_jar" "$E2E_BASE_URL/api/auth/csrf"
    request \
        "$cookie_jar" \
        POST \
        /api/auth/login \
        "$(jq -cn --arg username "$login_id" --arg password "$E2E_PASSWORD" \
            '{username:$username,password:$password}')"
    assert_status 200 "$login_id 실제 세션 로그인"
}

profile_payload() {
    local marker="$1"
    jq -cn --arg marker "$marker" '{
        name:("Profile " + $marker),
        nameEn:("Profile " + $marker),
        jobTitle:"Backend Engineer",
        bio:("private profile " + $marker),
        coreStackSummary:"Java / Spring",
        statusBadgeText:"E2E",
        githubUrl:"https://github.com/example",
        email:"",
        phone:"",
        publicEmail:false,
        publicPhone:false
    }'
}

study_payload() {
    local title="$1"
    jq -cn --arg title "$title" '{
        slug:"same-e2e-slug",
        title:$title,
        summary:"workspace isolated summary",
        contentMarkdown:"workspace isolated content",
        status:"DRAFT",
        section:"ETC",
        taxonomyNodeIds:[],
        tagNames:[],
        skillIds:[],
        experienceIds:[],
        experienceDetailIds:[],
        relatedStudies:[],
        images:[],
        learnedAt:"2026-08-11",
        publishedAt:null
    }'
}

experience_payload() {
    local title="$1"
    local slug="$2"
    jq -cn --arg title "$title" --arg slug "$slug" '{
        type:"PROJECT",
        title:$title,
        periodStart:"2026-08-11",
        summary:"workspace isolated project",
        takeaway:"",
        displayOrder:0,
        details:[],
        skillIds:[],
        tagNames:[],
        images:[],
        showOnTimeline:true,
        timelineLabel:"",
        slug:$slug,
        role:"Developer",
        contributionRate:100,
        repositoryUrl:""
    }'
}

workspace_skill_payload() {
    local name="$1"
    local comment="$2"
    jq -cn --arg name "$name" --arg comment "$comment" '{
        name:$name,
        category:"E2E",
        skillLevel:"ADVANCED",
        skillVersion:"",
        comment:$comment,
        usageType:"WORK_EXPERIENCE",
        badgeKey:"",
        badgeColor:"",
        isCore:true,
        displayOrder:0
    }'
}

competency_payload() {
    local title="$1"
    local skill_id="$2"
    jq -cn --arg title "$title" --argjson skillId "$skill_id" '{
        title:$title,
        summary:"Workspace overlay isolation competency",
        displayOrder:0,
        visible:true,
        skillIds:[$skillId],
        evidences:[],
        studyIds:[]
    }'
}

job_application_payload() {
    local memo="$1"
    jq -cn --arg memo "$memo" '{
        status:"SAVED",
        appliedAt:null,
        memo:$memo,
        interestLevel:3,
        matchScore:null,
        matchReason:""
    }'
}

echo "[1/9] Compose와 V210~V219 확인"
docker compose ps --status running backend backend-db nginx >/dev/null
wait_for_backend
V210_SUCCESS="$(db_exec <<'SQL'
SELECT success FROM flyway_schema_history WHERE version = '210';
SQL
)"
[[ "$V210_SUCCESS" == "1" ]] || { echo "FAIL: V210 migration이 적용되지 않았습니다." >&2; exit 1; }
echo "PASS: V210 migration"
V211_SUCCESS="$(db_exec <<'SQL'
SELECT success FROM flyway_schema_history WHERE version = '211';
SQL
)"
[[ "$V211_SUCCESS" == "1" ]] || { echo "FAIL: V211 migration이 적용되지 않았습니다." >&2; exit 1; }
echo "PASS: V211 migration"
V212_SUCCESS="$(db_exec <<'SQL'
SELECT success FROM flyway_schema_history WHERE version = '212';
SQL
)"
[[ "$V212_SUCCESS" == "1" ]] || { echo "FAIL: V212 migration이 적용되지 않았습니다." >&2; exit 1; }
echo "PASS: V212 migration"
V213_SUCCESS="$(db_exec <<'SQL'
SELECT success FROM flyway_schema_history WHERE version = '213';
SQL
)"
[[ "$V213_SUCCESS" == "1" ]] || { echo "FAIL: V213 migration이 적용되지 않았습니다." >&2; exit 1; }
echo "PASS: V213 migration"
V214_SUCCESS="$(db_exec <<'SQL'
SELECT success FROM flyway_schema_history WHERE version = '214';
SQL
)"
[[ "$V214_SUCCESS" == "1" ]] || { echo "FAIL: V214 migration이 적용되지 않았습니다." >&2; exit 1; }
echo "PASS: V214 migration"
V215_SUCCESS="$(db_exec <<'SQL'
SELECT success FROM flyway_schema_history WHERE version = '215';
SQL
)"
[[ "$V215_SUCCESS" == "1" ]] || { echo "FAIL: V215 migration이 적용되지 않았습니다." >&2; exit 1; }
echo "PASS: V215 migration"
V216_SUCCESS="$(db_exec <<'SQL'
SELECT success FROM flyway_schema_history WHERE version = '216';
SQL
)"
[[ "$V216_SUCCESS" == "1" ]] || { echo "FAIL: V216 migration이 적용되지 않았습니다." >&2; exit 1; }
echo "PASS: V216 migration"
V217_SUCCESS="$(db_exec <<'SQL'
SELECT success FROM flyway_schema_history WHERE version = '217';
SQL
)"
[[ "$V217_SUCCESS" == "1" ]] || { echo "FAIL: V217 migration이 적용되지 않았습니다." >&2; exit 1; }
echo "PASS: V217 migration"
V218_SUCCESS="$(db_exec <<'SQL'
SELECT success FROM flyway_schema_history WHERE version = '218';
SQL
)"
[[ "$V218_SUCCESS" == "1" ]] || { echo "FAIL: V218 migration이 적용되지 않았습니다." >&2; exit 1; }
echo "PASS: V218 migration"
V219_SUCCESS="$(db_exec <<'SQL'
SELECT success FROM flyway_schema_history WHERE version = '219';
SQL
)"
[[ "$V219_SUCCESS" == "1" ]] || { echo "FAIL: V219 migration이 적용되지 않았습니다." >&2; exit 1; }
echo "PASS: V219 migration"

echo "[2/9] 임시 일반 사용자 두 명과 비공개 Workspace 두 개 생성"
db_exec <<SQL >/dev/null
SET @test_password_hash = (
    SELECT user.password_hash
    FROM app_user user
    JOIN user_platform_role role ON role.user_id = user.id
    WHERE role.platform_role = 'PLATFORM_OWNER'
    ORDER BY user.id
    LIMIT 1
);
INSERT INTO app_user (
    login_id, email, email_canonical, email_verified_at, password_hash, display_name,
    status, mfa_enabled, mfa_secret_ciphertext, created_at, updated_at
)
SELECT '$E2E_USER_A', '$E2E_EMAIL_A', '$E2E_EMAIL_A', NOW(6), @test_password_hash,
       'E2E User A', 'ACTIVE', FALSE, NULL, NOW(6), NOW(6)
WHERE @test_password_hash IS NOT NULL;
INSERT INTO app_user (
    login_id, email, email_canonical, email_verified_at, password_hash, display_name,
    status, mfa_enabled, mfa_secret_ciphertext, created_at, updated_at
)
SELECT '$E2E_USER_B', '$E2E_EMAIL_B', '$E2E_EMAIL_B', NOW(6), @test_password_hash,
       'E2E User B', 'ACTIVE', FALSE, NULL, NOW(6), NOW(6)
WHERE @test_password_hash IS NOT NULL;
INSERT INTO workspace (
    public_key, name, slug, workspace_type, status, publication_status, created_at, updated_at
) VALUES
    (UUID_TO_BIN(UUID()), 'E2E Workspace A', '$E2E_SLUG_A', 'PERSONAL', 'ACTIVE', 'PRIVATE', NOW(6), NOW(6)),
    (UUID_TO_BIN(UUID()), 'E2E Workspace B', '$E2E_SLUG_B', 'PERSONAL', 'ACTIVE', 'PRIVATE', NOW(6), NOW(6));
INSERT INTO workspace_member (
    workspace_id, user_id, workspace_role, status, active_owner_workspace_id, joined_at
)
SELECT workspace.id, user.id, 'OWNER', 'ACTIVE', workspace.id, NOW(6)
FROM workspace
JOIN app_user user ON user.login_id = '$E2E_USER_A'
WHERE workspace.slug = '$E2E_SLUG_A';
INSERT INTO workspace_member (
    workspace_id, user_id, workspace_role, status, active_owner_workspace_id, joined_at
)
SELECT workspace.id, user.id, 'OWNER', 'ACTIVE', workspace.id, NOW(6)
FROM workspace
JOIN app_user user ON user.login_id = '$E2E_USER_B'
WHERE workspace.slug = '$E2E_SLUG_B';
INSERT INTO job_posting (
    owner_workspace_id, scope_key, company_name, company_name_normalized,
    position_title, position_title_normalized, posting_url, collection_method, source,
    status, deadline_time, is_always_open, permission_basis, permission_review_status,
    permission_evidence_reference, permission_grantor_name, permission_grantor_authority,
    permission_scope_note, permission_reviewed_by_user_id, permission_reviewed_at,
    status_changed_at, created_at, updated_at
)
SELECT
    NULL, 'PLATFORM', 'E2E Shared Catalog Company', 'e2e shared catalog company',
    'E2E Backend Engineer', 'e2e backend engineer', '$E2E_JOB_POSTING_URL',
    'MANUAL', 'E2E', 'NEW', '23:59:59', FALSE,
    'EMPLOYER_DIRECT_SUBMISSION', 'APPROVED',
    'E2E fixture permission evidence', 'E2E Shared Catalog Company',
    'E2E fixture hiring authority', 'E2E 실행 중 Workspace 공통 카탈로그 검증에 한해 허용',
    user.id, NOW(6), NOW(6), NOW(6), NOW(6)
FROM app_user user
JOIN user_platform_role role ON role.user_id = user.id
WHERE role.platform_role = 'PLATFORM_OWNER'
ORDER BY user.id
LIMIT 1;
SQL
FIXTURE_COUNT="$(db_exec <<SQL
SELECT COUNT(*)
FROM workspace_member member
JOIN workspace ON workspace.id = member.workspace_id
JOIN app_user user ON user.id = member.user_id
WHERE (workspace.slug = '$E2E_SLUG_A' AND user.login_id = '$E2E_USER_A')
   OR (workspace.slug = '$E2E_SLUG_B' AND user.login_id = '$E2E_USER_B');
SQL
)"
[[ "$FIXTURE_COUNT" == "2" ]] || { echo "FAIL: E2E fixture 생성 실패" >&2; exit 1; }
echo "PASS: 사용자·Workspace·OWNER Membership 2세트"

echo "[3/9] 실제 세션·CSRF 로그인"
login "$E2E_COOKIE_A" "$E2E_USER_A"
login "$E2E_COOKIE_B" "$E2E_USER_B"

echo "[4/9] Profile 교차 Workspace 차단"
request "$E2E_COOKIE_A" PUT "/api/workspaces/$E2E_SLUG_A/profile" "$(profile_payload A)"
assert_status 200 "A Profile 저장"
request "$E2E_COOKIE_B" PUT "/api/workspaces/$E2E_SLUG_B/profile" "$(profile_payload B)"
assert_status 200 "B Profile 저장"
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_A/profile"
assert_status 404 "B가 A Profile 존재를 확인하지 못함"
request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/profile"
assert_status 200 "A가 자기 Profile 조회"
jq -e '.bio == "private profile A"' "$E2E_RESPONSE" >/dev/null

echo "[5/9] 공개 snapshot 발행·초안 격리·재발행·롤백·slug alias"
request "$E2E_VISITOR_A" GET "/api/bff/workspaces/$E2E_SLUG_A/introduction?channel=WEB"
assert_status 404 "첫 발행 전 공개 페이지 차단"
request "$E2E_COOKIE_A" POST "/api/workspaces/$E2E_SLUG_A/publication/manage/publish"
assert_status 200 "A 첫 공개 snapshot 발행"
jq -e '.publicationStatus == "PUBLISHED" and .revisionNumber == 1' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_B/publication/manage/publish"
assert_status 200 "B 첫 공개 snapshot 발행"
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_A/publication/manage"
assert_status 404 "B가 A 발행 상태를 조회하지 못함"
request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_A/publication/manage/publish"
assert_status 404 "B가 A 공개 snapshot을 발행하지 못함"
request "$E2E_VISITOR_A" GET "/api/bff/workspaces/$E2E_SLUG_A/introduction?channel=WEB"
assert_status 200 "A 공개 snapshot 조회"
jq -e '.profile.bio == "private profile A"' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_A" PUT "/api/workspaces/$E2E_SLUG_A/profile" "$(profile_payload A-DRAFT)"
assert_status 200 "A Profile 초안 수정"
request "$E2E_VISITOR_A" GET "/api/bff/workspaces/$E2E_SLUG_A/introduction?channel=WEB"
assert_status 200 "재발행 전 기존 공개 snapshot 유지"
jq -e '.profile.bio == "private profile A"' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_A" POST "/api/workspaces/$E2E_SLUG_A/publication/manage/publish"
assert_status 200 "A 공개 snapshot 재발행"
jq -e '.publicationStatus == "PUBLISHED" and .revisionNumber == 2' "$E2E_RESPONSE" >/dev/null
request "$E2E_VISITOR_A" GET "/api/bff/workspaces/$E2E_SLUG_A/introduction?channel=WEB"
assert_status 200 "재발행 후 새 snapshot 조회"
jq -e '.profile.bio == "private profile A-DRAFT"' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/publication/manage/revisions"
assert_status 200 "A 공개 revision 이력 조회"
jq -e '(.revisions | length) == 2 and .revisions[0].revisionNumber == 2 and .revisions[0].operationType == "PUBLISH" and .revisions[0].currentRevision == true and .revisions[1].revisionNumber == 1' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_A/publication/manage/revisions"
assert_status 404 "B가 A 공개 revision 이력을 조회하지 못함"
request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_A/publication/manage/revisions/1/rollback"
assert_status 404 "B가 A 공개 revision을 롤백하지 못함"
request "$E2E_COOKIE_A" POST "/api/workspaces/$E2E_SLUG_A/publication/manage/revisions/1/rollback"
assert_status 200 "A revision 1 snapshot을 새 revision으로 롤백"
jq -e '.publicationStatus == "PUBLISHED" and .revisionNumber == 3' "$E2E_RESPONSE" >/dev/null
request "$E2E_VISITOR_A" GET "/api/bff/workspaces/$E2E_SLUG_A/introduction?channel=WEB"
assert_status 200 "롤백 후 revision 1 snapshot 공개"
jq -e '.profile.bio == "private profile A"' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/publication/manage/revisions"
assert_status 200 "롤백 revision 이력 재조회"
jq -e '(.revisions | length) == 3 and .revisions[0].revisionNumber == 3 and .revisions[0].operationType == "ROLLBACK" and .revisions[0].sourceRevisionNumber == 1 and .revisions[0].currentRevision == true' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/profile"
assert_status 200 "롤백 후에도 최신 초안 유지"
jq -e '.bio == "private profile A-DRAFT"' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_A" PUT "/api/workspaces/$E2E_SLUG_A/settings/slug" \
    "$(jq -cn --arg slug "$E2E_SLUG_A_NEW" '{slug:$slug}')"
assert_status 200 "A canonical slug 변경"
jq -e --arg slug "$E2E_SLUG_A_NEW" --arg oldSlug "$E2E_SLUG_A" \
    '.canonicalSlug == $slug and (.activeAliases | index($oldSlug)) != null' "$E2E_RESPONSE" >/dev/null
request "$E2E_VISITOR_A" GET "/api/public/workspaces/$E2E_SLUG_A/resolution"
assert_status 200 "기존 공개 slug가 canonical Workspace를 해석"
jq -e --arg canonical "$E2E_SLUG_A_NEW" '.canonicalSlug == $canonical' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_A/slug-resolution"
assert_status 404 "B가 A의 기존 slug를 통해 Membership 정보를 조회하지 못함"
request "$E2E_VISITOR_A" GET "/api/bff/workspaces/$E2E_SLUG_A/introduction?channel=WEB"
assert_status 200 "기존 slug 공개 API 호환"
E2E_REDIRECT_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' "$E2E_FRONTEND_URL/workspace/$E2E_SLUG_A")"
[[ "$E2E_REDIRECT_STATUS" == "308" ]] || {
    echo "FAIL: 기존 Workspace 공개 URL canonical redirect (expected=308, actual=$E2E_REDIRECT_STATUS)" >&2
    exit 1
}
echo "PASS: 기존 Workspace 공개 URL canonical redirect (308)"
request "$E2E_VISITOR_A" GET /api/bff/introduction
assert_status 404 "default Workspace 소개 BFF 제거"
E2E_PRINT_STATUS="$(
    curl -sS --max-time 60 -o /dev/null -w '%{http_code}' \
        "$E2E_FRONTEND_URL/workspace/$E2E_SLUG_A_NEW/print"
)"
[[ "$E2E_PRINT_STATUS" == "200" ]] || {
    echo "FAIL: canonical Workspace 인쇄 route (expected=200, actual=$E2E_PRINT_STATUS)" >&2
    exit 1
}
echo "PASS: canonical Workspace 인쇄 route (200)"
E2E_LEGACY_PRINT_STATUS="$(
    curl -sS --max-time 60 -o /dev/null -w '%{http_code}' "$E2E_FRONTEND_URL/print"
)"
[[ "$E2E_LEGACY_PRINT_STATUS" == "404" ]] || {
    echo "FAIL: 전역 legacy 인쇄 route 제거 (expected=404, actual=$E2E_LEGACY_PRINT_STATUS)" >&2
    exit 1
}
echo "PASS: 전역 legacy 인쇄 route 제거 (404)"

echo "[6/9] Study ID·동일 slug·Experience Tree 연결 격리"
request "$E2E_COOKIE_A" POST "/api/workspaces/$E2E_SLUG_A/studies/manage" "$(study_payload 'A private study')"
assert_status 201 "A Study 생성"
E2E_STUDY_A_ID="$(jq -r '.id' "$E2E_RESPONSE")"
request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_B/studies/manage" "$(study_payload 'B private study')"
assert_status 201 "B가 같은 slug의 별도 Study 생성"
E2E_STUDY_B_ID="$(jq -r '.id' "$E2E_RESPONSE")"
request "$E2E_COOKIE_B" PUT "/api/workspaces/$E2E_SLUG_B/studies/manage/$E2E_STUDY_A_ID" "$(study_payload 'cross update')"
assert_status 404 "B가 A Study ID를 자기 Workspace에서 수정하지 못함"
request "$E2E_COOKIE_B" DELETE "/api/workspaces/$E2E_SLUG_B/studies/manage/$E2E_STUDY_A_ID"
assert_status 404 "B가 A Study ID를 자기 Workspace에서 삭제하지 못함"
request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/studies/manage"
assert_status 200 "교차 삭제 시도 후 A Study 보존"
jq -e '.content | length == 1 and .[0].title == "A private study"' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_B/studies/manage"
assert_status 200 "B Study 목록 조회"
jq -e '.content | length == 1 and .[0].title == "B private study"' "$E2E_RESPONSE" >/dev/null

request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/experience-tree/manage"
assert_status 200 "A Experience Tree 관리 인덱스 조회"
E2E_SITUATION_KEY="$(jq -r '.situations[0].stableKey // empty' "$E2E_RESPONSE")"
[[ -n "$E2E_SITUATION_KEY" ]] || {
    echo "FAIL: Experience Tree fixture에서 연결할 situation을 찾지 못했습니다." >&2
    exit 1
}
E2E_LINK_PAYLOAD_A="$(jq -cn \
    --arg situationKey "$E2E_SITUATION_KEY" \
    --argjson studyId "$E2E_STUDY_A_ID" \
    '{situationKey:$situationKey,optionKey:null,studyId:$studyId,relationType:"APPLIED",note:"A workspace evidence",displayOrder:0}')"
request "$E2E_COOKIE_A" POST "/api/workspaces/$E2E_SLUG_A/experience-tree/manage/study-links" "$E2E_LINK_PAYLOAD_A"
assert_status 201 "A가 자기 Study를 Experience Tree에 연결"
E2E_STUDY_LINK_A_ID="$(jq -r '.linkId' "$E2E_RESPONSE")"

request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_B/experience-tree/manage/study-links" "$E2E_LINK_PAYLOAD_A"
assert_status 404 "B가 A Study ID를 자기 Experience Tree에 연결하지 못함"
request "$E2E_COOKIE_B" PUT "/api/workspaces/$E2E_SLUG_B/experience-tree/manage/study-links/$E2E_STUDY_LINK_A_ID" \
    "$(jq -cn \
        --arg situationKey "$E2E_SITUATION_KEY" \
        --argjson studyId "$E2E_STUDY_B_ID" \
        '{situationKey:$situationKey,optionKey:null,studyId:$studyId,relationType:"APPLIED",note:"cross update",displayOrder:0}')"
assert_status 404 "B가 A Experience Tree 링크 ID를 수정하지 못함"
request "$E2E_COOKIE_B" DELETE "/api/workspaces/$E2E_SLUG_B/experience-tree/manage/study-links/$E2E_STUDY_LINK_A_ID"
assert_status 404 "B가 A Experience Tree 링크 ID를 삭제하지 못함"
request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/experience-tree/manage/situations/$(printf '%s' "$E2E_SITUATION_KEY" | jq -sRr @uri)"
assert_status 200 "교차 변경 시도 후 A Experience Tree 링크 보존"
jq -e --argjson linkId "$E2E_STUDY_LINK_A_ID" '.studies | any(.linkId == $linkId and .note == "A workspace evidence")' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_A/experience-tree/manage"
assert_status 404 "B가 A Experience Tree 관리 데이터에 접근하지 못함"

echo "[7/9] Skill overlay·Competency·핵심 프로젝트 교차 연결 차단"
request "$E2E_COOKIE_A" GET /api/skill-catalog
assert_status 200 "공통 Skill 카탈로그 조회"
E2E_CATALOG_SKILL_ID="$(jq -r '.[0].id // empty' "$E2E_RESPONSE")"
E2E_CATALOG_SKILL_NAME="$(jq -r '.[0].name // empty' "$E2E_RESPONSE")"
[[ -n "$E2E_CATALOG_SKILL_ID" && -n "$E2E_CATALOG_SKILL_NAME" ]] || {
    echo "FAIL: Skill catalog fixture를 찾지 못했습니다." >&2
    exit 1
}
request "$E2E_COOKIE_A" POST "/api/workspaces/$E2E_SLUG_A/skills" \
    "$(workspace_skill_payload "$E2E_CATALOG_SKILL_NAME" 'A workspace overlay')"
assert_status 200 "A가 공통 Skill을 자기 Workspace에 추가"
request "$E2E_COOKIE_A" POST "/api/workspaces/$E2E_SLUG_A/competencies" \
    "$(competency_payload 'A isolated competency' "$E2E_CATALOG_SKILL_ID")"
assert_status 200 "A가 자기 Workspace Skill로 Competency 생성"
jq -e '.visible == false' "$E2E_RESPONSE" >/dev/null || {
    echo "FAIL: Competency 원본 생성 요청의 legacy 공개 값이 무시되지 않았습니다." >&2
    exit 1
}
echo "PASS: Competency 원본 생성은 legacy 공개 값을 false로 고정"
E2E_COMPETENCY_A_ID="$(jq -r '.id' "$E2E_RESPONSE")"
request "$E2E_COOKIE_A" PUT "/api/workspaces/$E2E_SLUG_A/competencies/$E2E_COMPETENCY_A_ID" \
    "$(competency_payload 'A isolated competency' "$E2E_CATALOG_SKILL_ID")"
assert_status 200 "A Competency 원본 수정"
jq -e '.visible == false' "$E2E_RESPONSE" >/dev/null || {
    echo "FAIL: Competency 원본 수정 요청이 legacy 공개 값을 변경했습니다." >&2
    exit 1
}
echo "PASS: Competency 원본 수정은 legacy 공개 값을 보존"

request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_B/competencies" \
    "$(competency_payload 'B missing overlay competency' "$E2E_CATALOG_SKILL_ID")"
assert_status 400 "B가 Workspace에 추가하지 않은 catalog Skill을 Competency에 연결하지 못함"
request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_B/skills" \
    "$(workspace_skill_payload "$E2E_CATALOG_SKILL_NAME" 'B independent overlay')"
assert_status 200 "B가 같은 공통 Skill을 독립 overlay로 추가"
request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_B/competencies" \
    "$(competency_payload 'B isolated competency' "$E2E_CATALOG_SKILL_ID")"
assert_status 200 "B가 자기 Workspace Skill로 Competency 생성"
request "$E2E_COOKIE_B" PUT "/api/workspaces/$E2E_SLUG_B/competencies/$E2E_COMPETENCY_A_ID" \
    "$(competency_payload 'cross competency update' "$E2E_CATALOG_SKILL_ID")"
assert_status 400 "B가 A Competency ID를 자기 Workspace에서 수정하지 못함"
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_A/competencies"
assert_status 404 "B가 A Competency 목록을 조회하지 못함"
request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/competencies"
assert_status 200 "교차 수정 시도 후 A Competency 보존"
jq -e --argjson id "$E2E_COMPETENCY_A_ID" '. | any(.id == $id and .title == "A isolated competency")' "$E2E_RESPONSE" >/dev/null

request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/job-applications/manage/catalog"
assert_status 200 "공통 JobPosting 카탈로그 조회"
E2E_JOB_POSTING_ID="$(
    jq -r --arg postingUrl "$E2E_JOB_POSTING_URL" \
        '.[] | select(.postingUrl == $postingUrl) | .id' "$E2E_RESPONSE" | head -1
)"
[[ -n "$E2E_JOB_POSTING_ID" ]] || {
    echo "FAIL: JobPosting catalog fixture를 찾지 못했습니다." >&2
    exit 1
}
request "$E2E_COOKIE_A" POST "/api/workspaces/$E2E_SLUG_A/job-applications/manage/$E2E_JOB_POSTING_ID" \
    "$(job_application_payload 'A independent application')"
assert_status 200 "A가 공통 공고를 자기 Workspace 지원 건으로 저장"
request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_B/job-applications/manage/$E2E_JOB_POSTING_ID" \
    "$(job_application_payload 'B independent application')"
assert_status 200 "B가 같은 공고를 독립 지원 건으로 저장"
request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/job-applications/manage"
assert_status 200 "A 지원 현황 목록 조회"
jq -e --argjson id "$E2E_JOB_POSTING_ID" \
    '. | any(.id == $id and .status == "SAVED" and .memo == "A independent application")' \
    "$E2E_RESPONSE" >/dev/null || {
    echo "FAIL: A 지원 현황에 자기 상태와 메모가 보존되지 않았습니다." >&2
    exit 1
}
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_B/job-applications/manage"
assert_status 200 "B 지원 현황 목록 조회"
jq -e --argjson id "$E2E_JOB_POSTING_ID" \
    '. | any(.id == $id and .status == "SAVED" and .memo == "B independent application")' \
    "$E2E_RESPONSE" >/dev/null || {
    echo "FAIL: B 지원 현황에 자기 상태와 메모가 보존되지 않았습니다." >&2
    exit 1
}
request "$E2E_COOKIE_A" PUT "/api/workspaces/$E2E_SLUG_A/job-applications/manage/$E2E_JOB_POSTING_ID" \
    "$(jq -cn '{status:"APPLIED",appliedAt:"2026-08-12",memo:"A applied independently",interestLevel:5,matchScore:null,matchReason:""}')"
assert_status 200 "A 지원 상태·메모 독립 변경"
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_B/job-applications/manage"
assert_status 200 "A 변경 뒤 B 지원 현황 재조회"
jq -e --argjson id "$E2E_JOB_POSTING_ID" \
    '. | any(.id == $id and .status == "SAVED" and .memo == "B independent application" and .interestLevel == 3)' \
    "$E2E_RESPONSE" >/dev/null || {
    echo "FAIL: A의 지원 상태 변경이 B Workspace 지원 현황에 전파되었습니다." >&2
    exit 1
}
echo "PASS: 동일 공고의 Workspace별 지원 상태·메모·관심도 독립 보존"

request "$E2E_COOKIE_A" POST "/api/workspaces/$E2E_SLUG_A/images/presigned-upload" \
    '{"scope":"PRINT_TEMPLATE_FINAL_PDF","fileName":"a-final.pdf","contentType":"application/pdf"}'
assert_status 200 "A 최종 PDF용 presigned key 발급"
E2E_FINAL_PDF_KEY_A="$(jq -r '.objectKey' "$E2E_RESPONSE")"
[[ "$E2E_FINAL_PDF_KEY_A" =~ ^workspaces/[1-9][0-9]*/print-template/final-pdf/[0-9]{4}/[0-9]{2}/.+\.pdf$ ]] || {
    echo "FAIL: A 최종 PDF object key namespace가 올바르지 않습니다: $E2E_FINAL_PDF_KEY_A" >&2
    exit 1
}
request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_B/images/presigned-upload" \
    '{"scope":"PRINT_TEMPLATE_FINAL_PDF","fileName":"b-final.pdf","contentType":"application/pdf"}'
assert_status 200 "B 최종 PDF용 presigned key 발급"
E2E_FINAL_PDF_KEY_B="$(jq -r '.objectKey' "$E2E_RESPONSE")"
E2E_WORKSPACE_KEY_ID_A="${E2E_FINAL_PDF_KEY_A#workspaces/}"
E2E_WORKSPACE_KEY_ID_A="${E2E_WORKSPACE_KEY_ID_A%%/*}"
E2E_WORKSPACE_KEY_ID_B="${E2E_FINAL_PDF_KEY_B#workspaces/}"
E2E_WORKSPACE_KEY_ID_B="${E2E_WORKSPACE_KEY_ID_B%%/*}"
[[ "$E2E_WORKSPACE_KEY_ID_A" != "$E2E_WORKSPACE_KEY_ID_B" ]] || {
    echo "FAIL: A와 B의 최종 PDF object key Workspace namespace가 같을 수 없습니다." >&2
    exit 1
}

request "$E2E_COOKIE_A" POST "/api/workspaces/$E2E_SLUG_A/print-templates/manage/job-applications/$E2E_JOB_POSTING_ID/direct-pdf" \
    "$(jq -cn --arg objectKey "$E2E_FINAL_PDF_KEY_A" '{name:"A final PDF",objectKey:$objectKey}')"
assert_status 200 "A가 자기 namespace의 최종 PDF 템플릿 생성"
E2E_PRINT_TEMPLATE_A_ID="$(jq -r '.id' "$E2E_RESPONSE")"
jq -e '.isFinalSubmission == true and .finalPdfUrl != null' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_B/print-templates/manage/job-applications/$E2E_JOB_POSTING_ID/direct-pdf" \
    "$(jq -cn --arg objectKey "$E2E_FINAL_PDF_KEY_A" '{name:"cross workspace PDF",objectKey:$objectKey}')"
assert_status 400 "B가 A Workspace의 최종 PDF key를 연결하지 못함"
request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_B/print-templates/manage/job-applications/$E2E_JOB_POSTING_ID/direct-pdf" \
    "$(jq -cn --arg objectKey "$E2E_FINAL_PDF_KEY_B" '{name:"B final PDF",objectKey:$objectKey}')"
assert_status 200 "B가 자기 namespace의 최종 PDF 템플릿 생성"
request "$E2E_COOKIE_B" PATCH "/api/workspaces/$E2E_SLUG_B/print-templates/manage/job-applications/$E2E_JOB_POSTING_ID/$E2E_PRINT_TEMPLATE_A_ID/mark-final"
assert_status 404 "B가 A PrintTemplate ID를 최종본으로 지정하지 못함"
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_A/print-templates/manage/job-applications/$E2E_JOB_POSTING_ID"
assert_status 404 "B가 A 지원 건의 PrintTemplate 목록을 조회하지 못함"
request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/print-templates/manage/job-applications/$E2E_JOB_POSTING_ID"
assert_status 200 "교차 변경 시도 후 A 최종 PDF 템플릿 보존"
jq -e --argjson id "$E2E_PRINT_TEMPLATE_A_ID" '. | any(.id == $id and .isFinalSubmission == true)' "$E2E_RESPONSE" >/dev/null

request "$E2E_COOKIE_A" POST "/api/workspaces/$E2E_SLUG_A/experiences/manage" "$(experience_payload 'A project' 'a-project')"
assert_status 200 "A 프로젝트 생성"
jq -e '.showOnTimeline == false' "$E2E_RESPONSE" >/dev/null || {
    echo "FAIL: Experience 원본 생성 요청의 legacy 타임라인 값이 무시되지 않았습니다." >&2
    exit 1
}
echo "PASS: Experience 원본 생성은 legacy 타임라인 값을 false로 고정"
E2E_PROJECT_A_ID="$(jq -r '.id' "$E2E_RESPONSE")"
request "$E2E_COOKIE_A" PUT "/api/workspaces/$E2E_SLUG_A/experiences/manage/$E2E_PROJECT_A_ID" \
    "$(experience_payload 'A project' 'a-project')"
assert_status 200 "A 프로젝트 원본 수정"
jq -e '.showOnTimeline == false' "$E2E_RESPONSE" >/dev/null || {
    echo "FAIL: Experience 원본 수정 요청이 legacy 타임라인 값을 변경했습니다." >&2
    exit 1
}
echo "PASS: Experience 원본 수정은 legacy 타임라인 값을 보존"
request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_B/experiences/manage" "$(experience_payload 'B project' 'b-project')"
assert_status 200 "B 프로젝트 생성"
E2E_PROJECT_B_ID="$(jq -r '.id' "$E2E_RESPONSE")"
request "$E2E_COOKIE_A" PUT "/api/workspaces/$E2E_SLUG_A/experience-placements/CORE_PROJECT" \
    "$(jq -cn --argjson id "$E2E_PROJECT_A_ID" '[{experienceId:$id,displayOrder:0,enabled:true,detailIds:[]}]')"
assert_status 200 "A 핵심 프로젝트 편성"
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_A/experience-placements/CORE_PROJECT"
assert_status 404 "B가 A 핵심 프로젝트 편성을 조회하지 못함"
request "$E2E_COOKIE_B" PUT "/api/workspaces/$E2E_SLUG_B/experience-placements/CORE_PROJECT" \
    "$(jq -cn --argjson id "$E2E_PROJECT_A_ID" '[{experienceId:$id,displayOrder:0,enabled:true,detailIds:[]}]')"
assert_status 400 "B가 A 프로젝트 ID를 자기 편성에 연결하지 못함"
request "$E2E_COOKIE_B" PUT "/api/workspaces/$E2E_SLUG_B/experience-placements/CORE_PROJECT" \
    "$(jq -cn --argjson id "$E2E_PROJECT_B_ID" '[{experienceId:$id,displayOrder:0,enabled:true,detailIds:[]}]')"
assert_status 200 "B가 자기 프로젝트만 편성"

echo "[8/9] Workspace 방문 통계·플랫폼 후원 권한 격리"
request "$E2E_VISITOR_A" POST "/api/workspaces/$E2E_SLUG_A/visits"
assert_status 200 "A 공개 방문 기록"
request "$E2E_VISITOR_B" POST "/api/workspaces/$E2E_SLUG_B/visits"
assert_status 200 "B 공개 첫 방문 기록"
request "$E2E_VISITOR_B" POST "/api/workspaces/$E2E_SLUG_B/visits"
assert_status 200 "B 공개 페이지 재조회 기록"
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_A/visits/manage/summary"
assert_status 404 "B가 A Workspace 통계를 조회하지 못함"
request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/visits/manage/summary"
assert_status 200 "A가 자기 Workspace 통계 조회"
jq -e '.totalVisitors == 1 and .totalPageViews == 1' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_B/visits/manage/summary"
assert_status 200 "B가 자기 Workspace 통계 조회"
jq -e '.totalVisitors == 1 and .totalPageViews == 2' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_B" GET /api/admin/visits/summary
assert_status 403 "일반 Workspace 사용자의 플랫폼 전체 통계 접근 차단"
request "$E2E_COOKIE_B" GET /api/admin/donations
assert_status 403 "일반 Workspace 사용자의 플랫폼 후원 내역 접근 차단"
request "$E2E_VISITOR_A" GET /api/donations/config
assert_status 200 "익명 방문자의 후원 버튼 공개 설정 조회"
jq -e 'has("enabled") and has("kofiPageUrl")' "$E2E_RESPONSE" >/dev/null
E2E_INVALID_DONATION_TX="invalid-e2e-$E2E_RUN_KEY"
request "$E2E_VISITOR_A" POST /api/donations/kofi/webhook \
    "$(jq -cn --arg tx "$E2E_INVALID_DONATION_TX" '{
        message_id:$tx,
        kofi_transaction_id:$tx,
        amount:"5.00",
        currency:"USD",
        verification_token:"invalid-e2e-token"
    }')"
assert_status 400 "잘못된 검증 토큰의 외부 후원 Webhook 거부"
E2E_INVALID_DONATION_COUNT="$(db_exec <<SQL
SELECT COUNT(*) FROM donation WHERE mul_no = '$E2E_INVALID_DONATION_TX';
SQL
)"
[[ "$E2E_INVALID_DONATION_COUNT" == "0" ]] || {
    echo "FAIL: 거부된 후원 Webhook이 DB에 저장되어서는 안 됩니다." >&2
    exit 1
}

echo "[9/9] Workspace 초대 수락·거절·역할·소유권 이전·제거 경계"
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_A/members/manage"
assert_status 404 "초대 수락 전 B의 A 멤버 목록 접근 차단"
request "$E2E_COOKIE_A" POST "/api/workspaces/$E2E_SLUG_A/members/manage/invitations" \
    "$(jq -cn --arg email "$E2E_EMAIL_B" '{email:$email,role:"ADMIN",validForHours:24}')"
assert_status 201 "A가 활성 계정 B에게 ADMIN 참여 초대"
E2E_MAIL_ID="$(
    docker compose exec -T mailpit wget -qO- 'http://127.0.0.1:8025/api/v1/messages?limit=100' |
        jq -r --arg email "$E2E_EMAIL_B" \
            '.messages[] | select(.Subject == "Self-Intro Workspace 참여 초대" and any(.To[]; .Address == $email)) | .ID' |
        head -1
)"
[[ -n "$E2E_MAIL_ID" && "$E2E_MAIL_ID" != "null" ]] || {
    echo "FAIL: Mailpit에서 B의 Workspace 초대 메일을 찾지 못했습니다." >&2
    exit 1
}
E2E_MEMBER_TOKEN="$(
    docker compose exec -T mailpit wget -qO- "http://127.0.0.1:8025/api/v1/message/$E2E_MAIL_ID" |
        jq -r '.Text' |
        grep -o 'wsi_[A-Za-z0-9_-]*' |
        head -1
)"
[[ -n "$E2E_MEMBER_TOKEN" ]] || {
    echo "FAIL: Workspace 초대 메일에서 token을 찾지 못했습니다." >&2
    exit 1
}
request "$E2E_COOKIE_B" POST /api/workspace-membership-invitations/accept \
    "$(jq -cn --arg token "$E2E_MEMBER_TOKEN" '{token:$token}')"
assert_status 200 "B가 자신의 이메일로 A Workspace 초대 수락"
E2E_MEMBER_B_IN_A="$(jq -r '.member.id' "$E2E_RESPONSE")"
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_A/members/manage"
assert_status 200 "수락 후 ADMIN B의 A 멤버 목록 접근"
jq -e '.members | length == 2' "$E2E_RESPONSE" >/dev/null
request "$E2E_COOKIE_A" POST "/api/workspaces/$E2E_SLUG_A/members/manage/$E2E_MEMBER_B_IN_A/transfer-ownership"
assert_status 200 "A가 B에게 원자적으로 소유권 이전"
jq -e '.previousOwner.role == "ADMIN" and .newOwner.role == "OWNER"' "$E2E_RESPONSE" >/dev/null
E2E_MEMBER_A_IN_A="$(db_exec <<SQL
SELECT member.id
FROM workspace_member member
JOIN workspace ON workspace.id = member.workspace_id
JOIN app_user user ON user.id = member.user_id
WHERE workspace.slug = '$E2E_SLUG_A_NEW' AND user.login_id = '$E2E_USER_A';
SQL
)"
request "$E2E_COOKIE_B" DELETE "/api/workspaces/$E2E_SLUG_A/members/manage/$E2E_MEMBER_A_IN_A"
assert_status 204 "새 OWNER B가 이전 OWNER였던 ADMIN A 제거"
request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/members/manage"
assert_status 404 "제거된 A의 alias 기반 관리 접근 차단"
unset E2E_MEMBER_TOKEN

request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_A/members/manage/invitations" \
    "$(jq -cn --arg email "$E2E_EMAIL_A" '{email:$email,role:"VIEWER",validForHours:24}')"
assert_status 201 "새 OWNER B가 제거된 A에게 VIEWER 재초대"
E2E_DECLINE_MAIL_ID="$(
    docker compose exec -T mailpit wget -qO- 'http://127.0.0.1:8025/api/v1/messages?limit=100' |
        jq -r --arg email "$E2E_EMAIL_A" \
            '.messages[] | select(.Subject == "Self-Intro Workspace 참여 초대" and any(.To[]; .Address == $email)) | .ID' |
        head -1
)"
[[ -n "$E2E_DECLINE_MAIL_ID" && "$E2E_DECLINE_MAIL_ID" != "null" ]] || {
    echo "FAIL: Mailpit에서 A의 Workspace 재초대 메일을 찾지 못했습니다." >&2
    exit 1
}
E2E_DECLINE_TOKEN="$(
    docker compose exec -T mailpit wget -qO- "http://127.0.0.1:8025/api/v1/message/$E2E_DECLINE_MAIL_ID" |
        jq -r '.Text' |
        grep -o 'wsi_[A-Za-z0-9_-]*' |
        head -1
)"
[[ -n "$E2E_DECLINE_TOKEN" ]] || {
    echo "FAIL: Workspace 재초대 메일에서 token을 찾지 못했습니다." >&2
    exit 1
}
request "$E2E_COOKIE_A" POST /api/workspace-membership-invitations/decline \
    "$(jq -cn --arg token "$E2E_DECLINE_TOKEN" '{token:$token}')"
assert_status 204 "A가 자신의 이메일로 Workspace 재초대 거절"
request "$E2E_COOKIE_A" GET "/api/workspaces/$E2E_SLUG_A/members/manage"
assert_status 404 "거절 뒤 A에게 Workspace 권한이 생기지 않음"
E2E_DECLINED_COUNT="$(db_exec <<SQL
SELECT COUNT(*)
FROM workspace_membership_invitation invitation
JOIN workspace ON workspace.id = invitation.workspace_id
WHERE workspace.slug = '$E2E_SLUG_A_NEW' AND invitation.status = 'DECLINED';
SQL
)"
[[ "$E2E_DECLINED_COUNT" == "1" ]] || {
    echo "FAIL: Workspace 거절 상태가 정확히 한 건이어야 합니다." >&2
    exit 1
}
unset E2E_DECLINE_TOKEN

echo "[cleanup] API 삭제 이벤트와 Vector 소비 완료 확인"
request "$E2E_COOKIE_B" DELETE "/api/workspaces/$E2E_SLUG_A/experience-tree/manage/study-links/$E2E_STUDY_LINK_A_ID"
assert_status 204 "새 OWNER B가 A Experience Tree 테스트 링크 정리"
request "$E2E_COOKIE_B" PUT "/api/workspaces/$E2E_SLUG_A/experience-placements/CORE_PROJECT" '[]'
assert_status 200 "A 핵심 프로젝트 테스트 편성 정리"
request "$E2E_COOKIE_B" PUT "/api/workspaces/$E2E_SLUG_B/experience-placements/CORE_PROJECT" '[]'
assert_status 200 "B 핵심 프로젝트 테스트 편성 정리"
request "$E2E_COOKIE_B" DELETE "/api/workspaces/$E2E_SLUG_A/experiences/manage/$E2E_PROJECT_A_ID"
assert_status 204 "A 테스트 Experience API 삭제"
request "$E2E_COOKIE_B" DELETE "/api/workspaces/$E2E_SLUG_B/experiences/manage/$E2E_PROJECT_B_ID"
assert_status 204 "B 테스트 Experience API 삭제"
request "$E2E_COOKIE_B" DELETE "/api/workspaces/$E2E_SLUG_A/studies/manage/$E2E_STUDY_A_ID"
assert_status 204 "A 테스트 Study API 삭제"
request "$E2E_COOKIE_B" DELETE "/api/workspaces/$E2E_SLUG_B/studies/manage/$E2E_STUDY_B_ID"
assert_status 204 "B 테스트 Study API 삭제"
wait_for_fixture_vectors_removed "$E2E_WORKSPACE_KEY_ID_A"
wait_for_fixture_vectors_removed "$E2E_WORKSPACE_KEY_ID_B"

E2E_CLOSED_NAME="E2E Closed Workspace $E2E_RUN_KEY"
request "$E2E_COOKIE_B" PUT "/api/workspaces/$E2E_SLUG_A/settings/name" \
    "$(jq -cn --arg name "$E2E_CLOSED_NAME" '{name:$name}')"
assert_status 200 "OWNER B가 A Workspace 표시 이름 변경"
request "$E2E_COOKIE_B" POST "/api/workspaces/$E2E_SLUG_A/members/leave"
assert_status 409 "OWNER B의 소유권 이전 없는 자발적 탈퇴 차단"
request "$E2E_COOKIE_B" DELETE "/api/workspaces/$E2E_SLUG_A/lifecycle" \
    "$(jq -cn --arg workspaceName "$E2E_CLOSED_NAME" '{workspaceName:$workspaceName}')"
assert_status 204 "OWNER B가 이름 재확인 후 A Workspace 폐쇄"
request "$E2E_COOKIE_B" GET "/api/workspaces/$E2E_SLUG_A/members/manage"
assert_status 404 "폐쇄 뒤 OWNER였던 B의 관리 접근 차단"
request "$E2E_VISITOR_A" GET "/api/public/workspaces/$E2E_SLUG_A/resolution"
assert_status 404 "폐쇄 뒤 A Workspace 공개 접근 차단"
E2E_CLOSED_STATE="$(db_exec <<SQL
SELECT CONCAT(workspace.status, '|', workspace.publication_status, '|',
              IF(workspace.deleted_at IS NULL, 0, 1), '|',
              IF(workspace.purge_after > workspace.deleted_at, 1, 0), '|',
              (SELECT COUNT(*) FROM workspace_member member
               WHERE member.workspace_id = workspace.id AND member.status = 'ACTIVE'))
FROM workspace
WHERE workspace.slug = '$E2E_SLUG_A_NEW';
SQL
)"
[[ "$E2E_CLOSED_STATE" == "DELETED|PRIVATE|1|1|0" ]] || {
    echo "FAIL: Workspace 폐쇄 상태가 예상과 다릅니다: $E2E_CLOSED_STATE" >&2
    exit 1
}
E2E_PURGE_JOB_STATE="$(db_exec <<SQL
SELECT CONCAT(job.status, '|', job.inventory_version, '|',
              (SELECT COUNT(*) FROM workspace_purge_checkpoint checkpoint
               WHERE checkpoint.purge_job_id = job.id), '|',
              (SELECT COUNT(*) FROM workspace_purge_checkpoint checkpoint
               WHERE checkpoint.purge_job_id = job.id AND checkpoint.status = 'PENDING'))
FROM workspace_purge_job job
JOIN workspace ON workspace.id = job.workspace_id
WHERE workspace.slug = '$E2E_SLUG_A_NEW';
SQL
)"
[[ "$E2E_PURGE_JOB_STATE" == "PENDING_GRACE|workspace-purge-v1|5|5" ]] || {
    echo "FAIL: 폐쇄 transaction의 purge job/checkpoint가 예상과 다릅니다: $E2E_PURGE_JOB_STATE" >&2
    exit 1
}
echo "PASS: 폐쇄 transaction에서 purge job과 5개 저장소 checkpoint 생성"

echo "SUCCESS: 두 사용자·두 Workspace Compose 격리 E2E가 모두 통과했습니다."
