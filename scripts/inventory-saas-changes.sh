#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

declare -A counts
declare -A samples
declare -A all_paths
total=0

classify() {
  local path="$1"

  case "$path" in
    seed_portfolio.sql|\
    backend/api/src/main/resources/db/migration/V1__init_schema.sql|\
    backend/api/src/main/resources/db/migration/V17[6-9]__*|\
    backend/api/src/main/resources/db/migration/V18[0-9]__*)
      printf '%s' "01-career-content"
      ;;
    backend/api/src/main/resources/db/migration/V19[0-9]__*|\
    backend/api/src/main/resources/db/migration/V20[0-9]__*|\
    backend/api/src/main/resources/db/migration/V21[0-9]__*|\
    backend/api/src/main/resources/db/migration/V22[0-9]__*)
      printf '%s' "02-saas-schema"
      ;;
    *WorkspacePurge*|*workspace-purge*|*workspace_purge*|\
    *WorkspaceRestoreReconciliation*|*workspace-purge-approval*|\
    backend/core/src/main/java/com/selfintro/modules/identity/application/WorkspaceCacheStoragePort.java|\
    backend/core/src/main/java/com/selfintro/modules/identity/application/WorkspaceNoSqlStoragePort.java|\
    backend/core/src/main/java/com/selfintro/modules/identity/application/WorkspaceRelationalStoragePort.java|\
    backend/core/src/main/java/com/selfintro/modules/identity/application/WorkspaceVectorStoragePort.java|\
    backend/core/src/main/java/com/selfintro/modules/identity/infrastructure/MySqlWorkspaceRelationalStorageAdapter.java|\
    backend/core/src/main/java/com/selfintro/modules/identity/infrastructure/OracleNoSqlCatalogBoundaryAdapter.java|\
    backend/core/src/main/java/com/selfintro/modules/identity/infrastructure/RedisWorkspaceCacheStorageAdapter.java|\
    backend/core/src/test/java/com/selfintro/modules/identity/infrastructure/MySqlWorkspaceRelationalStorageAdapter*|\
    backend/core/src/test/java/com/selfintro/modules/identity/infrastructure/OracleNoSqlCatalogBoundaryAdapter*|\
    backend/core/src/test/java/com/selfintro/modules/identity/infrastructure/OracleNoSqlCatalogBoundaryIntegrationTest.java|\
    backend/core/src/test/java/com/selfintro/modules/identity/infrastructure/RedisWorkspaceCacheStorageAdapter*|\
    backend/api/src/main/java/com/selfintro/modules/identity/infrastructure/GrpcWorkspaceVectorStorageAdapter.java|\
    backend/api/src/test/java/com/selfintro/modules/identity/infrastructure/*|\
    backend/core/src/main/java/com/selfintro/modules/storage/application/ObjectStoragePort.java|\
    backend/core/src/main/java/com/selfintro/modules/storage/infrastructure/*|\
    backend/core/src/test/java/com/selfintro/modules/storage/infrastructure/*|\
    backend/core/src/main/proto/workspace_vector_purge.proto|\
    scripts/rehearse-workspace-purge-compose.sh|\
    scripts/check-workspace-purge-release-gate.sh|\
    .github/workflows/workspace-purge-release-gate.yml|\
    deploy/recovery/*)
      printf '%s' "07-purge-recovery"
      ;;
    backend/core/src/main/java/com/selfintro/modules/identity/publication/*|\
    backend/core/src/test/java/com/selfintro/modules/identity/publication/*)
      printf '%s' "04-workspace-content"
      ;;
    backend/core/src/main/java/com/selfintro/modules/auth/*|\
    backend/core/src/test/java/com/selfintro/modules/auth/*|\
    backend/core/src/main/java/com/selfintro/modules/identity/*|\
    backend/core/src/test/java/com/selfintro/modules/identity/*|\
    backend/core/src/main/java/com/selfintro/modules/securityaudit/*|\
    backend/core/src/test/java/com/selfintro/modules/securityaudit/*|\
    backend/core/src/main/java/com/selfintro/modules/supportaccess/*|\
    backend/core/src/test/java/com/selfintro/modules/supportaccess/*|\
    backend/core/src/main/java/com/selfintro/global/exception/GlobalExceptionHandler.java|\
    backend/core/src/test/java/com/selfintro/global/exception/GlobalExceptionHandlerTest.java|\
    backend/api/src/test/java/com/selfintro/modules/auth/*|\
    frontend-next/app/signup/*|frontend-next/app/onboarding/*|\
    frontend-next/app/workspace-invitations/*|frontend-next/app/ops/*|\
    frontend-next/components/admin/security/*|frontend-next/components/admin/workspace/*|\
    frontend-next/lib/api/invitation.ts|frontend-next/lib/api/workspace.ts|\
    scripts/e2e/registration-onboarding-compose.sh|\
    scripts/e2e/account-withdrawal-compose.sh|\
    scripts/e2e/support-access-compose.sh)
      printf '%s' "03-identity-access"
      ;;
    backend/core/src/main/java/com/selfintro/modules/jobposting/*|\
    backend/core/src/test/java/com/selfintro/modules/jobposting/*|\
    backend/core/src/main/java/com/selfintro/modules/jobapplication/*|\
    backend/core/src/test/java/com/selfintro/modules/jobapplication/*|\
    backend/api/src/main/java/com/selfintro/modules/jobapplication/*|\
    backend/api/src/test/java/com/selfintro/modules/jobapplication/*|\
    backend/ai-worker/src/main/java/com/selfintro/jobposting/*|\
    backend/ai-worker/src/test/java/com/selfintro/jobposting/*|\
    backend/ai-worker/src/main/java/com/selfintro/vectorsearch/*|\
    backend/ai-worker/src/test/java/com/selfintro/vectorsearch/*|\
    backend/ai-worker/src/main/java/com/selfintro/studyplan/*|\
    backend/ai-worker/src/test/java/com/selfintro/studyplan/*|\
    backend/ai-worker/src/main/java/com/selfintro/global/ai/*|\
    backend/ai-worker/src/test/java/com/selfintro/global/ai/*|\
    backend/core/src/main/java/com/selfintro/global/messaging/*|\
    backend/core/src/test/java/com/selfintro/global/messaging/*|\
    backend/ai-worker/src/main/java/com/selfintro/portfolio/*|\
    backend/ai-worker/src/main/java/com/selfintro/config/*)
      printf '%s' "05-jobs-ai-vector"
      ;;
    backend/core/src/main/java/com/selfintro/modules/profile/*|\
    backend/core/src/test/java/com/selfintro/modules/profile/*|\
    backend/core/src/main/java/com/selfintro/modules/experience/*|\
    backend/core/src/test/java/com/selfintro/modules/experience/*|\
    backend/core/src/main/java/com/selfintro/modules/experiencetree/*|\
    backend/core/src/test/java/com/selfintro/modules/experiencetree/*|\
    backend/core/src/main/java/com/selfintro/modules/study/*|\
    backend/core/src/test/java/com/selfintro/modules/study/*|\
    backend/core/src/main/java/com/selfintro/modules/skill/*|\
    backend/core/src/test/java/com/selfintro/modules/skill/*|\
    backend/core/src/main/java/com/selfintro/modules/competency/*|\
    backend/core/src/test/java/com/selfintro/modules/competency/*|\
    backend/core/src/main/java/com/selfintro/modules/portfolio/*|\
    backend/core/src/test/java/com/selfintro/modules/portfolio/*|\
    backend/core/src/main/java/com/selfintro/modules/printtemplate/*|\
    backend/core/src/test/java/com/selfintro/modules/printtemplate/*|\
    backend/core/src/main/java/com/selfintro/modules/learningresource/*|\
    backend/core/src/test/java/com/selfintro/modules/learningresource/*|\
    backend/core/src/main/java/com/selfintro/modules/taxonomy/*|\
    backend/core/src/test/java/com/selfintro/modules/taxonomy/*|\
    backend/core/src/main/java/com/selfintro/modules/visitor/*|\
    backend/core/src/test/java/com/selfintro/modules/visitor/*|\
    backend/core/src/main/java/com/selfintro/modules/donation/*|\
    backend/core/src/main/java/com/selfintro/bff/*|\
    backend/core/src/main/java/com/selfintro/modules/storage/application/StorageService.java|\
    backend/core/src/main/java/com/selfintro/modules/storage/application/ImageScope.java|\
    backend/core/src/main/java/com/selfintro/modules/storage/presentation/ImageUploadController.java|\
    backend/core/src/test/java/com/selfintro/modules/storage/presentation/*|\
    backend/api/src/main/java/com/selfintro/modules/storage/*|\
    backend/api/src/test/java/com/selfintro/modules/storage/*|\
    scripts/e2e/workspace-isolation-compose.sh|\
    backend/api/src/test/java/com/selfintro/modules/experience/*|\
    backend/api/src/test/java/com/selfintro/modules/study/*|\
    backend/api/src/test/java/com/selfintro/modules/competency/*|\
    backend/api/src/test/java/com/selfintro/modules/learningresource/*|\
    backend/api/src/test/java/com/selfintro/modules/printtemplate/*|\
    backend/api/src/test/java/com/selfintro/modules/visitor/*|\
    backend/api/src/test/java/com/selfintro/modules/donation/*)
      printf '%s' "04-workspace-content"
      ;;
    frontend-next/*|\
    scripts/dev/cleanup-output-preview-demo.sql|\
    scripts/dev/seed-output-preview-demo.sql)
      printf '%s' "06-frontend-product"
      ;;
    deploy/*|docker/*|docker-compose.yml|.env.example|.gitattributes|.gitignore|README.md|\
    backend/api/src/main/resources/application.yml|\
    backend/ai-worker/src/main/resources/application.yml|\
    backend/api/src/main/java/com/selfintro/SelfIntroApplication.java|\
    backend/api/src/test/java/com/selfintro/global/config/*|\
    backend/core/src/main/java/com/selfintro/global/config/*|\
    backend/core/src/main/java/com/selfintro/global/exception/*|\
    backend/core/src/main/java/com/selfintro/modules/systemstatus/*|\
    backend/api/build.gradle|backend/core/build.gradle|AGENTS.md)
      printf '%s' "08-runtime-infra"
      ;;
    backend/core/src/main/java/com/selfintro/global/ai/*|\
    backend/core/src/test/java/com/selfintro/global/ai/*|\
    backend/ai-worker/src/main/resources/oracle-schema.sql|\
    backend/api/src/main/java/com/selfintro/jobposting/WorkspaceJobScreenshotCleanupScheduler.java)
      printf '%s' "05-jobs-ai-vector"
      ;;
    scripts/inventory-*-changes.sh)
      printf '%s' "09-docs"
      ;;
    docs/*)
      printf '%s' "09-docs"
      ;;
    *)
      printf '%s' "10-manual-review"
      ;;
  esac
}

while IFS= read -r line; do
  [[ -n "$line" ]] || continue
  path="${line:3}"
  category="$(classify "$path")"
  counts["$category"]=$(( ${counts["$category"]:-0} + 1 ))
  all_paths["$category"]+="${all_paths["$category"]:+$'\n'}  - $path"
  total=$((total + 1))
  if [[ $(printf '%s' "${samples["$category"]:-}" | awk 'NF { count++ } END { print count + 0 }') -lt 5 ]]; then
    samples["$category"]+="${samples["$category"]:+$'\n'}  - $path"
  fi
done < <(git status --porcelain=v1 --untracked-files=all)

printf 'SaaS change inventory (%d paths)\n' "$total"
for category in $(printf '%s\n' "${!counts[@]}" | sort); do
  if [[ "${SHOW_ALL_CHANGE_PATHS:-false}" == "true" ]]; then
    display_paths="${all_paths["$category"]}"
  else
    display_paths="${samples["$category"]}"
  fi
  printf '\n%s: %d\n%s\n' "$category" "${counts["$category"]}" "$display_paths"
done

manual_count="${counts["10-manual-review"]:-0}"
if (( manual_count > 0 )); then
  printf '\nNOTICE: %d paths need explicit classification before commit planning.\n' "$manual_count"
fi
