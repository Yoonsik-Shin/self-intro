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
EXISTING_INTERNAL_WORKER_TOKEN=$(kubectl get secret ${SECRET_NAME} -n ${NAMESPACE} -o jsonpath='{.data.INTERNAL_WORKER_TOKEN}' 2>/dev/null | base64 -d || echo "")

KAKAO_KEY="${KAKAO_REST_API_KEY:-$EXISTING_KAKAO}"
NVIDIA_KEY="${NVIDIA_API_KEY:-$EXISTING_NVIDIA}"
INTERNAL_TOKEN="${INTERNAL_WORKER_TOKEN:-$EXISTING_INTERNAL_WORKER_TOKEN}"
ANTHROPIC_KEY="${ANTHROPIC_API_KEY:-}"
GEMINI_KEY="${GEMINI_API_KEY:-}"
OPENAI_KEY="${OPENAI_API_KEY:-}"

MISSING=""
[ -z "$ANTHROPIC_KEY" ] && MISSING="${MISSING} ANTHROPIC_API_KEY"
[ -z "$GEMINI_KEY" ] && MISSING="${MISSING} GEMINI_API_KEY"
[ -z "$OPENAI_KEY" ] && MISSING="${MISSING} OPENAI_API_KEY"
[ -z "$KAKAO_KEY" ] && MISSING="${MISSING} KAKAO_REST_API_KEY"
[ -z "$NVIDIA_KEY" ] && MISSING="${MISSING} NVIDIA_API_KEY"
[ -z "$INTERNAL_TOKEN" ] && MISSING="${MISSING} INTERNAL_WORKER_TOKEN"

if [ -n "$MISSING" ]; then
    echo "❌ 값이 비어 있습니다:${MISSING}"
    echo "   export 후 같은 셸에서 이 스크립트를 실행하세요."
    exit 1
fi

kubectl create secret generic ${SECRET_NAME} \
  --namespace=${NAMESPACE} \
  --from-literal=NVIDIA_API_KEY="${NVIDIA_KEY}" \
  --from-literal=INTERNAL_WORKER_TOKEN="${INTERNAL_TOKEN}" \
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
