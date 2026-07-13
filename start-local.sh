#!/bin/bash

# start-local.sh
# 로컬 개발 환경 통합 실행 스크립트

echo "=========================================================="
echo "   현대오토에버 지원자 신윤식 소개 웹 앱 로컬 구동 스크립트"
echo "=========================================================="

# 백엔드 서버 백그라운드 기동
echo "1. 백엔드 Spring Boot 기동 중... (포트: 8080, H2 인메모리 DB 활성화)"
cd backend
gradle bootRun --args='--spring.profiles.active=local' > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 잠시 대기 (백엔드 포트 준비 시간)
echo "   백엔드 데이터 초기화 및 구동 대기 중 (5초)..."
sleep 5

# 프론트엔드 기동
echo "2. 프론트엔드 React (Vite) 기동 중... (포트: 5173)"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "=========================================================="
echo "   🚀 로컬 구동 완료!"
echo "   - 프론트엔드 접속: http://localhost:5173"
echo "   - 백엔드 API 주소: http://localhost:8080"
echo "=========================================================="
echo "   - 종료하려면 Ctrl+C를 눌러주세요. 하위 프로세스가 모두 정리됩니다."
echo "   - 백엔드 로그 확인: tail -f backend.log"
echo "=========================================================="

# 프로세스가 종료될 때 하위 프로세스들도 정리하도록 trap 설정
cleanup() {
    echo ""
    echo "로컬 서버 프로세스를 안전하게 종료하는 중..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "종료 완료."
    exit 0
}

trap cleanup SIGINT SIGTERM

# 백그라운드 프로세스가 유지되도록 대기
wait
