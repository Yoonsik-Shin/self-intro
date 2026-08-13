#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

classify_jobs_ai_vector() {
  local path="$1"

  case "$path" in
    backend/ai-worker/src/main/java/com/selfintro/global/ai/*|\
    backend/ai-worker/src/main/java/com/selfintro/config/vector/*|\
    backend/core/src/main/java/com/selfintro/global/ai/*|\
    backend/core/src/test/java/com/selfintro/global/ai/*|\
    backend/core/src/main/java/com/selfintro/global/messaging/*|\
    backend/core/src/test/java/com/selfintro/global/messaging/*)
      printf '%s' "00-shared-ai-runtime"
      ;;
    backend/ai-worker/src/main/java/com/selfintro/studyplan/*|\
    backend/ai-worker/src/test/java/com/selfintro/studyplan/*)
      printf '%s' "04-workspace-study-plan"
      ;;
    backend/ai-worker/src/main/java/com/selfintro/vectorsearch/*|\
    backend/ai-worker/src/test/java/com/selfintro/vectorsearch/*|\
    backend/ai-worker/src/main/resources/oracle-schema.sql)
      printf '%s' "05-vector-boundary"
      ;;
    *WorkspaceJobApplication*|*WorkspaceJobScreenshot*)
      printf '%s' "02-workspace-job-application"
      ;;
    *CoverLetter*|*GapProject*|*CareerAppeal*|*AppealService*|*PrintDraft*)
      printf '%s' "03-workspace-ai-artifact"
      ;;
    backend/ai-worker/src/main/java/com/selfintro/jobposting/*|\
    backend/ai-worker/src/test/java/com/selfintro/jobposting/*|\
    backend/api/src/main/java/com/selfintro/modules/jobapplication/*|\
    backend/api/src/test/java/com/selfintro/modules/jobapplication/*|\
    backend/core/src/main/java/com/selfintro/modules/jobapplication/*|\
    backend/core/src/main/java/com/selfintro/modules/jobposting/*|\
    backend/core/src/test/java/com/selfintro/modules/jobposting/*)
      printf '%s' "01-job-catalog-and-projection"
      ;;
    *)
      printf '%s' "10-manual-review"
      ;;
  esac
}

declare -A counts
declare -A paths
total=0
capture=false

while IFS= read -r line; do
  if [[ "$line" == 05-jobs-ai-vector:* ]]; then
    capture=true
    continue
  fi
  if [[ "$line" == 06-frontend-product:* ]]; then
    break
  fi
  [[ "$capture" == "true" && "$line" == "  - "* ]] || continue

  path="${line#  - }"
  category="$(classify_jobs_ai_vector "$path")"
  counts["$category"]=$(( ${counts["$category"]:-0} + 1 ))
  paths["$category"]+="${paths["$category"]:+$'\n'}  - $path"
  total=$((total + 1))
done < <(SHOW_ALL_CHANGE_PATHS=true "$PROJECT_ROOT/scripts/inventory-saas-changes.sh")

printf 'Job·AI·Vector inventory (%d paths)\n' "$total"
for category in $(printf '%s\n' "${!counts[@]}" | sort); do
  printf '\n%s: %d\n' "$category" "${counts["$category"]}"
  if [[ "${SHOW_ALL_JOBS_AI_VECTOR_PATHS:-false}" == "true" ]]; then
    printf '%s\n' "${paths["$category"]}"
  else
    printf '%s\n' "${paths["$category"]}" | head -n 5
  fi
done

manual_count="${counts["10-manual-review"]:-0}"
if (( manual_count > 0 )); then
  printf '\nFAIL: %d Job·AI·Vector paths need explicit classification.\n' "$manual_count" >&2
  exit 1
fi
