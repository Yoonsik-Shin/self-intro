-- 경력·프로젝트 원본 없이도 독립 포트폴리오 사례를 작성할 수 있게 한다.
-- 기존 외래 키는 유지되며 연결형 사례에는 기존 소유권 검증이 그대로 적용된다.
ALTER TABLE portfolio_case_study
    MODIFY experience_id BIGINT NULL;
