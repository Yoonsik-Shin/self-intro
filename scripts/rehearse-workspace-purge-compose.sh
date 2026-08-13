#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
SOURCE_DATABASE="self_intro"
CLONE_DATABASE="self_intro_purge_rehearsal_$(date +%Y%m%d%H%M%S)_$$"
TEMP_DIR="$(mktemp -d /private/tmp/self-intro-purge-rehearsal.XXXXXX)"
BACKUP_FILE="$TEMP_DIR/source.sql"
BUCKET_SUFFIX="$(date +%s)-$$"
PUBLIC_BUCKET="selfintro-rehearsal-${BUCKET_SUFFIX}-p"
PRIVATE_BUCKET="selfintro-rehearsal-${BUCKET_SUFFIX}-r"

if [[ ! "$CLONE_DATABASE" =~ ^self_intro_purge_rehearsal_[0-9_]+$ ]]; then
  echo "FAIL: unsafe clone database name" >&2
  exit 1
fi
if [[ "$TEMP_DIR" != /private/tmp/self-intro-purge-rehearsal.* ]]; then
  echo "FAIL: unsafe temporary directory" >&2
  exit 1
fi

cleanup() {
  docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T backend-db sh -lc \
    'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "DROP DATABASE IF EXISTS '$CLONE_DATABASE'"' \
    >/dev/null 2>&1 || true
  docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T redis redis-cli -n 15 FLUSHDB \
    >/dev/null 2>&1 || true
  rm -rf -- "$TEMP_DIR"
}
trap cleanup EXIT

mysql_scalar() {
  local database="$1"
  local query="$2"
  docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T backend-db sh -lc \
    'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -N -B -uroot "$1" -e "$2"' \
    _ "$database" "$query"
}

echo "==> Checking isolated Compose dependencies"
docker compose -f "$PROJECT_ROOT/docker-compose.yml" up -d \
  backend-db redis minio nosql oracle-vector-db rabbitmq >/dev/null

echo "==> Creating a transaction-consistent MySQL backup"
docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T backend-db sh -lc \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --default-character-set=utf8mb4 \
    --single-transaction --quick --routines --triggers --events --hex-blob \
    --set-gtid-purged=OFF --no-tablespaces self_intro' >"$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"
test -s "$BACKUP_FILE"

echo "==> Restoring the backup into a disposable clone database"
docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T backend-db sh -lc \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "CREATE DATABASE '$CLONE_DATABASE' \
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"'
docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T backend-db sh -lc \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot '"$CLONE_DATABASE" <"$BACKUP_FILE"

SOURCE_TABLES="$(mysql_scalar "$SOURCE_DATABASE" \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$SOURCE_DATABASE'")"
CLONE_TABLES="$(mysql_scalar "$CLONE_DATABASE" \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$CLONE_DATABASE'")"
SOURCE_MIGRATIONS="$(mysql_scalar "$SOURCE_DATABASE" \
  "SELECT COUNT(*) FROM flyway_schema_history WHERE success=1")"
CLONE_MIGRATIONS="$(mysql_scalar "$CLONE_DATABASE" \
  "SELECT COUNT(*) FROM flyway_schema_history WHERE success=1")"
SOURCE_WORKSPACES="$(mysql_scalar "$SOURCE_DATABASE" "SELECT COUNT(*) FROM workspace")"
CLONE_WORKSPACES="$(mysql_scalar "$CLONE_DATABASE" "SELECT COUNT(*) FROM workspace")"

[[ "$SOURCE_TABLES" == "$CLONE_TABLES" ]] || {
  echo "FAIL: restored table count mismatch" >&2
  exit 1
}
[[ "$SOURCE_MIGRATIONS" == "$CLONE_MIGRATIONS" ]] || {
  echo "FAIL: restored Flyway history mismatch" >&2
  exit 1
}
[[ "$SOURCE_WORKSPACES" == "$CLONE_WORKSPACES" ]] || {
  echo "FAIL: restored Workspace count mismatch" >&2
  exit 1
}
echo "PASS: backup clone restored (tables=$CLONE_TABLES, migrations=$CLONE_MIGRATIONS, workspaces=$CLONE_WORKSPACES)"

echo "==> Clearing dedicated Redis rehearsal DB 15"
docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T redis redis-cli -n 15 FLUSHDB \
  >/dev/null

echo "==> Running the full five-checkpoint purge against isolated fixtures"
(
  cd "$BACKEND_DIR"
  RUN_WORKSPACE_PURGE_REHEARSAL=true \
  MYSQL_DB_URL="jdbc:mysql://localhost:3306/$CLONE_DATABASE?serverTimezone=Asia/Seoul&characterEncoding=UTF-8" \
  MYSQL_DB_USERNAME=root \
  MYSQL_DB_PASSWORD=root \
  MYSQL_DB_DRIVER=com.mysql.cj.jdbc.Driver \
  JPA_DDL_AUTO=validate \
  DB_URL="jdbc:oracle:thin:@//localhost:1522/FREEPDB1" \
  DB_USERNAME=self_intro_vector \
  DB_PASSWORD=self_intro_vector_local \
  DB_DRIVER=oracle.jdbc.OracleDriver \
  REDIS_HOST=localhost \
  REDIS_PORT=6379 \
  STORAGE_ENDPOINT=http://localhost:9000 \
  STORAGE_PRESIGNED_ENDPOINT=http://localhost:9000 \
  STORAGE_BUCKET="$PUBLIC_BUCKET" \
  STORAGE_PRIVATE_BUCKET="$PRIVATE_BUCKET" \
  STORAGE_ACCESS_KEY=minioadmin \
  STORAGE_SECRET_KEY=minioadmin \
  STORAGE_PATH_STYLE_ACCESS=true \
  STORAGE_PUBLIC_BASE_URL="http://localhost:9000/$PUBLIC_BUCKET" \
  ORACLE_NOSQL_ENABLED=true \
  ORACLE_NOSQL_MODE=local \
  ORACLE_NOSQL_ENDPOINT=http://localhost:8090 \
  ORACLE_NOSQL_TABLE=JobPostingCatalogReadModel \
  RABBITMQ_HOST=localhost \
  BOOTSTRAP_ADMIN_ENABLED=false \
  REGISTRATION_EMAIL_ENABLED=false \
  ./gradlew :ai-worker:test \
    --tests 'com.selfintro.identity.WorkspacePurgeFullRehearsalIntegrationTest'
)

echo "PASS: restored clone full purge rehearsal completed"
