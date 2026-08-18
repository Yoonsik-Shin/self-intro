#!/usr/bin/env bash
set -euo pipefail

# OCI Bastion 포트포워딩 세션 생성 + SSH 터널 자동 오픈.
# 3시간(세션 최대 TTL)마다 만료되므로, 만료되면 이 스크립트 다시 실행하면 됨.

OCI_PROFILE="self-intro-api-key"
BASTION_ID="${BASTION_ID:?BASTION_ID 환경변수 설정 필요 (콘솔에서 만든 Bastion의 OCID)}"
TARGET_IP="10.0.30.142"
TARGET_PORT="3306"
LOCAL_PORT="${LOCAL_PORT:-13306}"
SSH_PRIVATE_KEY="${SSH_PRIVATE_KEY:-$HOME/.ssh/id_rsa}"
SSH_PUBLIC_KEY="${SSH_PUBLIC_KEY:-${SSH_PRIVATE_KEY}.pub}"
SESSION_TTL_SECONDS=10800  # 3시간, OCI 상한값

if [[ ! -f "$SSH_PUBLIC_KEY" ]]; then
  echo "SSH 공개키 없음: $SSH_PUBLIC_KEY (ssh-keygen으로 먼저 생성)" >&2
  exit 1
fi

echo "[1/2] Bastion 세션 생성 중..."

SESSION_ID="$(oci bastion session create-port-forwarding \
  --profile "$OCI_PROFILE" \
  --auth api_key \
  --bastion-id "$BASTION_ID" \
  --display-name "mysql-tunnel-$(date +%s)" \
  --session-ttl "$SESSION_TTL_SECONDS" \
  --ssh-public-key-file "$SSH_PUBLIC_KEY" \
  --target-private-ip "$TARGET_IP" \
  --target-port "$TARGET_PORT" \
  --wait-for-state SUCCEEDED \
  | jq -r '.data.resources[0].identifier')"

echo "세션 OCID: $SESSION_ID"

echo "세션 ACTIVE 대기 중..."
for _ in $(seq 1 15); do
  STATE="$(oci bastion session get --profile "$OCI_PROFILE" --auth api_key \
    --session-id "$SESSION_ID" --query "data.\"lifecycle-state\"" --raw-output)"
  [[ "$STATE" == "ACTIVE" ]] && break
  sleep 2
done
sleep 5  # ACTIVE 직후에도 SSH 백엔드 반영까지 약간 지연 있음

REGION="$(grep '^region' ~/.oci/config | head -1 | cut -d= -f2)"
BASTION_ENDPOINT="host.bastion.${REGION}.oci.oraclecloud.com"

echo "[2/2] SSH 터널 오픈 (localhost:${LOCAL_PORT} -> ${TARGET_IP}:${TARGET_PORT})"
echo "종료하려면 Ctrl+C"

# ACTIVE 상태 직후에도 간헐적으로 publickey denied 뜸(백엔드 반영 지연) -> 짧게 재시도
for attempt in 1 2 3 4 5; do
  ssh -i "$SSH_PRIVATE_KEY" \
    -N -L "${LOCAL_PORT}:${TARGET_IP}:${TARGET_PORT}" \
    -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=10 \
    -p 22 "${SESSION_ID}@${BASTION_ENDPOINT}" && break
  echo "연결 실패, 재시도 (${attempt}/5)..."
  sleep 3
done
