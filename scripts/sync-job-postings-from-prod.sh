#!/usr/bin/env bash
# 프로덕션 MySQL(HeatWave)의 지원공고 관련 데이터만 로컬 Docker Compose DB (mysql_data 볼륨)로 동기화한다.
# 사용법: ./scripts/sync-job-postings-from-prod.sh

set -euo pipefail

NAMESPACE="self-intro"
SECRET_NAME="backend-db-secret"
DUMP_POD="prod-db-dump-tmp"
MYSQL_IMAGE="docker.io/library/mysql:8.0"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYNC_DIR="$REPO_ROOT/.local-db-dump"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
PROD_DATA_DUMP="$SYNC_DIR/prod_job_postings_$TIMESTAMP.sql"
LOCAL_BACKUP="$SYNC_DIR/local_job_postings_before_sync_$TIMESTAMP.sql"

JOB_POSTING_TABLES=(
  job_posting
  job_posting_cover_letter_item
  job_posting_setting
  job_posting_source_url
  job_posting_status_event
)

mkdir -p "$SYNC_DIR"

echo "==> [1/6] kubectl context 확인: $(kubectl config current-context)"
echo "==> 운영 환경에서 지원공고 관련 테이블 ${#JOB_POSTING_TABLES[@]}개를 가져옵니다."
echo "    대상 테이블: ${JOB_POSTING_TABLES[*]}"

cleanup() {
  echo "==> 임시 Pod 정리 중..."
  kubectl delete pod "$DUMP_POD" -n "$NAMESPACE" --ignore-not-found >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> [2/6] 기존 임시 Pod 정리 및 생성"
kubectl delete pod "$DUMP_POD" -n "$NAMESPACE" --ignore-not-found >/dev/null

kubectl run "$DUMP_POD" \
  --image="$MYSQL_IMAGE" \
  --restart=Never \
  -n "$NAMESPACE" \
  --overrides="$(printf '{"apiVersion":"v1","spec":{"containers":[{"name":"%s","image":"%s","command":["sleep","600"],"envFrom":[{"secretRef":{"name":"%s"}}]}]}}' "$DUMP_POD" "$MYSQL_IMAGE" "$SECRET_NAME")" \
  >/dev/null

kubectl wait --for=condition=Ready "pod/$DUMP_POD" -n "$NAMESPACE" --timeout=120s

echo "==> [3/6] 운영 지원공고 데이터 덤프 진행"
kubectl exec -n "$NAMESPACE" "$DUMP_POD" -- sh -c '
  HOST=$(echo "$DB_URL" | sed -E "s#jdbc:mysql://([^:/]+).*#\1#")
  PORT=$(echo "$DB_URL" | sed -E "s#jdbc:mysql://[^:]+:([0-9]+).*#\1#")
  MYSQL_PWD="$DB_PASSWORD" mysqldump \
    --host="$HOST" \
    --port="$PORT" \
    --user="$DB_USERNAME" \
    --default-character-set=utf8mb4 \
    --no-create-info \
    --complete-insert \
    --insert-ignore \
    --no-tablespaces \
    --set-gtid-purged=OFF \
    --single-transaction \
    --quick \
    --hex-blob \
    --skip-add-locks \
    --skip-lock-tables \
    --skip-triggers \
    self_intro "$@"
' sh "${JOB_POSTING_TABLES[@]}" > "$PROD_DATA_DUMP"

PROD_DUMP_LINES=$(wc -l < "$PROD_DATA_DUMP")
echo "==> 운영 지원공고 덤프 완료: $PROD_DATA_DUMP ($PROD_DUMP_LINES lines)"

echo "==> [4/6] 로컬 DB의 기존 지원공고 데이터 백업"
docker exec self-intro-db sh -c \
  'MYSQL_PWD=root mysqldump --user=root --default-character-set=utf8mb4 --no-tablespaces --single-transaction --skip-triggers self_intro job_posting job_posting_cover_letter_item job_posting_setting job_posting_source_url job_posting_status_event 2>/dev/null || true' \
  > "$LOCAL_BACKUP"
echo "==> 로컬 백업 완료: $LOCAL_BACKUP"

echo "==> [5/6] 로컬 지원공고 테이블 데이터 비우기 및 운영 데이터 복원 (docker-compose volume: mysql_data)"
DELETE_SQL="SET FOREIGN_KEY_CHECKS=0;"
for table in "${JOB_POSTING_TABLES[@]}"; do
  DELETE_SQL+="DELETE FROM \`$table\`;"
done
DELETE_SQL+="SET FOREIGN_KEY_CHECKS=1;"

docker exec self-intro-db sh -c \
  'MYSQL_PWD=root mysql --user=root self_intro --execute="$1"' sh "$DELETE_SQL"

docker exec -i self-intro-db sh -c \
  'MYSQL_PWD=root mysql --user=root --default-character-set=utf8mb4 self_intro' \
  < "$PROD_DATA_DUMP"

echo "==> [6/6] 복사 완료 및 데이터 건수 확인"
docker exec self-intro-db sh -c 'MYSQL_PWD=root mysql --user=root self_intro --table --execute="
  SELECT '\''job_posting'\'' AS \`table_name\`, COUNT(*) AS \`count\` FROM job_posting
  UNION ALL
  SELECT '\''job_posting_setting'\'', COUNT(*) FROM job_posting_setting
  UNION ALL
  SELECT '\''job_posting_cover_letter_item'\'', COUNT(*) FROM job_posting_cover_letter_item
  UNION ALL
  SELECT '\''job_posting_source_url'\'', COUNT(*) FROM job_posting_source_url
  UNION ALL
  SELECT '\''job_posting_status_event'\'', COUNT(*) FROM job_posting_status_event;
"'

echo "==> 동기화가 성공적으로 완료되었습니다!"
