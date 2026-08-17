# Repository working rules

## 운영 문서 동기화

인증, 권한, Workspace 데이터 경계, 개인정보, 인프라, 환경변수, migration, 배포·복구 절차를
변경할 때는 코드 변경과 같은 작업 단위에서 `docs/operations/saas-operations-guide.md`도 반드시
갱신한다.

- 설계 결정의 기준은 `docs/adr/ADR-001-saas-security-multitenancy.md`에 기록한다.
- 실제 운영자가 따라 할 현재 절차와 구현 상태는 운영 가이드에 기록한다.
- 구현되지 않은 기능을 완료된 것처럼 쓰지 않는다.
- 검증한 명령과 결과, 배포 여부, 남은 출시 차단 조건을 함께 기록한다.
- Oracle/OCI 설정은 현재 adapter로 설명하고, 도메인 요구사항처럼 표현하지 않는다.

## 코딩 컨벤션 및 코드 스타일

- **Fully Qualified Class Name (FQCN) 인라인 사용 금지**: 클래스/인터페이스/Enum 참조 시 메서드 시그니처나 로직 내부에 패키지 경로를 포함한 FQCN(예: `com.selfintro.modules...EnumName`)을 인라인으로 직접 쓰지 말고, 반드시 파일 상단에 표준 `import` 문을 추가하여 사용한다.
