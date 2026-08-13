#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OVERLAY_FILE="${WORKSPACE_PURGE_OVERLAY_FILE:-$PROJECT_ROOT/deploy/k8s/overlays/prod/backend/kustomization.yaml}"
APPROVAL_FILE="${WORKSPACE_PURGE_APPROVAL_FILE:-$PROJECT_ROOT/deploy/recovery/workspace-purge-approval.env}"
API_DEPLOYMENT_FILE="$PROJECT_ROOT/deploy/k8s/base/backend/deployment.yaml"
WORKER_DEPLOYMENT_FILE="$PROJECT_ROOT/deploy/k8s/base/backend/deployment-worker.yaml"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

overlay_value() {
  local key="$1"
  awk -v key="$key" '
    {
      line = $0
      sub(/^[[:space:]]*-[[:space:]]*/, "", line)
      prefix = key "="
      if (index(line, prefix) == 1) {
        print substr(line, length(prefix) + 1)
        exit
      }
    }
  ' "$OVERLAY_FILE"
}

approval_value() {
  local key="$1"
  awk -F= -v key="$key" '
    $0 !~ /^[[:space:]]*#/ && $1 == key {
      value = substr($0, index($0, "=") + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      print value
      exit
    }
  ' "$APPROVAL_FILE"
}

require_approval_value() {
  local key="$1"
  local value
  value="$(approval_value "$key")"
  [[ -n "$value" ]] || fail "approval evidence is missing $key"
  printf '%s' "$value"
}

require_true() {
  local key="$1"
  local value
  value="$(require_approval_value "$key")"
  [[ "$value" == "true" ]] || fail "$key must be true"
}

[[ -f "$OVERLAY_FILE" ]] || fail "production overlay not found: $OVERLAY_FILE"

grep -A1 'name: APP_RUNTIME_ROLE' "$API_DEPLOYMENT_FILE" | grep -q 'value: "api"' || fail \
  "API Deployment must declare APP_RUNTIME_ROLE=api"
grep -A1 'name: APP_RUNTIME_ROLE' "$WORKER_DEPLOYMENT_FILE" | grep -q 'value: "worker"' || fail \
  "Worker Deployment must declare APP_RUNTIME_ROLE=worker"

for key in MAINTENANCE_MODE WORKSPACE_RESTORE_RECONCILIATION_ENABLED; do
  [[ "$(overlay_value "$key")" == "false" ]] || fail \
    "$key must remain false in the long-running production Deployment"
done

PURGE_FLAGS=(
  WORKSPACE_PURGE_EXECUTION_ENABLED
  WORKSPACE_PURGE_OBJECT_STORAGE_DELETE_ENABLED
  WORKSPACE_PURGE_VECTOR_DELETE_ENABLED
  WORKSPACE_PURGE_CACHE_DELETE_ENABLED
  WORKSPACE_PURGE_MYSQL_DELETE_ENABLED
)

enabled_count=0
for key in "${PURGE_FLAGS[@]}"; do
  value="$(overlay_value "$key")"
  [[ "$value" == "true" || "$value" == "false" ]] || fail "$key must be explicitly true or false"
  if [[ "$value" == "true" ]]; then
    enabled_count=$((enabled_count + 1))
  fi
done

if [[ "$enabled_count" -eq 0 ]]; then
  echo "PASS: Workspace purge remains fail-closed; all production flags are false"
  exit 0
fi

[[ -f "$APPROVAL_FILE" ]] || fail \
  "purge flag is enabled but approval evidence is absent: $APPROVAL_FILE"

grace_period="$(overlay_value WORKSPACE_DELETION_GRACE_PERIOD)"
[[ "$grace_period" =~ ^([1-9][0-9]*)d$ ]] || fail \
  "WORKSPACE_DELETION_GRACE_PERIOD must be explicit whole days in the production overlay"
grace_days="${BASH_REMATCH[1]}"

retention_days="$(require_approval_value MYSQL_BACKUP_RETENTION_DAYS)"
[[ "$retention_days" =~ ^[1-9][0-9]*$ ]] || fail "MYSQL_BACKUP_RETENTION_DAYS must be a positive integer"
(( retention_days <= grace_days )) || fail \
  "MySQL backup retention must not exceed the Workspace deletion grace period"

object_retention_days="$(require_approval_value OBJECT_BACKUP_RETENTION_DAYS)"
[[ "$object_retention_days" =~ ^[1-9][0-9]*$ ]] || fail \
  "OBJECT_BACKUP_RETENTION_DAYS must be a positive integer"
(( object_retention_days <= grace_days )) || fail \
  "Object backup retention must not exceed the Workspace deletion grace period"

rpo_hours="$(require_approval_value MYSQL_BACKUP_RPO_HOURS)"
[[ "$rpo_hours" =~ ^[1-9][0-9]*$ ]] || fail "MYSQL_BACKUP_RPO_HOURS must be a positive integer"

expires_at="$(require_approval_value EVIDENCE_EXPIRES_AT)"
[[ "$expires_at" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || fail \
  "EVIDENCE_EXPIRES_AT must use YYYY-MM-DD"
today="$(date -u +%Y-%m-%d)"
[[ "$expires_at" > "$today" || "$expires_at" == "$today" ]] || fail \
  "recovery approval evidence expired on $expires_at"

require_approval_value APPROVAL_REF >/dev/null
[[ "$(require_approval_value APPROVED_BY_ROLE)" == "platform-owner" ]] || fail \
  "APPROVED_BY_ROLE must be platform-owner"
require_approval_value OBJECT_STORAGE_PROVIDER >/dev/null
require_approval_value MYSQL_RESTORE_REHEARSAL_AT >/dev/null
require_approval_value OBJECT_RESTORE_REHEARSAL_AT >/dev/null

require_true MYSQL_BACKUP_ENCRYPTION_VERIFIED
require_true MYSQL_RESTORE_REHEARSAL_VERIFIED
require_true OBJECT_PUBLIC_BUCKET_VERSIONING_VERIFIED
require_true OBJECT_PRIVATE_BUCKET_VERSIONING_VERIFIED
require_true OBJECT_RESTORE_REHEARSAL_VERIFIED
require_true RESTORE_MAINTENANCE_MODE_VERIFIED
require_true POST_RESTORE_PURGE_RECONCILIATION_VERIFIED

execution_enabled="$(overlay_value WORKSPACE_PURGE_EXECUTION_ENABLED)"
if [[ "$execution_enabled" == "true" && "$enabled_count" -ne "${#PURGE_FLAGS[@]}" ]]; then
  fail "global purge execution requires every provider deletion flag to be true"
fi

echo "PASS: Workspace purge recovery evidence is present and within the deletion boundary"
