#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo " OCI AMD Micro VM - Bastion & Tailscale Setup"
echo "=================================================="

# 1. System package update
echo "[1/4] Updating system packages & installing fail2ban..."
sudo apt update && sudo apt install -y fail2ban curl ufw

# 2. SSH Security Configuration
SSH_PORT=2222
SSHD_CONFIG="/etc/ssh/sshd_config"

echo "[2/4] Securing SSH on port ${SSH_PORT}..."
if [ -f "$SSHD_CONFIG" ]; then
    sudo cp "$SSHD_CONFIG" "${SSHD_CONFIG}.bak"
    sudo sed -i "s/^#\?Port .*/Port ${SSH_PORT}/" "$SSHD_CONFIG"
    sudo sed -i "s/^#\?PasswordAuthentication .*/PasswordAuthentication no/" "$SSHD_CONFIG"
    sudo sed -i "s/^#\?PermitRootLogin .*/PermitRootLogin no/" "$SSHD_CONFIG"
    sudo systemctl restart ssh || sudo systemctl restart sshd
    echo " -> SSH config updated: Port ${SSH_PORT}, PasswordAuth=no"
fi

# Configure Fail2ban
sudo tee /etc/fail2ban/jail.local > /dev/null <<'EOF'
[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 86400
findtime = 600
EOF

sudo systemctl restart fail2ban
echo " -> Fail2ban enabled for SSH port ${SSH_PORT}"

# 3. Install Tailscale VPN
echo "[3/4] Installing Tailscale VPN..."
curl -fsSL https://tailscale.com/install.sh | sh

echo "[4/4] Tailscale installation complete."
echo "--------------------------------------------------"
echo " To complete Tailscale login, run:"
echo "   sudo tailscale up"
echo "=================================================="
