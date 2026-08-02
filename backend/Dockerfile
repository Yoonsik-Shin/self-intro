# syntax=docker/dockerfile:1
# Stage 1: Build stage
# --platform=$BUILDPLATFORM: 컴파일은 러너와 같은 아키텍처(amd64)로 네이티브 실행하고,
# arm64로의 크로스 빌드는 아래 런타임 스테이지(jar 복사만 수행)에서만 적용해
# QEMU 에뮬레이션 하에서 Gradle 빌드 전체가 도는 것을 피한다.
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /app

# Gradle wrapper 및 설정 파일 복사
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY core/build.gradle core/
COPY ai-worker/build.gradle ai-worker/
COPY api/build.gradle api/

# Gradle 래퍼 실행 권한 부여
RUN chmod +x gradlew

# Playwright 클래스패스만 먼저 뽑아둔다 — build.gradle이 바뀔 때만 무효화되는 레이어라,
# 아래 런타임 스테이지의 Chromium 설치도 소스코드만 바뀌는 일반적인 배포에서는 캐시로 재사용된다.
RUN ./gradlew :api:copyPlaywrightClasspath --no-daemon

# 소스코드 복사 및 Jar 빌드 (테스트 제외)
COPY core core
COPY ai-worker ai-worker
COPY api api
RUN ./gradlew :api:bootJar --no-daemon -x test

# Stage 2: Runtime stage
# 채용공고 URL 자동수집이 SPA(클라이언트 JS 렌더링) 페이지를 만나면 헤드리스 Chromium으로
# 렌더링해서 콘텐츠를 가져오는데, Playwright가 받는 Chromium은 musl(Alpine)이 아니라 glibc
# 기반 배포판에서만 정식 동작해 베이스 이미지를 Debian(Ubuntu Jammy) 계열로 바꿨다.
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# builder 스테이지에서 미리 뽑아둔 Playwright 클래스패스로 브라우저와 OS 의존 라이브러리를
# 설치한다. 우리가 실제로 띄우는 건 chromium뿐이지만, Playwright.create()가 (실제로 launch하지
# 않는 엔진이라도) 브라우저 설치 상태를 검증하면서 firefox/webkit이 없으면 그때 가서 내려받는다
# — 파드가 재시작될 때마다 /ms-playwright가 초기화되므로 매번 첫 요청에서 수백MB를 몰래
# 다운로드하게 된다. 그래서 "chromium"만 지정하지 않고 기본 브라우저 세트를 전부 이미지에
# 미리 구워 넣는다. install-deps가 apt를 직접 호출하므로 root로(USER 전환 전) 실행한다.
#
# --mount=type=bind로 builder의 classpath를 이 RUN 동안만 마운트해 쓴다 — COPY로 가져오면
# 다음 RUN에서 지워도 레이어 히스토리에 그 용량이 그대로 남는다. useradd/chown도 브라우저를
# 내려받은 바로 그 레이어 안에서 실행해야 한다 — 별도 RUN으로 분리하면 overlay가 chown 대상
# 파일 전체(수 GB)를 새 레이어로 복사-업 하면서 이미지 용량이 그대로 두 배가 된다.
RUN --mount=type=bind,from=builder,source=/app/api/build/playwright-classpath,target=/tmp/playwright-classpath \
    apt-get update \
    && java -cp "/tmp/playwright-classpath/*" com.microsoft.playwright.CLI install --with-deps \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r spring && useradd -r -g spring spring \
    && chown -R spring:spring /ms-playwright

# builder 스테이지에서 생성된 jar 복사
COPY --from=builder /app/api/build/libs/*.jar app.jar

USER spring:spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
