# 페이앱(PayApp) 인페이지 후원 결제 연동 플랜

## 목적

포트폴리오 웹페이지 안에서 방문자가 페이지를 벗어나지 않고 카드/간편결제로 후원할 수 있게 한다. 이 문서는 즉시 구현 범위가 아니라, 착수 시점에 바로 실행할 수 있도록 조사된 내용을 남겨두는 계획 문서다.

## 배경: 왜 페이앱인가

지금까지 시도한 방식과 한계:

- **토스 `toss.me` 송금 링크**: 서비스 자체가 공식 종료됨.
- **Buy Me a Coffee**: 정산이 Stripe Connect를 거치는데, 가입 시 국가가 미국으로 고정되어 미국 SSN/ITIN이 없으면 정산을 완료할 수 없음.
- **카카오페이 코드송금 링크(`https://qr.kakaopay.com/...`)**: 사업자등록 없이 즉시 쓸 수 있고 지금 임시로 붙여봤지만, 외부 페이지로 튕겨나가는 방식이라 "웹페이지 안에서 결제"라는 목표에는 맞지 않음.

페이앱은 다음 조건을 모두 만족한다.

- 개인(비사업자) 가입 가능 (`usertype=1`), 사업자등록증 불필요
- 카드/간편결제 지원
- 서버 API로 결제 요청을 만들고, 반환된 결제 URL을 팝업/모달로 띄울 수 있어 페이지 컨텍스트를 유지한 채 결제 가능
- 개인 한도: 1회 50만원, 일 200만원, 월 200만원, 연 2,400만원 누적 (후원 용도로는 충분)
- 월매출 500만원 이하 또는 건당 50만원 이하는 보증보험 면제

한도를 초과하는 성장이 필요해지면 그때 사업자 전환 + 토스페이먼츠 결제위젯으로 이전을 검토한다.

## 사전 준비 (사용자가 직접 해야 하는 부분)

1. [payapp.kr](https://www.payapp.kr) 개인 판매자 회원가입
2. 판매자 관리 사이트 > 설정 > 연동 정보에서 **연동 KEY**, **연동 VALUE** 발급
3. 두 값을 백엔드 시크릿으로 등록 (K8s Secret — 최근 NVIDIA NIM 연동 때 쓴 방식과 동일한 패턴 재사용)

## 연동 개요

페이앱은 단일 REST 엔드포인트를 사용한다: `https://api.payapp.kr/oapi/apiLoad.html`

- `payrequest`: 결제 요청 생성, 응답으로 결제 URL 반환
- `feedbackurl` 파라미터: 결제 완료/취소/상태변경 시 페이앱 서버가 POST로 콜백을 보내는 우리 쪽 엔드포인트. `mul_no`(거래 고유번호)로 멱등성 처리 필요. 200 OK + 본문 `SUCCESS`로 응답해야 함.
- 연동 KEY/VALUE는 절대 프론트엔드에 노출하지 않고 백엔드에서만 사용.

## 백엔드 설계 (Spring Boot, 기존 모듈 패턴 준용)

기존 `modules/visitor`, `study` 모듈과 동일한 계층 구조(`domain` / `application` / `presentation`)로 `modules/donation` 신설.

```text
modules/donation
├── domain/Donation.java              # mul_no, amount, status(PENDING/PAID/CANCELED), payerMemo, createdAt, paidAt
├── domain/DonationRepository.java
├── application/DonationService.java  # payapp payrequest 호출, 콜백 처리, 연간 누적액 조회
├── presentation/DonationController.java
│   ├── POST /api/donations                → { amount, message? } 받아 payapp payrequest 호출 후 { payUrl, donationId } 반환
│   └── POST /api/donations/payapp/callback → feedbackurl 수신, 서명/mul_no 검증, 상태 갱신, "SUCCESS" 응답
└── presentation/dto/DonationRequest.java, DonationResponse.java
```

- 새 Flyway 마이그레이션 `V2x__donation.sql` (V22, V23 다음 번호 확인 후 배정)
- `POST /api/donations`는 인증 없는 공개 엔드포인트지만, 금액 상한(예: 100,000원) 검증과 기본적인 요청 빈도 제한(rate limit)을 둬서 남용 방지
- 콜백 엔드포인트는 페이앱 서버 IP 또는 연동 VALUE 기반 서명 검증 필수 (위조 콜백으로 허위 결제완료 처리되는 것 방지)
- 연간 누적 한도(2,400만원)에 근접하면 관리자 알림을 남기는 로직 고려 (선택)

## 프론트엔드 설계

- 기존 우하단 고정 버튼 자리(`frontend/src/App.tsx`)에 후원 버튼 복원, 클릭 시 외부 링크 대신 금액 선택 모달 오픈 (예: 3,000 / 5,000 / 10,000원 + 직접 입력)
- 모달에서 "후원하기" 누르면 `POST /api/donations` 호출 → 응답받은 `payUrl`을 `window.open(payUrl, 'payapp', 'width=420,height=640')`으로 팝업 오픈 (팝업 방식이 페이앱 권장 연동 방식이며, 전체 페이지 이동보다 컨텍스트 유지에 유리)
- 팝업 종료 후 프론트에서 `donationId` 기준으로 상태를 폴링하거나, 팝업이 부모 창에 `postMessage`를 보내도록 완료 페이지를 구성해 감사 메시지 표시
- `lib/api.ts`에 `donationApi.create(amount, message)` 함수 추가 (기존 `visitorApi`, `studyApi` 패턴 재사용)

## 구현 순서

1. 페이앱 개인 가입 + 연동키 발급 (사용자)
2. 백엔드: `Donation` 엔티티 + 마이그레이션 + `payrequest` 연동 서비스 + 생성 API
3. 백엔드: `feedbackurl` 콜백 + 검증 + 상태 갱신 + 멱등성
4. 프론트: 금액 선택 모달 + 팝업 결제 플로우
5. 프론트: 결제 완료 감사 메시지
6. (선택) `AdminDashboard`에 후원 내역 조회 탭 추가 (기존 방문자 통계 탭과 동일한 패턴)
7. 검증: 페이앱 소액 실결제로 전체 플로우(요청 생성 → 팝업 결제 → 콜백 수신 → 상태 갱신 → 프론트 감사 메시지) end-to-end 확인

## 검증 방법

- 백엔드: 콜백 엔드포인트에 멱등성 테스트(같은 `mul_no` 중복 수신 시 상태 중복 갱신 안 되는지) 단위 테스트 추가
- 실제 소액(1,000~3,000원) 결제로 개발 서버에서 전체 플로우 수동 테스트
- 연동 KEY/VALUE가 프론트 번들에 노출되지 않는지 빌드 결과물에서 확인
