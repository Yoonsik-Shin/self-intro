-- 엔터프라이즈 MSA 전환: gRPC 내부 통신, RabbitMQ vs Kafka 심층 비교, Oracle ATP (Vector Search 호환), CQRS 패턴 스터디 노트 추가.

INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'enterprise-msa-grpc-rabbitmq-vs-kafka-oracle-atp-cqrs',
  '엔터프라이즈 MSA: gRPC 초고속 통신, RabbitMQ vs Kafka 심층 비교, Oracle ATP 및 CQRS 패턴 구축',
  '기업 레벨의 차세대 백엔드 MSA 구축을 위해 gRPC(HTTP/2, Protobuf) 내부 통신, RabbitMQ vs Kafka 메커니즘 심층 비교, Oracle Autonomous Database ATP (Vector Search 호환), NoSQL 기반 CQRS 패턴(Command/Query 책임 분리)을 체계적으로 설계하고 구축한 과정을 다룹니다.',
  '# 엔터프라이즈 MSA: gRPC 초고속 통신, RabbitMQ vs Kafka 심층 비교, Oracle ATP 및 CQRS 패턴 구축

## 1. 개요 및 배경

Self-Intro 시스템이 단순 포트폴리오 웹 서비스에서 채용공고 자동 수집, 잡플래닛 평점 연동, NVIDIA NIM AI 파이프라인, 스터디플랜 자동 생성 등 복잡한 도메인으로 확장됨에 따라, 단일 모놀리스 구조의 한계를 넘어서는 **기업 레벨 엔터프라이즈 마이크로서비스 아키텍처(MSA)** 구축이 요구되었습니다.

본 스터디에서는 **gRPC 바이너리 통신**, **RabbitMQ 메시지 큐(Kafka 비교)**, **Oracle Autonomous Database ATP (Vector Search 호환)**, **NoSQL CQRS 패턴**을 종합 적용한 아키텍처 의사결정 및 구현 내역을 기록합니다.

---

## 2. RabbitMQ vs Apache Kafka 심층 비교

| 비교 항목 | **RabbitMQ (AMQP Push-based)** | **Apache Kafka (Log Stream Pull-based)** |
| :--- | :--- | :--- |
| **기본 아키텍처** | **스마트 브로커 / 덤 컨슈머**: 브로커가 메시지 라우팅 및 상태(Ack/Nack) 관리 | **덤 브로커 / 스마트 컨슈머**: 브로커는 단순 파티션 로그 저장소, 컨슈머가 오프셋 관리 |
| **메시지 전달 방식** | **Push 방식**: 브로커가 연결된 Consumer에게 메시지를 직접 밀어줌 | **Pull 방식**: Consumer가 자신의 처리 속도에 맞춰 메시지를 당겨옴 |
| **라우팅 메커니즘** | Exchange (Direct, Fanout, Topic, Headers) 기반으로 세밀한 라우팅 | Topic과 Partition 키 기반 분산 저장 및 라우팅 |
| **재처리 및 영속성** | Consumer가 Ack 하면 메시지 삭제 (DLQ로 실패 메시지 격리) | 디스크에 영구 저장(Log Segment), 오프셋을 되돌려 언제든 재처리(Replay) 가능 |
| **자원 소모 (RAM)** | **~80MB ~ 120MB (매우 경량, K8s Pod 배포 최적)** | **~1GB ~ 2GB+ (KRaft/Zookeeper + JVM 힙 요구로 오버헤드 큼)** |

### 💡 아키텍처 선택 이유: 왜 RabbitMQ인가?
- 단일 VM / K8s 환경에서 **Kafka의 2GB+ 힙 메모리 오버헤드**는 부담이 큽니다.
- 서비스 간 비동기 이벤트 발행/수신(JobPostingCollected, AiCompleted)과 **DLQ(Dead Letter Queue) 기반 재시도 메커니즘**을 구성하기에 **RabbitMQ가 자원 효율성(80MB)과 운영 신뢰성 면에서 압도적으로 우수**합니다.

---

## 3. gRPC (HTTP/2 + Protocol Buffers) 내부 통신

### 1) REST/JSON vs gRPC/Protobuf 성능 비교
- **REST/JSON**: 텍스트 기반 패킷 크기가 크고, HTTP/1.1 연결 재사용 한계 및 JSON 직렬화/파싱 CPU 비용 발생.
- **gRPC (Proto3)**: **HTTP/2 멀티플렉싱**을 통한 단일 TCP 연결 다중 요청 처리 + **Protocol Buffers 바이너리 직렬화**로 패킷 용량 60% 이상 감소 및 초고속 응답.

### 2) 서비스 간 인터페이스 (`job_posting.proto`)
```protobuf
syntax = "proto3";
package com.selfintro.grpc;

service JobPostingGrpcService {
  rpc GetJobPostingSummary (JobPostingSummaryRequest) returns (JobPostingSummaryResponse);
  rpc GetJobMatchingScore (JobMatchingScoreRequest) returns (JobMatchingScoreResponse);
}
```

---

## 4. Oracle ATP DB & CQRS 패턴 (Command / Query 책임 분리)

```
[Command (Write)]   Worker/API 서비스 ──> Oracle Autonomous DB (ATP) [ACID 트랜잭션, Vector Search 호환]
                           │
                           ▼ (RabbitMQ 비동기 이벤트)
[Query (Read)]      CQRS Event Handler ──> NoSQL Read Store (Redis Document) [0.001초 조인 없는 초고속 조회]
```

1. **Command Side (Oracle ATP DB)**: 원본 데이터의 엄격한 ACID 트랜잭션 보장. 향후 AI Vector Search (채용공고/이력서 임베딩 유사도 검색) 기능을 위한 `VECTOR` 데이터 타입 호환성 확보.
2. **Query Side (CQRS Read Store)**: RabbitMQ 이벤트를 수신하여 NoSQL Read Store에 조회 전용 Read Model(`JobPostingReadModel`)을 실시간 투영. 면접관/방문자의 목록 조회 시 복잡한 SQL JOIN 없이 0.001초 응답 보장.

---

## 5. 성과 및 결론

1. **완벽한 MSA 커플링 해제**: API 서비스와 Worker 서비스가 gRPC 바이너리 통신과 RabbitMQ 비동기 이벤트로 결합도를 최소화함.
2. **CQRS 기반 조회 성능 극대화**: Write 트랜잭션과 Read 조회를 분리하여 데이터베이스 부하 차단.
3. **실무형 인프라 경험 확립**: K8s Pod 상에서 RabbitMQ, gRPC, Oracle ATP를 조합한 엔터프라이즈 백엔드 표준 정립.',
  'PUBLISHED',
  5,
  '2026-08-02',
  NOW(),
  NOW(), NOW()
);
