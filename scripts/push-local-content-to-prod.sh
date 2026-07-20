#!/usr/bin/env bash
# 로컬 최신 스키마의 콘텐츠 데이터를 프로덕션 MySQL(HeatWave)로 밀어넣는다.
# scripts/sync-prod-db.sh(운영→로컬)의 반대 방향.
# 사용법: ./scripts/push-local-content-to-prod.sh
#
# 전제: 이 스크립트를 실행하기 전, 코드(마이그레이션 포함)를 먼저 push해서
#       운영 백엔드가 최신 이미지로 배포되고 V25~V30 마이그레이션이 이미
#       운영 DB에 적용되어 있어야 한다. 이 스크립트는 스키마를 바꾸지 않고,
#       그 스키마 위에 로컬에서 admin으로 편집한 콘텐츠 데이터만 복제한다.
#
# 보존 (건드리지 않음):
#   - 운영 Flyway 이력, 운영 전용 인프라 설정
#   - visitor_daily_visit / visitor_hourly_visit 방문자 통계
#
# 교체 (로컬 -> 운영, 전체 삭제 후 재삽입):
#   - 프로필, 스킬, 경력/프로젝트(career, project, experience*), 역량, Study,
#     아키텍처 콘텐츠, 핵심 프로젝트 편성(experience_placement*)

set -euo pipefail

NAMESPACE="self-intro"
SECRET_NAME="backend-db-secret"
DEPLOYMENT="self-intro-backend"
DUMP_POD="local-content-push-tmp"
MYSQL_IMAGE="docker.io/library/mysql:8.0"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYNC_DIR="$REPO_ROOT/.local-db-dump"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
LOCAL_CONTENT_DUMP="$SYNC_DIR/local_content_$TIMESTAMP.sql"
PROD_FULL_BACKUP="$SYNC_DIR/prod_before_push_$TIMESTAMP.sql"

# 운영 스키마에 존재하는 콘텐츠 테이블 전체. visitor_* 통계와
# flyway_schema_history는 의도적으로 제외한다.
CONTENT_TABLES=(
  architecture_overview
  architecture_layer
  architecture_layer_item
  career
  certificate
  competency
  competency_evidence
  competency_skill
  competency_study
  education
  experience
  experience_detail
  experience_detail_skill
  experience_image
  experience_placement
  experience_placement_detail
  experience_relation
  experience_skill
  experience_tag
  print_template
  profile
  project
  skill
  study
  study_category
  study_entry
  study_entry_skill
  study_experience
  study_experience_detail
  study_image
  study_relation
  study_skill
  study_tag
  tag
)

mkdir -p "$SYNC_DIR"

echo "==> kubectl context: $(kubectl config current-context)"
echo "==> 로컬 콘텐츠 테이블 ${#CONTENT_TABLES[@]}개를 운영으로 밀어넣습니다."
echo "==> visitor_* 통계 테이블과 Flyway 이력은 건드리지 않습니다."
echo "==> 먼저 운영 DB 전체를 백업한 뒤 진행하며, 실패 시 이 백업으로 복구할 수 있습니다."
echo
echo "!! 이 스크립트를 실행하기 전에:"
echo "   1. 코드(마이그레이션 포함)를 이미 push했고 운영 배포가 완료되었는지"
echo "   2. 운영 backend pod가 최신 이미지로 떠 있고 Flyway가 V30까지 적용됐는지"
echo "   위 두 가지를 먼저 확인하세요."
echo
read -r -p "로컬 콘텐츠로 운영 콘텐츠를 교체할까요? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "취소되었습니다."
  exit 1
fi

cleanup() {
  echo "==> 임시 Pod 정리 중"
  kubectl delete pod "$DUMP_POD" -n "$NAMESPACE" --ignore-not-found >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> 1/6 로컬 콘텐츠 덤프"
docker exec self-intro-db sh -c \
  "MYSQL_PWD=root mysqldump --user=root --default-character-set=utf8mb4 \
    --no-create-info --complete-insert --insert-ignore --no-tablespaces \
    --hex-blob --skip-add-locks --skip-lock-tables --skip-triggers \
    --single-transaction --quick self_intro $(printf '%q ' "${CONTENT_TABLES[@]}")" \
  > "$LOCAL_CONTENT_DUMP"

LOCAL_DUMP_LINES=$(wc -l < "$LOCAL_CONTENT_DUMP")
if [[ "$LOCAL_DUMP_LINES" -lt 10 ]]; then
  echo "!! 로컬 덤프가 비정상적으로 작습니다: $LOCAL_CONTENT_DUMP ($LOCAL_DUMP_LINES lines)"
  exit 1
fi
echo "==> 로컬 콘텐츠 덤프 완료: $LOCAL_CONTENT_DUMP ($LOCAL_DUMP_LINES lines)"

echo "==> 기존 임시 Pod 정리"
kubectl delete pod "$DUMP_POD" -n "$NAMESPACE" --ignore-not-found >/dev/null

echo "==> 운영 DB 접근용 임시 MySQL Pod 생성"
kubectl run "$DUMP_POD" \
  --image="$MYSQL_IMAGE" \
  --restart=Never \
  -n "$NAMESPACE" \
  --overrides="$(printf '{"apiVersion":"v1","spec":{"containers":[{"name":"%s","image":"%s","command":["sleep","1200"],"envFrom":[{"secretRef":{"name":"%s"}}]}]}}' "$DUMP_POD" "$MYSQL_IMAGE" "$SECRET_NAME")" \
  >/dev/null

kubectl wait --for=condition=Ready "pod/$DUMP_POD" -n "$NAMESPACE" --timeout=120s

echo "==> 2/6 운영 DB 전체 백업 (실패 시 복구용)"
kubectl exec -n "$NAMESPACE" "$DUMP_POD" -- sh -c '
  HOST=$(echo "$DB_URL" | sed -E "s#jdbc:mysql://([^:/]+).*#\1#")
  PORT=$(echo "$DB_URL" | sed -E "s#jdbc:mysql://[^:]+:([0-9]+).*#\1#")
  MYSQL_PWD="$DB_PASSWORD" mysqldump \
    --host="$HOST" --port="$PORT" --user="$DB_USERNAME" \
    --default-character-set=utf8mb4 --no-tablespaces \
    --single-transaction --quick --hex-blob --set-gtid-purged=OFF \
    --skip-lock-tables self_intro
' > "$PROD_FULL_BACKUP"

PROD_BACKUP_LINES=$(wc -l < "$PROD_FULL_BACKUP")
if [[ "$PROD_BACKUP_LINES" -lt 10 ]]; then
  echo "!! 운영 백업이 비정상적으로 작습니다: $PROD_FULL_BACKUP ($PROD_BACKUP_LINES lines)"
  exit 1
fi
echo "==> 운영 전체 백업 완료: $PROD_FULL_BACKUP ($PROD_BACKUP_LINES lines)"
echo "    문제가 생기면: kubectl exec -i -n $NAMESPACE <mysql-pod> -- mysql ... self_intro < $PROD_FULL_BACKUP"

echo "==> 3/6 운영 backend를 0으로 스케일 다운 (교체 중 불일치 요청 방지)"
kubectl scale deployment "$DEPLOYMENT" -n "$NAMESPACE" --replicas=0
kubectl wait --for=delete pod -l app.kubernetes.io/name="$DEPLOYMENT" -n "$NAMESPACE" --timeout=60s 2>/dev/null || true

echo "==> 4/6 운영 콘텐츠 테이블 비우기"
DELETE_SQL="SET FOREIGN_KEY_CHECKS=0;"
for table in "${CONTENT_TABLES[@]}"; do
  DELETE_SQL+="DELETE FROM \`$table\`;"
done
DELETE_SQL+="SET FOREIGN_KEY_CHECKS=1;"

kubectl exec -n "$NAMESPACE" "$DUMP_POD" -- sh -c '
  HOST=$(echo "$DB_URL" | sed -E "s#jdbc:mysql://([^:/]+).*#\1#")
  PORT=$(echo "$DB_URL" | sed -E "s#jdbc:mysql://[^:]+:([0-9]+).*#\1#")
  MYSQL_PWD="$DB_PASSWORD" mysql --host="$HOST" --port="$PORT" --user="$DB_USERNAME" self_intro --execute="$1"
' sh "$DELETE_SQL"

echo "==> 5/6 로컬 콘텐츠를 운영에 적재"
kubectl exec -i -n "$NAMESPACE" "$DUMP_POD" -- sh -c '
  HOST=$(echo "$DB_URL" | sed -E "s#jdbc:mysql://([^:/]+).*#\1#")
  PORT=$(echo "$DB_URL" | sed -E "s#jdbc:mysql://[^:]+:([0-9]+).*#\1#")
  MYSQL_PWD="$DB_PASSWORD" mysql --host="$HOST" --port="$PORT" --user="$DB_USERNAME" --default-character-set=utf8mb4 self_intro
' < "$LOCAL_CONTENT_DUMP"

echo "==> 6/6 운영 backend 재기동"
kubectl scale deployment "$DEPLOYMENT" -n "$NAMESPACE" --replicas=1
kubectl wait --for=condition=Available "deployment/$DEPLOYMENT" -n "$NAMESPACE" --timeout=180s

echo "==> 동기화 결과"
kubectl exec -n "$NAMESPACE" "$DUMP_POD" -- sh -c '
  HOST=$(echo "$DB_URL" | sed -E "s#jdbc:mysql://([^:/]+).*#\1#")
  PORT=$(echo "$DB_URL" | sed -E "s#jdbc:mysql://[^:]+:([0-9]+).*#\1#")
  MYSQL_PWD="$DB_PASSWORD" mysql --host="$HOST" --port="$PORT" --user="$DB_USERNAME" self_intro --table --execute="
    SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 3;
    SELECT type, COUNT(*) AS count FROM experience GROUP BY type ORDER BY type;
    SELECT placement_type, COUNT(*) AS count FROM experience_placement GROUP BY placement_type;
    SELECT COUNT(*) AS visitor_daily_rows_untouched FROM visitor_daily_visit;
  "
'

echo "==> 완료"
echo "    운영 전체 백업(복구용): $PROD_FULL_BACKUP"
echo "    푸시한 로컬 콘텐츠 덤프: $LOCAL_CONTENT_DUMP"
