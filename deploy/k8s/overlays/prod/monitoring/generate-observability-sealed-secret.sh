#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_FILE="${SCRIPT_DIR}/sealed-observability-object-storage-secret.yaml"
NAMESPACE="self-intro"
SECRET_NAME="observability-object-storage-secret"

LOKI_BUCKET="self-intro-loki-prod"
TEMPO_BUCKET="self-intro-tempo-prod"
OCI_REGION="ap-chuncheon-1"
OCI_ENDPOINT="axrywc89b6lf.compat.objectstorage.ap-chuncheon-1.oraclecloud.com"

for command_name in kubectl kubeseal; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "필수 명령을 찾을 수 없습니다: ${command_name}" >&2
    exit 1
  fi
done

CURRENT_CONTEXT="$(kubectl config current-context)"
echo "SealedSecret 대상 Kubernetes context: ${CURRENT_CONTEXT}"
read -r -p "이 prod 클러스터가 맞으면 yes를 입력하세요: " CONFIRMATION
if [[ "${CONFIRMATION}" != "yes" ]]; then
  echo "취소했습니다. kubectl context를 확인한 뒤 다시 실행하세요." >&2
  exit 1
fi

read -r -s -p "OCI Customer Secret 액세스 키: " OCI_ACCESS_KEY
echo
read -r -s -p "OCI Customer Secret 비밀 키: " OCI_SECRET_KEY
echo

if [[ -z "${OCI_ACCESS_KEY}" || -z "${OCI_SECRET_KEY}" ]]; then
  echo "액세스 키와 비밀 키는 필수입니다." >&2
  exit 1
fi
if [[ "${OCI_ACCESS_KEY}" == *$'\n'* || "${OCI_SECRET_KEY}" == *$'\n'* ]]; then
  echo "키 값에는 줄바꿈을 포함할 수 없습니다." >&2
  exit 1
fi

TEMP_ENV_FILE="$(mktemp)"
TEMP_SEALED_FILE="$(mktemp)"
cleanup() {
  unset OCI_ACCESS_KEY OCI_SECRET_KEY
  rm -f "${TEMP_ENV_FILE}" "${TEMP_SEALED_FILE}"
}
trap cleanup EXIT
chmod 600 "${TEMP_ENV_FILE}"

{
  printf 'LOKI_S3_BUCKET=%s\n' "${LOKI_BUCKET}"
  printf 'TEMPO_S3_BUCKET=%s\n' "${TEMPO_BUCKET}"
  printf 'OCI_S3_ENDPOINT=%s\n' "${OCI_ENDPOINT}"
  printf 'OCI_S3_REGION=%s\n' "${OCI_REGION}"
  printf 'OCI_S3_ACCESS_KEY_ID=%s\n' "${OCI_ACCESS_KEY}"
  printf 'OCI_S3_SECRET_ACCESS_KEY=%s\n' "${OCI_SECRET_KEY}"
} > "${TEMP_ENV_FILE}"

kubectl create secret generic "${SECRET_NAME}" \
  --namespace "${NAMESPACE}" \
  --from-env-file="${TEMP_ENV_FILE}" \
  --dry-run=client \
  --output yaml \
  | kubeseal \
      --controller-name sealed-secrets-controller \
      --controller-namespace kube-system \
      --format yaml \
  > "${TEMP_SEALED_FILE}"

for key_name in \
  LOKI_S3_BUCKET \
  TEMPO_S3_BUCKET \
  OCI_S3_ENDPOINT \
  OCI_S3_REGION \
  OCI_S3_ACCESS_KEY_ID \
  OCI_S3_SECRET_ACCESS_KEY; do
  if ! grep -q "^    ${key_name}:" "${TEMP_SEALED_FILE}"; then
    echo "암호문에서 필수 키를 찾지 못했습니다: ${key_name}" >&2
    exit 1
  fi
done

mv "${TEMP_SEALED_FILE}" "${OUTPUT_FILE}"
chmod 600 "${OUTPUT_FILE}"
echo "생성 완료: ${OUTPUT_FILE}"
echo "평문 자격 증명은 저장하지 않았습니다. 이 파일의 encryptedData만 Git에 포함합니다."
