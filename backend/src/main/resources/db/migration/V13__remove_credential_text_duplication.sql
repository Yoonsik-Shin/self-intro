-- Institution and issuer already have dedicated display fields. Keep titles and summaries focused
-- on the course, degree, or verified capability so portfolio cards do not repeat the same label.
UPDATE experience
SET title = CASE title
        WHEN '차의과학대학교 스포츠의학과 졸업' THEN '스포츠의학과 학사 졸업'
        WHEN '[Microsoft] AI 엔지니어링 과정 (3기)' THEN 'AI 엔지니어링 과정 (3기)'
        WHEN '풀스택 프로젝트 실무과정 [청년취업사관학교]' THEN '풀스택 프로젝트 실무과정'
        WHEN '파이썬 기반 풀스택 부트캠프 [멀티캠퍼스]' THEN '파이썬 기반 풀스택 부트캠프'
        ELSE title
    END,
    summary = CASE summary
        WHEN '스포츠의학과 학사 학위 취득 (IT 비전공)' THEN 'IT 비전공자로서 개발 역량을 별도로 쌓았습니다.'
        WHEN 'IT 전반의 핵심 이론 및 기술 자격 검증 (한국산업인력공단)' THEN 'IT 전반의 핵심 이론 및 기술 자격 검증'
        WHEN '데이터베이스 모델링 및 SQL 작성 능력 검증 ((재)한국데이터산업진흥원)' THEN '데이터베이스 모델링 및 SQL 작성 능력 검증'
        WHEN '데이터 수집, 전처리, 분석 모형 설계 및 평가 역량 검증 ((재)한국데이터산업진흥원)' THEN '데이터 수집, 전처리, 분석 모형 설계 및 평가 역량 검증'
        WHEN '스프레드시트 및 데이터베이스 활용 능력 자격 검증 (대한상공회의소)' THEN '스프레드시트 및 데이터베이스 활용 능력 자격 검증'
        ELSE summary
    END,
    takeaway = CASE takeaway
        WHEN '차의과학대학교 스포츠의학과를 졸업했으며, IT 비전공자로서 개발 역량을 별도로 쌓았습니다.'
            THEN '스포츠의학을 전공한 뒤 개발 교육과 프로젝트, 실무 경험을 통해 소프트웨어 개발 역량을 쌓았습니다.'
        WHEN '데이터를 수집하고 전처리하여 통계적 기법 and ML 모형으로 분석해 유의미한 가치를 추출할 수 있는 이론적 토대를 닦았습니다.'
            THEN '데이터를 수집하고 전처리하여 통계적 기법과 ML 모형으로 분석해 유의미한 가치를 추출할 수 있는 이론적 토대를 닦았습니다.'
        ELSE takeaway
    END
WHERE type IN ('EDUCATION', 'CERTIFICATE');
