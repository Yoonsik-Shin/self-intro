#!/bin/bash
# 이 스크립트는 OKE 클러스터의 backend-kofi-secret을 가져와 SealedSecret으로 암호화합니다.
# 먼저 클러스터에 raw Secret이 존재해야 합니다 (아래 "사전 준비" 참고).

NAMESPACE="self-intro"
SECRET_NAME="backend-kofi-secret"
OUTPUT_FILE="deploy/k8s/overlays/prod/backend/sealed-kofi-secret.yaml"

# 사전 준비: Ko-fi 개발자 설정(Developer API)의 Verification Token 값으로
# 클러스터에 raw Secret을 먼저 생성하세요.
#   kubectl create secret generic backend-kofi-secret -n self-intro \
#     --from-literal=KOFI_VERIFICATION_TOKEN='<Verification Token 문자열>'
#
# 생성 후에는 kustomization.yaml의 resources에 sealed-kofi-secret.yaml을 추가하세요.

# 1. kubeseal 설치 체크
if ! command -v kubeseal &> /dev/null; then
    echo "⚠️ 'kubeseal' CLI가 설치되어 있지 않습니다."
    echo "설치를 위해 다음 명령어를 로컬 터미널에서 실행해 주세요:"
    echo "  brew install kubeseal"
    exit 1
fi

# 2. 클러스터 시크릿 정보 암호화
echo "🔒 클러스터에서 '${SECRET_NAME}'을(를) 가져와 암호화 중..."
kubectl get secret ${SECRET_NAME} -n ${NAMESPACE} -o yaml | \
  kubeseal --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system \
  --format=yaml > ${OUTPUT_FILE}

echo "----------------------------------------"
echo "✅ SealedSecret 파일이 생성되었습니다: ${OUTPUT_FILE}"
echo "이제 이 파일을 안전하게 Git에 추가하여 커밋하고 푸시할 수 있습니다!"
echo "명령어:"
echo "  git add ${OUTPUT_FILE}"
echo "  git commit -m \"deploy: add sealed kofi secret\""
echo "  git push"
