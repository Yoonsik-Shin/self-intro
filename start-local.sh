#!/bin/bash

# start-local.sh
# 로컬 개발 환경 통합 실행 스크립트 (백그라운드 백그라운드 기동)

echo "=========================================================="
echo "   현대오토에버 지원자 신윤식 소개 웹 앱 로컬 구동 스크립트"
echo "=========================================================="

PID_DIR="$(dirname "$0")"
BACKEND_PID_FILE="$PID_DIR/.backend.pid"
FRONTEND_PID_FILE="$PID_DIR/.frontend.pid"

if [ "$1" == "stop" ] || [ "$1" == "down" ]; then
    echo "로컬 서버 프로세스를 안전하게 종료하는 중..."
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FPID=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$FPID" 2>/dev/null; then
            kill "$FPID" 2>/dev/null
            echo "   - 프론트엔드 프로세스($FPID) 종료됨."
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi

    if [ -f "$BACKEND_PID_FILE" ]; then
        BPID=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$BPID" 2>/dev/null; then
            kill "$BPID" 2>/dev/null
            echo "   - 백엔드 프로세스($BPID) 종료됨."
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    echo "종료 완료."
    exit 0
fi

# 기존 구동 중인지 체크
if [ -f "$BACKEND_PID_FILE" ] && kill -0 "$(cat "$BACKEND_PID_FILE")" 2>/dev/null; then
    echo "⚠️ 백엔드가 이미 백그라운드에서 실행 중입니다. (PID: $(cat "$BACKEND_PID_FILE"))"
    echo "   재구동하려면 './start-local.sh stop'을 먼저 실행해주세요."
    exit 1
fi

# 백엔드 서버 백그라운드 기동
echo "1. 백엔드 Spring Boot 백그라운드 기동 중... (로그: backend.log)"
cd backend
gradle bootRun --args='--spring.profiles.active=local' > ../backend.log 2>&1 &
echo $! > "$BACKEND_PID_FILE"
cd ..

# 잠시 대기 (백엔드 포트 준비 시간)
echo "   백엔드 데이터 초기화 및 구동 대기 중 (5초)..."
sleep 5

# 프론트엔드 기동
echo "2. 프론트엔드 React (Vite) 백그라운드 기동 중... (로그: frontend.log)"
cd frontend
npm run dev > ../frontend.log 2>&1 &
echo $! > "$FRONTEND_PID_FILE"
cd ..

echo "=========================================================="
echo "   🚀 로컬 백그라운드 구동 완료!"
echo "   - 프론트엔드 접속: http://localhost:5173"
echo "   - 백엔드 API 주소: http://localhost:8080"
echo "=========================================================="
echo "   - 백엔드 로그 확인: tail -f backend.log"
echo "   - 프론트엔드 로그 확인: tail -f frontend.log"
echo "   - 서비스 종료하기: ./start-local.sh stop"
echo "=========================================================="
