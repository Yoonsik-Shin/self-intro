# Stage 1: Build stage
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Gradle wrapper 및 설정 파일 복사
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./

# Gradle 래퍼 실행 권한 부여
RUN chmod +x gradlew

# 소스코드 복사 및 Jar 빌드 (테스트 제외)
COPY src src
RUN ./gradlew bootJar --no-daemon -x test

# Stage 2: Runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring

# builder 스테이지에서 생성된 jar 복사
COPY --from=builder /app/build/libs/*.jar app.jar

USER spring:spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
