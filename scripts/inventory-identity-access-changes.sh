#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

classify_identity() {
  local path="$1"

  case "$path" in
    *Mfa*|*MFA*|*Totp*|*TOTP*)
      printf '%s' "02-mfa"
      ;;
    *Registration*|*EmailVerification*|*UserConsent*|\
    *InvitationIssueRequest*|\
    *InvitationAdministration*|*InvitationOperations*|\
    *SmtpInvitationEmailSender*|*UnavailableInvitationEmailSender*|\
    *InvitationEmailSender.java|*InvitationRetentionService*|\
    *BootstrapOwnerService*|*LocalRegistrationInvitationBootstrap*|\
    frontend-next/app/signup/*|frontend-next/app/ops/*|\
    frontend-next/lib/api/invitation.ts)
      printf '%s' "03-registration-invitation"
      ;;
    *WorkspaceMembership*|*WorkspaceMember*|*MembershipStatus*|*WorkspaceRole*|\
    *WorkspaceInvitationAccept*|*WorkspaceInvitationAccepted*|\
    frontend-next/app/workspace-invitations/*|\
    frontend-next/components/admin/workspace/WorkspaceMemberManagement.tsx)
      printf '%s' "05-membership-ownership"
      ;;
    *WorkspaceLifecycle*|*WorkspaceClosure*|*WorkspaceNameChange*|\
    frontend-next/components/admin/workspace/WorkspaceLifecycleSettings.tsx)
      printf '%s' "06-workspace-lifecycle"
      ;;
    *WorkspaceSlug*|*WorkspaceOnboarding*|*PublicWorkspaceResolver*|\
    *PublicWorkspaceSlugController*|*CurrentWorkspaceService*|\
    frontend-next/app/onboarding/*|\
    frontend-next/components/admin/workspace/WorkspaceSlugSettings.tsx|\
    frontend-next/lib/api/workspace.ts)
      printf '%s' "04-workspace-routing"
      ;;
    backend/core/src/main/java/com/selfintro/modules/securityaudit/*|\
    backend/core/src/test/java/com/selfintro/modules/securityaudit/*)
      printf '%s' "07-security-audit"
      ;;
    backend/core/src/main/java/com/selfintro/global/exception/GlobalExceptionHandler.java)
      printf '%s' "01-auth-session"
      ;;
    backend/core/src/main/java/com/selfintro/modules/auth/*|\
    backend/api/src/test/java/com/selfintro/modules/auth/SaasSecurityFoundationIntegrationTest.java)
      printf '%s' "01-auth-session"
      ;;
    backend/core/src/main/java/com/selfintro/modules/identity/domain/*|\
    backend/core/src/main/java/com/selfintro/modules/identity/application/WorkspaceAccessPolicy.java)
      printf '%s' "00-identity-kernel"
      ;;
    *)
      printf '%s' "08-manual-review"
      ;;
  esac
}

declare -A counts
declare -A paths
total=0
capture=false

while IFS= read -r line; do
  if [[ "$line" == 03-identity-access:* ]]; then
    capture=true
    continue
  fi
  if [[ "$line" == 04-workspace-content:* ]]; then
    break
  fi
  [[ "$capture" == "true" && "$line" == "  - "* ]] || continue

  path="${line#  - }"
  category="$(classify_identity "$path")"
  counts["$category"]=$(( ${counts["$category"]:-0} + 1 ))
  paths["$category"]+="${paths["$category"]:+$'\n'}  - $path"
  total=$((total + 1))
done < <(SHOW_ALL_CHANGE_PATHS=true "$PROJECT_ROOT/scripts/inventory-saas-changes.sh")

printf 'Identity and access inventory (%d paths)\n' "$total"
for category in $(printf '%s\n' "${!counts[@]}" | sort); do
  printf '\n%s: %d\n' "$category" "${counts["$category"]}"
  if [[ "${SHOW_ALL_IDENTITY_PATHS:-false}" == "true" ]]; then
    printf '%s\n' "${paths["$category"]}"
  else
    printf '%s\n' "${paths["$category"]}" | head -n 5
  fi
done

manual_count="${counts["08-manual-review"]:-0}"
if (( manual_count > 0 )); then
  printf '\nFAIL: %d Identity paths need explicit classification.\n' "$manual_count" >&2
  exit 1
fi
