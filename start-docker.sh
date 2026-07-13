#!/bin/bash

# start-docker.sh
# Docker Compose 통합 실행 및 자동 정리 스크립트

echo "================================================================="
echo "   현대오토에버 지원자 신윤식 소개 웹 앱 Docker Compose 구동"
echo "================================================================="

if [ "$1" == "stop" ] || [ "$1" == "down" ]; then
    echo "컨테이너 서비스를 안전하게 종료하고 리소스를 해제하는 중..."
    docker compose down
    echo "종료 완료."
    exit 0
fi

# 기존에 띄워진 컨테이너가 있다면 정리 후 시작
echo "1. 기존 실행 중인 컨테이너 확인 및 정리..."
docker compose down >/dev/null 2>&1

# 컨테이너 빌드 및 백그라운드 기동
echo "2. 신규 컨테이너 빌드 및 백그라운드 기동 중..."
docker compose up --build -d

echo "================================================================="
echo "   🚀 Docker Compose 백그라운드 구동 완료!"
echo "   - 프론트엔드 접속 주소: http://localhost:5173"
echo "   - 백엔드 API 주소: http://localhost:8080"
echo "   - MySQL 데이터베이스 접속: localhost:3306 (user: self_intro_app)"
echo "================================================================="
echo "   - 실시간 로그 보기: docker compose logs -f"
echo "   - 서비스 종료하기: ./start-docker.sh stop"
echo "================================================================="
