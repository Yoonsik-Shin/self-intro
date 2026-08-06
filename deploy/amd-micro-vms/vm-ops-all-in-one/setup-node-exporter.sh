#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo " Prometheus Node Exporter Installation"
echo "=================================================="

VERSION="1.7.0"
ARCH="amd64"
TAR_FILE="node_exporter-${VERSION}.linux-${ARCH}.tar.gz"
DOWNLOAD_URL="https://github.com/prometheus/node_exporter/releases/download/v${VERSION}/${TAR_FILE}"

echo "[1/3] Downloading Node Exporter v${VERSION}..."
curl -fsSL -O "$DOWNLOAD_URL"
tar -xzf "$TAR_FILE"

echo "[2/3] Installing binary and creating user..."
sudo useradd --no-create-home --shell /bin/false node_exporter || true
sudo cp "node_exporter-${VERSION}.linux-${ARCH}/node_exporter" /usr/local/bin/
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter

rm -rf "$TAR_FILE" "node_exporter-${VERSION}.linux-${ARCH}"

echo "[3/3] Setting up Systemd service..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sudo cp "${SCRIPT_DIR}/node-exporter.service" /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now node-exporter

echo "=================================================="
echo " Node Exporter installed and started successfully!"
echo " Status: sudo systemctl status node-exporter"
echo " Metrics endpoint: http://localhost:9100/metrics"
echo "=================================================="
