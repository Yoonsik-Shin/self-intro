#!/usr/bin/env bash
set -euo pipefail

# ==================================================
# OCI MySQL HeatWave Automated Backup Script
# ==================================================

# Configuration
BACKUP_DIR="/tmp/db_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/self_intro_backup_${TIMESTAMP}.sql.gz"
OCI_BUCKET_NAME="${OCI_BUCKET_NAME:-db-backup-bucket}"

# DB Credentials (read from environment or default placeholders)
DB_HOST="${DB_HOST:-10.0.0.100}"
DB_USER="${DB_USER:-self_intro}"
DB_PASS="${DB_PASS:-your_db_password}"
DB_NAME="${DB_NAME:-self_intro}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting DB dump for database: ${DB_NAME}..."

# 1. Perform mysqldump and gzip
mysqldump --host="$DB_HOST" \
          --user="$DB_USER" \
          --password="$DB_PASS" \
          --single-transaction \
          --quick \
          --lock-tables=false \
          "$DB_NAME" | gzip -9 > "$BACKUP_FILE"

echo "[$(date)] DB Dump complete: ${BACKUP_FILE} ($(du -h "$BACKUP_FILE" | cut -f1))"

# 2. Upload to OCI Object Storage (if oci CLI is configured)
if command -v oci &> /dev/null; then
    echo "[$(date)] Uploading to OCI Object Storage bucket: ${OCI_BUCKET_NAME}..."
    oci os object put \
        --bucket-name "$OCI_BUCKET_NAME" \
        --file "$BACKUP_FILE" \
        --name "$(basename "$BACKUP_FILE")" \
        --force
    echo "[$(date)] Upload completed successfully."
else
    echo "[$(date)] WARNING: OCI CLI not found. Local backup file saved at ${BACKUP_FILE}."
fi

# 3. Clean up local backups older than 7 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -exec rm -f {} \;
echo "[$(date)] Cleanup of old local backups complete."
