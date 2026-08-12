-- 기본 이력서는 채용 담당자가 빠르게 읽을 수 있는 2페이지 내외를 목표로 압축한다.
-- 인메모리 캐시는 플랫폼 특화 이력서에 남기고, 자격은 백엔드 전환과 직접 관련된 항목만 유지한다.
UPDATE print_template
SET excluded_ids = JSON_ARRAY_APPEND(
        excluded_ids,
        '$', 'career-detail:43',
        '$', 'credential:12'
    ),
    section_gaps = '{"skills":8,"career":10,"credentials":8}',
    line_height = 1.45,
    updated_at = NOW()
WHERE id = 10;
