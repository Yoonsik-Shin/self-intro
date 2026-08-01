#!/bin/bash

# start-local-k8s.sh
# 로컬 쿠버네티스(Docker Desktop / k3d / minikube / kind) 환경에
# OKE 배포 스택과 100% 동일한 애플리케이션 및 모니터링 스택을 1-Click 실행하는 스크립트

set -e

echo "================================================================="
echo "   🚀 로컬 Kubernetes (Local K8s) 배포 & 모니터링 스택 구동"
echo "================================================================="

if [ "$1" == "stop" ] || [ "$1" == "down" ]; then
    echo "로컬 Kubernetes 모니터링 및 서비스 리소스를 삭제하는 중..."
    kubectl delete -k deploy/k8s/overlays/local --ignore-not-found
    echo "삭제 완료."
    exit 0
fi

# 1. Namespace 존재 여부 확인 및 생성
echo "1. self-intro 네임스페이스 확인..."
kubectl create namespace self-intro --dry-run=client -o yaml | kubectl apply -f -

# 2. Local K8s Overlay 매니페스트 적용
echo "2. Kustomize를 통한 로컬 K8s 풀스택 & 모니터링 배포중..."
kubectl apply -k deploy/k8s/overlays/local

echo "================================================================="
echo "   ✅ 로컬 K8s 배포 완료!"
echo "   - Pod 상태 확인: kubectl get pods -n self-intro"
echo "   - Grafana 포트포워딩: kubectl port-forward svc/grafana 3000:3000 -n self-intro"
echo "   - Prometheus 포트포워딩: kubectl port-forward svc/prometheus 9090:9090 -n self-intro"
echo "   - 리소스 삭제하기: ./scripts/start-local-k8s.sh stop"
echo "================================================================="
