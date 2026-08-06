# OCI AMD Micro VM - 4-in-1 O&M 통합 서버 구축 가이드

OCI Always Free `VM.Standard.E2.1.Micro` (1/8 OCPU, 1GB RAM) 1대를 활용한 보안, 관제, 백업 전용 운영 서버 가이드입니다.

---

## 🛠️ 제공 스크립트 & 서비스 구성

| 파일/모듈 | 역할 | 메모리 점유 |
| :--- | :--- | :--- |
| `setup-bastion-vpn.sh` | SSH 커스텀 포트(2222), Fail2ban 방어, Tailscale VPN 원클릭 설치 | `~30MB` |
| `docker-compose.yml` | Uptime Kuma 웹 GUI 헬스체크 & Slack/Discord 알림 | `~80MB` |
| `db-backup.sh` | MySQL HeatWave DB 덤프 -> OCI Object Storage 자동 백업 | `~30MB` |
| `setup-node-exporter.sh` | Prometheus Node Exporter 설치 & Systemd 데몬 등록 | `~15MB` |

---

## 🚀 빠른 설치 단계 (Single AMD Micro VM에서 실행)

```bash
# 1. 레포지토리 클론 또는 스크립트 업로드 후 이동
cd deploy/amd-micro-vms/vm-ops-all-in-one

# 2. Bastion & Tailscale 설치
sudo ./setup-bastion-vpn.sh
sudo tailscale up

# 3. Uptime Kuma (웹 헬스체크 대시보드) 구동
sudo apt install -y docker.io docker-compose
sudo docker-compose up -d
# -> 접속: http://<VM-IP-또는-Tailscale-IP>:3001

# 4. Node Exporter 체온계 데몬 구동
sudo ./setup-node-exporter.sh

# 5. DB 자동 백업 스케줄러 등록 (매일 새벽 3시)
sudo cp db-backup.sh /opt/db-backup.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/db-backup.sh >> /var/log/db-backup.log 2>&1") | crontab -
```
