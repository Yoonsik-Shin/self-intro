#!/bin/bash
# OKE 클러스터 배포용 SealedSecret (backend-ai-secret) 생성 스크립트

NAMESPACE="self-intro"
SECRET_NAME="backend-ai-secret"
OUTPUT_FILE="deploy/k8s/overlays/prod/backend/sealed-ai-secret.yaml"

if ! command -v kubeseal &> /dev/null; then
    echo "⚠️ 'kubeseal' CLI가 설치되어 있지 않습니다. (brew install kubeseal)"
    exit 1
fi

echo "🔒 OKE 클러스터 배포를 위한 backend-ai-secret SealedSecret 생성 중..."

# 기존 클러스터에서 KAKAO_REST_API_KEY 및 NVIDIA_API_KEY 디코딩
EXISTING_KAKAO=$(kubectl get secret ${SECRET_NAME} -n ${NAMESPACE} -o jsonpath='{.data.KAKAO_REST_API_KEY}' 2>/dev/null | base64 -d || echo "")
EXISTING_NVIDIA=$(kubectl get secret ${SECRET_NAME} -n ${NAMESPACE} -o jsonpath='{.data.NVIDIA_API_KEY}' 2>/dev/null | base64 -d || echo "")

KAKAO_KEY="${KAKAO_REST_API_KEY:-$EXISTING_KAKAO}"
NVIDIA_KEY="${NVIDIA_API_KEY:-$EXISTING_NVIDIA}"
ANTHROPIC_KEY="${ANTHROPIC_API_KEY:-}"
GEMINI_KEY="${GEMINI_API_KEY:-}"
OPENAI_KEY="${OPENAI_API_KEY:-}"

kubectl create secret generic ${SECRET_NAME} \
  --namespace=${NAMESPACE} \
  --from-literal=NVIDIA_API_KEY="${NVIDIA_KEY}" \
  --from-literal=KAKAO_REST_API_KEY="${KAKAO_KEY}" \
  --from-literal=ANTHROPIC_API_KEY="${ANTHROPIC_KEY}" \
  --from-literal=GEMINI_API_KEY="${GEMINI_KEY}" \
  --from-literal=OPENAI_API_KEY="${OPENAI_KEY}" \
  --dry-run=client -o yaml | \
  kubeseal --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system \
  --format=yaml > ${OUTPUT_FILE}

echo "----------------------------------------"
echo "✅ 배포용 SealedSecret 파일이 생성되었습니다: ${OUTPUT_FILE}"
