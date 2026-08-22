#!/usr/bin/env bash

set -euo pipefail

NAMESPACE="self-intro"
SECRET_NAME="rabbitmq-credentials"
EXPECTED_CONTEXT="self-intro-oke"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_FILE="${SCRIPT_DIR}/sealed-rabbitmq-credentials.yaml"

for command_name in kubectl kubeseal openssl; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "필수 명령을 찾을 수 없습니다: ${command_name}" >&2
    exit 1
  fi
done

current_context="$(kubectl config current-context)"
if [[ "${current_context}" != "${EXPECTED_CONTEXT}" ]]; then
  echo "잘못된 Kubernetes context입니다: ${current_context}" >&2
  echo "필요한 context: ${EXPECTED_CONTEXT}" >&2
  exit 1
fi

echo "SealedSecret 대상 Kubernetes context: ${current_context}"
read -r -p "이 prod 클러스터가 맞으면 yes를 입력하세요: " confirmation
if [[ "${confirmation}" != "yes" ]]; then
  echo "생성을 취소했습니다." >&2
  exit 1
fi

temporary_dir="$(mktemp -d)"
plain_secret_file="${temporary_dir}/rabbitmq-secret.yaml"
sealed_secret_file="${temporary_dir}/sealed-rabbitmq-secret.yaml"
chmod 700 "${temporary_dir}"

cleanup() {
  unset rabbitmq_password
  rm -f "${plain_secret_file}" "${sealed_secret_file}"
  rmdir "${temporary_dir}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

rabbitmq_password="$(openssl rand -base64 48 | tr -d '\n')"

kubectl create secret generic "${SECRET_NAME}" \
  --namespace "${NAMESPACE}" \
  --from-literal=RABBITMQ_USERNAME=selfintro \
  --from-literal=RABBITMQ_PASSWORD="${rabbitmq_password}" \
  --dry-run=client \
  --output=yaml > "${plain_secret_file}"
chmod 600 "${plain_secret_file}"

kubeseal \
  --format yaml \
  --namespace "${NAMESPACE}" \
  --name "${SECRET_NAME}" \
  < "${plain_secret_file}" > "${sealed_secret_file}"

encrypted_keys="$(awk '
  /^  encryptedData:/ { in_encrypted_data = 1; next }
  in_encrypted_data && /^    [A-Za-z0-9_]+:/ {
    key = $1
    sub(/:$/, "", key)
    print key
    next
  }
  in_encrypted_data && !/^    / { exit }
' "${sealed_secret_file}" | sort | tr '\n' ' ' | sed 's/ $//')"

expected_keys="RABBITMQ_PASSWORD RABBITMQ_USERNAME"
if [[ "${encrypted_keys}" != "${expected_keys}" ]]; then
  echo "예상하지 않은 encryptedData 키 구성입니다." >&2
  exit 1
fi

install -m 600 "${sealed_secret_file}" "${OUTPUT_FILE}"

echo "생성 완료: ${OUTPUT_FILE}"
echo "평문 자격 증명은 저장하지 않았습니다. 이 파일의 encryptedData만 Git에 포함합니다."
