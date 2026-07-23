-- V61: Remove the final internal module and package terminology from public career copy.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @bff_project_id = (
    SELECT experience_id FROM project WHERE slug = 'work-aws-cicd' LIMIT 1
);
SET @common_project_id = (
    SELECT experience_id FROM project WHERE slug = 'work-problem-monorepo' LIMIT 1
);

UPDATE experience
SET takeaway = '서비스 저장소와 공통 개발 기반을 함께 구축하고, 분리한 공통 패키지와 생성 템플릿을 신규 조회 서비스에 실제 적용했습니다.'
WHERE id = @common_project_id;

UPDATE experience_detail
SET content = '프론트엔드 요구에 맞춘 BFF 공통 기반 구축',
    situation = '프론트엔드가 여러 백엔드 API를 화면별로 조합하면서 인증 정보 전달과 오류 처리 로직이 반복되고 있었습니다.',
    task = '인증·인가, 서버 간 통신, 공통 오류 처리와 화면별 응답 조합을 담당할 BFF의 초기 기반을 구축했습니다.',
    action_detail = '- NestJS 서버와 환경 설정, Docker 개발 환경 구성\n- 인증 정보 추출과 역할 기반 접근 제어 구현\n- 서버 간 HTTP 통신과 timeout·gateway·network 오류 변환 구성\n- API 문서, 공통 예외 처리, 로깅과 모니터링 연동\n- 교사용 관리와 대화형 AI 기능 등 화면별 중계 API 개발',
    outcome = '프론트엔드가 인증 전달과 서버별 오류 변환을 반복하지 않고 화면에 필요한 데이터를 일관된 BFF API로 소비할 수 있게 했습니다.',
    narrative = '프론트엔드가 여러 백엔드 API를 화면별로 조합하면서 인증 정보 전달과 오류 처리 로직이 반복되고 있었습니다. 이를 해결하기 위해 NestJS 서버와 환경 설정, Docker 개발 환경을 구성하고 인증 정보 추출과 역할 기반 접근 제어를 구현했습니다. 서버 간 HTTP 통신에는 timeout·gateway·network 오류 변환을 적용하고 API 문서, 공통 예외 처리, 로깅과 모니터링을 연결했습니다. 이후 화면별 중계 API를 개발해 프론트엔드가 인증 전달과 서버별 오류 처리를 반복하지 않고 필요한 데이터를 일관된 BFF API로 소비할 수 있게 했습니다.'
WHERE experience_id = @bff_project_id
  AND content = 'NestJS BFF 초기 구조와 서버 간 호출 기반 구축';
