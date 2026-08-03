#!/bin/bash
# 이 스크립트는 OKE 클러스터의 oracledb-exporter-secret을 가져와 SealedSecret으로 암호화합니다.
# 사전 작업 1: ATP DB에 모니터링 전용 계정 생성 (worker 앱 계정 재사용 금지)
#   CREATE USER monitoring IDENTIFIED BY "<비밀번호>";
#   GRANT CREATE SESSION TO monitoring;
#   GRANT SELECT_CATALOG_ROLE TO monitoring;
#
# 사전 작업 2: TNS 별칭 확인 (기존 oracle-atp-worker-wallet 시크릿의 tnsnames.ora 안에 있음)
#   kubectl get secret oracle-atp-worker-wallet -n self-intro -o jsonpath='{.data.tnsnames\.ora}' \
#     | base64 -d | grep -o '^[A-Za-z0-9_]*_high'
#   보통 "<db이름>_high" / "_medium" / "_low" 세 개 중 하나 (_high 권장)
#
# 사전 작업 3: 클러스터에 평문 시크릿 생성 (DATA_SOURCE_NAME 포맷: user/password@TNS별칭)
#   kubectl create secret generic oracledb-exporter-secret \
#     -n self-intro \
#     --from-literal=DATA_SOURCE_NAME='monitoring/<비밀번호>@<TNS별칭>'

NAMESPACE="self-intro"
SECRET_NAME="oracledb-exporter-secret"
OUTPUT_FILE="deploy/k8s/overlays/prod/oracle-exporter/sealed-secret.yaml"

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
echo "  git commit -m \"deploy: add sealed oracledb-exporter secret\""
echo "  git push"
