#!/bin/bash
# 이 스크립트는 OKE 클러스터의 mysqld-exporter-secret을 가져와 SealedSecret으로 암호화합니다.
# 사전 작업: 아래 커맨드로 먼저 클러스터에 평문 시크릿을 생성해야 합니다.
#
#   kubectl create secret generic mysqld-exporter-secret \
#     -n self-intro \
#     --from-literal=.my.cnf="$(cat <<'CNF'
#   [client]
#   user=<monitoring 전용 계정, root 재사용 금지>
#   password=<비밀번호>
#   host=<backend-db-secret의 DB_URL과 동일한 prod MySQL 호스트>
#   port=3306
#   CNF
#   )"
#
# monitoring 계정은 최소 권한으로 새로 만들 것:
#   CREATE USER 'monitoring'@'%' IDENTIFIED BY '<비밀번호>';
#   GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'monitoring'@'%';

NAMESPACE="self-intro"
SECRET_NAME="mysqld-exporter-secret"
OUTPUT_FILE="deploy/k8s/overlays/prod/mysql-exporter/sealed-secret.yaml"

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
echo "  git commit -m \"deploy: add sealed mysqld-exporter secret\""
echo "  git push"
