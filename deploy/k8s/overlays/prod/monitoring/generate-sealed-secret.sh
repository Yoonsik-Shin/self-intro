#!/bin/bash
# 이 스크립트는 OKE 클러스터의 grafana-admin-secret을 가져와 SealedSecret으로 암호화합니다.
# 먼저 클러스터에 원본 Secret을 만들어야 합니다:
#   kubectl create secret generic grafana-admin-secret \
#     --from-literal=GF_SECURITY_ADMIN_USER='<새 아이디>' \
#     --from-literal=GF_SECURITY_ADMIN_PASSWORD='<새 비밀번호>' \
#     -n self-intro

NAMESPACE="self-intro"
SECRET_NAME="grafana-admin-secret"
OUTPUT_FILE="deploy/k8s/overlays/prod/monitoring/sealed-grafana-secret.yaml"

if ! command -v kubeseal &> /dev/null; then
    echo "⚠️ 'kubeseal' CLI가 설치되어 있지 않습니다."
    echo "설치를 위해 다음 명령어를 로컬 터미널에서 실행해 주세요:"
    echo "  brew install kubeseal"
    exit 1
fi

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
echo "  git commit -m \"deploy: add sealed grafana admin secret\""
echo "  git push"
