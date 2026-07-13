# Coding Test Practice

코딩테스트 풀이와 개념 정리를 함께 관리하는 저장소입니다. 문제별로 풀이 코드, 접근 기록, 복습 포인트를 남기고, 반복해서 나오는 개념은 `concepts/`에 정리합니다.

## Self Intro Web App

개발자 소개 페이지와 학습 내용 등록 기능을 함께 제공하는 웹 앱을 추가했습니다.

- `frontend/`: React, Tailwind CSS, Zustand, TanStack Query
- `backend/`: Java 21, Spring Boot, Spring Data JPA, QueryDSL
- `deploy/oracle-free-tier.md`: Oracle Free Tier VM 배포 메모

로컬 실행:

```bash
cd backend
gradle bootRun --args='--spring.profiles.active=local'
```

```bash
cd frontend
npm install
npm run dev
```

프론트는 `http://localhost:5173`, 백엔드는 `http://localhost:8080`에서 실행됩니다.

## Structure

```text
.
├── backend/               # 학습 내용 등록/조회 API
├── concepts/              # Java, 자료구조, 알고리즘 개념 정리
├── deploy/                # Oracle Free Tier 배포 가이드
├── frontend/              # 개발자 소개 React 앱
├── problems/              # 문제별 풀이와 회고
├── templates/             # 새 문제를 만들 때 복사할 템플릿
└── scripts/               # 반복 작업용 스크립트
```

## Workflow

1. `scripts/new-problem.sh <slug>`로 문제 폴더를 만듭니다.
2. `problems/<slug>/README.md`에 문제 링크, 조건, 접근을 정리합니다.
3. `Solution.java`에 풀이를 작성하고 `Main.java`에 예시와 엣지 케이스를 추가합니다.
4. 아래 명령으로 단일 문제를 실행합니다.

```bash
javac -d out/problems problems/<slug>/*.java
java -cp out/problems Main
```

## Naming

- 문제 폴더: `0001-two-sum`, `2026-07-02-binary-search`처럼 정렬 가능한 접두어를 붙입니다.
- 개념 문서: `concepts/algorithms/binary-search.md`처럼 한 파일에 한 주제를 정리합니다.
- 풀이 회고: 시간복잡도, 공간복잡도, 틀린 이유, 다시 풀 날짜를 반드시 남깁니다.
