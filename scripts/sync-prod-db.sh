#!/usr/bin/env bash
# 프로덕션 MySQL(HeatWave)의 콘텐츠 데이터만 로컬 최신 스키마로 동기화한다.
# 사용법: ./scripts/sync-prod-db.sh
#
# 보존:
#   - 로컬 Flyway 이력과 최신 스키마(V25 이후 포함)
#   - visitor_* 통계 데이터
#   - architecture_* 등 로컬 전용 테이블
#   - experience_placement와 experience_placement_detail 핵심 프로젝트 편성
#
# 교체:
#   - 프로필, 기술, 태그, 경험, Study, 역량 콘텐츠와 연결 데이터

set -euo pipefail

NAMESPACE="self-intro"
SECRET_NAME="backend-db-secret"
DUMP_POD="prod-db-dump-tmp"
MYSQL_IMAGE="docker.io/library/mysql:8.0"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYNC_DIR="$REPO_ROOT/.local-db-dump"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
PROD_DATA_DUMP="$SYNC_DIR/prod_content_$TIMESTAMP.sql"
LOCAL_FULL_BACKUP="$SYNC_DIR/local_before_sync_$TIMESTAMP.sql"
LOCAL_PLACEMENT_BACKUP="$SYNC_DIR/local_experience_placement_$TIMESTAMP.sql"

CONTENT_TABLES=(
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
  experience_relation
  experience_skill
  experience_tag
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
echo "==> 운영에서는 콘텐츠 테이블 ${#CONTENT_TABLES[@]}개만 가져옵니다."
echo "==> Flyway, visitor 통계, 로컬 전용 테이블과 핵심 프로젝트 편성은 가져오지 않습니다."
read -r -p "로컬 콘텐츠를 백업한 뒤 운영 콘텐츠로 교체할까요? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "취소되었습니다."
  exit 1
fi

cleanup() {
  echo "==> 임시 Pod 정리 중"
  kubectl delete pod "$DUMP_POD" -n "$NAMESPACE" --ignore-not-found >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> 기존 임시 Pod 정리"
kubectl delete pod "$DUMP_POD" -n "$NAMESPACE" --ignore-not-found >/dev/null

echo "==> 운영 DB 접근용 임시 MySQL Pod 생성"
kubectl run "$DUMP_POD" \
  --image="$MYSQL_IMAGE" \
  --restart=Never \
  -n "$NAMESPACE" \
  --overrides="$(printf '{"apiVersion":"v1","spec":{"containers":[{"name":"%s","image":"%s","command":["sleep","600"],"envFrom":[{"secretRef":{"name":"%s"}}]}]}}' "$DUMP_POD" "$MYSQL_IMAGE" "$SECRET_NAME")" \
  >/dev/null

kubectl wait --for=condition=Ready "pod/$DUMP_POD" -n "$NAMESPACE" --timeout=120s

echo "==> 운영 콘텐츠 데이터 덤프"
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
' sh "${CONTENT_TABLES[@]}" > "$PROD_DATA_DUMP"

PROD_DUMP_LINES=$(wc -l < "$PROD_DATA_DUMP")
if [[ "$PROD_DUMP_LINES" -lt 10 ]]; then
  echo "!! 운영 덤프가 비정상적으로 작습니다: $PROD_DATA_DUMP ($PROD_DUMP_LINES lines)"
  exit 1
fi
echo "==> 운영 콘텐츠 덤프 완료: $PROD_DATA_DUMP ($PROD_DUMP_LINES lines)"

echo "==> 현재 로컬 DB 전체 백업"
docker exec self-intro-db sh -c \
  'MYSQL_PWD=root mysqldump --user=root --default-character-set=utf8mb4 --no-tablespaces --single-transaction --routines --triggers self_intro' \
  > "$LOCAL_FULL_BACKUP"
echo "==> 로컬 복구용 백업: $LOCAL_FULL_BACKUP"

if docker exec self-intro-db sh -c \
  'MYSQL_PWD=root mysql --user=root -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\"self_intro\" AND table_name=\"experience_placement\""' \
  | grep -q '^1$'; then
  echo "==> 로컬 핵심 프로젝트 편성 별도 백업"
  docker exec self-intro-db sh -c \
    'MYSQL_PWD=root mysqldump --user=root --default-character-set=utf8mb4 --no-create-info --complete-insert --insert-ignore --skip-triggers self_intro experience_placement experience_placement_detail' \
    > "$LOCAL_PLACEMENT_BACKUP"
else
  : > "$LOCAL_PLACEMENT_BACKUP"
fi

echo "==> 백엔드 중지"
cd "$REPO_ROOT"
docker compose stop backend

DELETE_SQL="SET FOREIGN_KEY_CHECKS=0;DELETE FROM \`experience_placement\`;"
for table in "${CONTENT_TABLES[@]}"; do
  DELETE_SQL+="DELETE FROM \`$table\`;"
done
DELETE_SQL+="SET FOREIGN_KEY_CHECKS=1;"

echo "==> 로컬 콘텐츠 데이터 비우기"
docker exec self-intro-db sh -c \
  'MYSQL_PWD=root mysql --user=root self_intro --execute="$1"' sh "$DELETE_SQL"

echo "==> 운영 콘텐츠를 로컬 최신 스키마에 복원"
docker exec -i self-intro-db sh -c \
  'MYSQL_PWD=root mysql --user=root --default-character-set=utf8mb4 self_intro' \
  < "$PROD_DATA_DUMP"

if [[ -s "$LOCAL_PLACEMENT_BACKUP" ]]; then
  echo "==> 로컬 핵심 프로젝트 편성 복원"
  docker exec -i self-intro-db sh -c \
    'MYSQL_PWD=root mysql --user=root --default-character-set=utf8mb4 self_intro' \
    < "$LOCAL_PLACEMENT_BACKUP"
fi

echo "==> 가져온 경험에 존재하지 않는 편성 정리"
docker exec self-intro-db sh -c 'MYSQL_PWD=root mysql --user=root self_intro --execute="
  DELETE mapping
  FROM experience_placement_detail mapping
  LEFT JOIN experience_placement placement
    ON placement.id = mapping.placement_id
  LEFT JOIN experience_detail imported_detail
    ON imported_detail.id = mapping.experience_detail_id
  WHERE placement.id IS NULL OR imported_detail.id IS NULL;

  DELETE placement
  FROM experience_placement placement
  LEFT JOIN experience imported_experience
    ON imported_experience.id = placement.experience_id
  WHERE imported_experience.id IS NULL;
"'

echo "==> 편성 데이터가 없으면 가져온 경험 기준으로 초기화"
docker exec self-intro-db sh -c 'MYSQL_PWD=root mysql --user=root self_intro --execute="
  INSERT INTO experience_placement (
    experience_id, placement_type, display_order, enabled, created_at, updated_at
  )
  SELECT id, '\''CORE_PROJECT'\'', display_order, TRUE, NOW(), NOW()
  FROM experience
  WHERE type IN ('\''CAREER'\'', '\''PROJECT'\'')
    AND NOT EXISTS (SELECT 1 FROM experience_placement)
  ORDER BY display_order, id;
"'

echo "==> 백엔드 재기동"
docker compose up -d backend

echo "==> 백엔드 상태 대기"
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8080/actuator/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

curl -fsS http://127.0.0.1:8080/actuator/health >/dev/null

echo "==> 동기화 결과"
docker exec self-intro-db sh -c 'MYSQL_PWD=root mysql --user=root self_intro --table --execute="
  SELECT version, description, success
  FROM flyway_schema_history
  ORDER BY installed_rank DESC
  LIMIT 3;
  SELECT type, COUNT(*) AS count
  FROM experience
  GROUP BY type
  ORDER BY type;
  SELECT placement_type, COUNT(*) AS count
  FROM experience_placement
  GROUP BY placement_type;
"'

echo "==> 완료"
echo "    운영 콘텐츠: $PROD_DATA_DUMP"
echo "    동기화 전 로컬 전체 백업: $LOCAL_FULL_BACKUP"
