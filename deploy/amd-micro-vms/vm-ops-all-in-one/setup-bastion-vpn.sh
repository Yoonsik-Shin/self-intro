#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo " OCI AMD Micro VM - Bastion & Tailscale Setup"
echo "=================================================="

# Detect OS & Package Manager
if command -v apt-get &> /dev/null; then
    PKG_MANAGER="apt"
    echo "[+] Detected OS: Ubuntu/Debian (${PKG_MANAGER})"
    sudo apt update && sudo apt install -y fail2ban curl ufw
elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
    echo "[+] Detected OS: Oracle Linux/RHEL (${PKG_MANAGER})"
    sudo dnf install -y epel-release || true
    sudo dnf install -y fail2ban curl
elif command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
    echo "[+] Detected OS: CentOS/RHEL (${PKG_MANAGER})"
    sudo yum install -y epel-release || true
    sudo yum install -y fail2ban curl
else
    echo "[-] Unknown OS package manager. Please install fail2ban and curl manually."
    exit 1
fi

# SSH Security Configuration
SSH_PORT=2222
SSHD_CONFIG="/etc/ssh/sshd_config"

echo "[+] Securing SSH on port ${SSH_PORT}..."
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

# Fix logpath for RedHat/Oracle Linux if needed
if [ "$PKG_MANAGER" = "dnf" ] || [ "$PKG_MANAGER" = "yum" ]; then
    sudo sed -i "s|/var/log/auth.log|/var/log/secure|" /etc/fail2ban/jail.local
fi

sudo systemctl enable --now fail2ban
sudo systemctl restart fail2ban
echo " -> Fail2ban enabled for SSH port ${SSH_PORT}"

# Install Tailscale VPN
echo "[+] Installing Tailscale VPN..."
curl -fsSL https://tailscale.com/install.sh | sh

echo "=================================================="
echo " Tailscale installation complete."
echo " To complete Tailscale login, run:"
echo "   sudo tailscale up"
echo "=================================================="
