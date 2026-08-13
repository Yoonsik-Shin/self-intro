#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

classify_workspace_content() {
  local path="$1"

  case "$path" in
    scripts/e2e/*)
      printf '%s' "09-cross-workspace-gate"
      ;;
    *WorkspacePublication*|*WorkspacePublishedContent*|*PublicationOperationType*|\
    *PublicationResourceType*|*PublicPageComposition*|\
    backend/core/src/main/java/com/selfintro/bff/*)
      printf '%s' "00-publication-bff"
      ;;
    *Profile*)
      printf '%s' "01-profile"
      ;;
    *ExperienceTree*|*DecisionStudyLink*)
      printf '%s' "03-experience-tree"
      ;;
    *Experience*|*Education*)
      printf '%s' "02-experience"
      ;;
    *Portfolio*|*PrintTemplate*|*DirectPdf*|*StorageService*|*ImageUpload*|\
    *ImageScope*|*WorkspaceOutputSource*)
      printf '%s' "07-portfolio-print-storage"
      ;;
    *Study*|*Taxonomy*|*Tag*)
      printf '%s' "04-study-taxonomy"
      ;;
    *Skill*|*Competency*)
      printf '%s' "05-skill-competency"
      ;;
    *LearningResource*)
      printf '%s' "06-learning-resource"
      ;;
    *Visitor*|*Donation*)
      printf '%s' "08-visitor-donation"
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
  if [[ "$line" == 04-workspace-content:* ]]; then
    capture=true
    continue
  fi
  if [[ "$line" == 05-jobs-ai-vector:* ]]; then
    break
  fi
  [[ "$capture" == "true" && "$line" == "  - "* ]] || continue

  path="${line#  - }"
  category="$(classify_workspace_content "$path")"
  counts["$category"]=$(( ${counts["$category"]:-0} + 1 ))
  paths["$category"]+="${paths["$category"]:+$'\n'}  - $path"
  total=$((total + 1))
done < <(SHOW_ALL_CHANGE_PATHS=true "$PROJECT_ROOT/scripts/inventory-saas-changes.sh")

printf 'Workspace content inventory (%d paths)\n' "$total"
for category in $(printf '%s\n' "${!counts[@]}" | sort); do
  printf '\n%s: %d\n' "$category" "${counts["$category"]}"
  if [[ "${SHOW_ALL_WORKSPACE_CONTENT_PATHS:-false}" == "true" ]]; then
    printf '%s\n' "${paths["$category"]}"
  else
    printf '%s\n' "${paths["$category"]}" | head -n 5
  fi
done

manual_count="${counts["10-manual-review"]:-0}"
if (( manual_count > 0 )); then
  printf '\nFAIL: %d Workspace content paths need explicit classification.\n' "$manual_count" >&2
  exit 1
fi
