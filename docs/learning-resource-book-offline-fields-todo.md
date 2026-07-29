# 학습 자료: 책/오프라인(BOOK/OFFLINE) 전용 필드 — 후속 작업 메모

> 상태: 미구현(문서만). `learning_resource` 테이블에는 `resource_type` 컬럼만 있고
> 타입별 전용 컬럼/입력 UI는 아직 없다. `resourceType`이 `BOOK`/`OFFLINE`이어도
> 지금은 `ONLINE_COURSE`와 동일한 필드(provider, url, instructorOrAuthor,
> durationMinutes 등)만 입력 가능하다.

## 배경

Part B 원래 계획(`learning_resource` 테이블 설계)에서 "타입별로만 의미 있는
필드는 nullable 컬럼 또는 향후 `resource_type_detail` JSON/서브테이블로
확장 — 지금은 컬럼만 마련, 실제 BOOK/OFFLINE 등록 기능은 만들지 않는다"고
명시했던 부분을 그대로 이어받은 메모다. 지금 당장 구현하지 않고, 나중에
실제로 책/오프라인 자료를 등록할 필요가 생겼을 때 참고할 설계 방향만 남긴다.

## 필요할 것으로 예상되는 필드

- **BOOK**: `publisher`(출판사), `author`(이미 `instructorOrAuthor`로 커버 가능),
  `isbn`, `publishedYear`, `totalPages`(`durationMinutes` 대신 분량 지표로 사용 가능)
- **OFFLINE**: `eventLocation`(장소), `eventDate`(일시), `organizer`(주최),
  `capacity`(정원, 필요 시)

## 구현 방향 후보 (택1)

1. **nullable 컬럼 추가 방식** (원 계획의 기본 방향): `learning_resource`
   테이블에 `publisher`, `isbn`, `event_location`, `event_date` 등을 전부
   nullable로 추가. 장점: 마이그레이션/쿼리 단순. 단점: 타입이 늘어날수록
   컬럼이 계속 늘어남(현재 3타입이라 아직은 감당 가능한 수준).
2. **서브테이블 방식** (`learning_resource_book_detail`,
   `learning_resource_offline_detail` 1:1 FK 테이블): `Experience` 도메인의
   `@Inheritance(JOINED)` 패턴과 유사. 장점: 본체 테이블이 깨끗함. 단점:
   조회 시 조인 필요, 지금 규모(강의 위주 205개+)에는 과함.

→ 현재 데이터가 거의 전부 `ONLINE_COURSE`이고 BOOK/OFFLINE은 소수일 것으로
예상되므로, **실제 필요 시점에는 1안(nullable 컬럼 추가)이 더 실용적**일
가능성이 높다. 다만 최종 판단은 그때 등록 대상 자료 개수를 보고 결정.

## 변경이 필요한 지점 (구현 착수 시 체크리스트)

- `backend/.../learningresource/domain/entity/LearningResource.java`: 필드 추가
- 신규 Flyway 마이그레이션(`V1xx__learning_resource_book_offline_fields.sql`)
- `LearningResourceRequest`/`LearningResourceResponse` DTO에 필드 추가
- `LearningResourceService`의 `create`/`update`에 필드 반영
- 프론트 `LearningResourceManagement.tsx` 폼: `resourceType`에 따라 조건부로
  BOOK/OFFLINE 전용 입력 필드를 보여주는 분기 추가
- `LearningResourceDetailPanel.tsx`: 타입별 필드 표시 분기 추가
