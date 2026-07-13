# Oracle Free Tier 배포 메모

이 프로젝트는 프론트엔드를 정적 사이트로 배포하고, 백엔드만 OKE에 올리는 구성을 기준으로 한다.

## 최종 권장 구조

```text
사용자
  -> www.example.com
    -> Cloudflare Pages
    -> React 정적 파일

  -> api.example.com
    -> Cloudflare Proxy
    -> OCI Public NLB
    -> ingress-nginx
    -> Spring Boot Backend Pod
    -> MySQL HeatWave Always Free
```

## 결론

- Frontend: Cloudflare Pages
- Backend: OKE
- Backend image: OCIR
- Frontend image: 만들지 않음
- Database: MySQL HeatWave Always Free

프론트는 Vite + React라서 `npm run build` 결과가 HTML/CSS/JS 정적 파일이다. 따라서 OKE에서 Nginx Pod로 실행할 이유가 약하다.

이 구성이 좋은 이유:

- 프론트 컨테이너와 Nginx Pod가 불필요하다.
- OKE ARM worker의 CPU와 메모리를 아낄 수 있다.
- OCIR 저장공간을 백엔드 이미지만 쓰도록 줄인다.
- React 정적 파일은 Cloudflare CDN에서 바로 제공된다.
- 프론트 배포는 Git push 기반으로 단순화된다.
- Cloudflare Pages 무료 한도 안에서 운영 가능하다.

## MySQL HeatWave Always Free

Oracle 공식 문서 기준으로 MySQL HeatWave는 OCI Always Free Services에 포함된다.

Always Free 한도:

- Standalone Oracle MySQL HeatWave database system 1개
- Single-node MySQL HeatWave cluster
- Home region에서 생성
- 50GB storage
- 50GB backup storage

주의:

- 콘솔에서 반드시 `Always Free` 표시가 붙은 구성인지 확인한다.
- 한도를 넘기거나 paid shape/configuration을 선택하면 과금될 수 있다.
- AWS용 HeatWave Free Trial과 OCI Always Free를 혼동하지 않는다.
- Free Trial의 `$300` 크레딧과 Always Free 리소스는 별개다.

참고:

- https://www.oracle.com/mysql/free/
- https://www.oracle.com/cloud/free/faq/

## Frontend 배포

Cloudflare Pages 설정:

- Root directory: `frontend`
- Build command: `npm run build`
- Build output directory: `dist`

운영 환경 변수:

```env
VITE_API_BASE_URL=https://api.example.com
```

현재 프론트 코드는 다음 구조라 운영 API 주소만 환경 변수로 주면 된다.

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
```

로컬 개발에서는 `VITE_API_BASE_URL`을 비워두고 Vite dev proxy가 `/api`를 로컬 백엔드로 넘기게 둔다.

```env
VITE_API_BASE_URL=
```

운영에서는 Cloudflare Pages 환경 변수에 실제 API 도메인을 넣는다.

```env
VITE_API_BASE_URL=https://api.example.com
```

## Backend 이미지

백엔드만 OCIR에 push한다.

```bash
export IMAGE_TAG="0.1.0"
export BACKEND_IMAGE="${OCIR_REGISTRY}/${OCIR_NAMESPACE}/self-intro/backend:${IMAGE_TAG}"

docker buildx build \
  --platform linux/arm64 \
  --file backend/Dockerfile \
  --tag "$BACKEND_IMAGE" \
  --push \
  backend
```

OKE worker가 Ampere ARM이면 `--platform linux/arm64`가 중요하다.

푸시 결과 확인:

```bash
docker buildx imagetools inspect "$BACKEND_IMAGE"
```

성공 기준:

```text
Platform: linux/arm64
```

## Backend 환경 변수

Kubernetes Deployment에는 managed DB와 CORS 설정을 주입한다.

```env
SERVER_PORT=8080
DB_URL=jdbc:mysql://<mysql-heatwave-host>:3306/self_intro?serverTimezone=Asia/Seoul&characterEncoding=UTF-8
DB_USERNAME=self_intro
DB_PASSWORD=<secret>
DB_DRIVER=com.mysql.cj.jdbc.Driver
JPA_DDL_AUTO=update
CORS_ALLOWED_ORIGINS=https://www.example.com
```

루트 도메인도 같이 쓴다면:

```env
CORS_ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

현재 `CorsConfig`는 쉼표 구분 origin을 지원한다.

## Kubernetes Ingress

프론트는 Cloudflare Pages로 빠지므로 OKE Ingress에는 frontend route가 필요 없다.

Backend Ingress만 둔다.

```yaml
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: self-intro-backend
                port:
                  number: 8080
```

API 요청 흐름:

```text
https://api.example.com/api/study-entries
  -> Cloudflare Proxy
  -> OCI Public NLB
  -> ingress-nginx
  -> self-intro-backend service:8080
  -> Spring Boot
  -> MySQL HeatWave
```

## 작업 순서

1. MySQL HeatWave Always Free 생성
2. Backend DB 접속 정보 정리
3. Backend image를 OCIR에 push
4. OKE에 `ocir-pull-secret` 생성
5. Backend Deployment/Service 작성
6. Backend Ingress 작성
7. Cloudflare에서 `api.example.com` DNS 연결
8. Cloudflare Pages에 frontend 연결
9. Pages 환경 변수 `VITE_API_BASE_URL=https://api.example.com` 설정
10. Backend 환경 변수 `CORS_ALLOWED_ORIGINS=https://www.example.com` 설정

## 운영 메모

- 프론트 이미지는 만들지 않는다.
- 프론트 Dockerfile/Nginx 컨테이너도 필요 없다.
- OCIR에는 백엔드 이미지만 저장한다.
- DB는 MySQL HeatWave Always Free에 둔다.
- Backend Pod는 stateless하게 유지한다.
- DB 비밀번호는 Kubernetes Secret으로 관리한다.
- 운영 데이터가 생기면 `JPA_DDL_AUTO=update` 대신 migration 도구 도입을 검토한다.
