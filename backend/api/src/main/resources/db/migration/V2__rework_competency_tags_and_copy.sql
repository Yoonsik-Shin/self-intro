-- 핵심역량 섹션: 태그(키워드) 채우기 + 방어적/자기지시적 문구 정리 + 정량 성과 항목 노출
--   - competency_tag가 비어 있어 프런트가 skills(기술 스택)로 폴백하던 문제를 태그 데이터로 해결
--   - id=9는 "증명" 위주 방어적 톤을 협업 가치 중심으로 재구성 (사실관계 동일)
--   - id=11은 "이 포트폴리오에 적힌..." 자기지시적 표현 제거, 1인칭 서술로 교체 후 노출
--   - id=4, id=12는 이미 근거가 탄탄해 문구 변경 없이 노출만 추가

SET @workspace_id = (SELECT `workspace_id` FROM `competency` WHERE `id` = 6 LIMIT 1);

UPDATE `competency`
SET `summary` = 'CS 통합 페이지는 네이버 카페·이메일·구글폼으로 흩어진 고객 문의를 한 곳에서 관리하도록 설계부터 배포까지 전 과정을 책임지고 만들었습니다. 무료체험 백오피스는 운영팀의 반복 수작업 문제를 제가 먼저 발견해 자발적 TF를 구성하고, 신청·상태 관리 API부터 인증·운영 인프라까지 실사용 가능한 서비스로 완결했습니다. 이 이력서 페이지도 기획부터 배포 자동화, 후원 결제 연동까지 같은 방식으로 직접 운영하고 있습니다.',
    `updated_at` = NOW()
WHERE `id` = 6;

UPDATE `competency`
SET `is_visible` = 1,
    `display_order` = 3,
    `updated_at` = NOW()
WHERE `id` = 12;

UPDATE `competency`
SET `display_order` = 4,
    `updated_at` = NOW()
WHERE `id` = 8;

UPDATE `competency`
SET `is_visible` = 1,
    `display_order` = 5,
    `updated_at` = NOW()
WHERE `id` = 4;

UPDATE `competency`
SET `title` = '역할 경계를 명확히 나누고 코드 리뷰로 맞춰가는 협업 방식',
    `summary` = '팀원과 함께 만들 때는 담당 영역을 먼저 나누고, 리뷰 코멘트를 1,100건 넘게 남기고 반영하며 코드 리뷰를 기반으로 맞춰갔습니다. 학습 플랫폼에서는 제가 처음부터 설계한 기능(학생 이상행동 감지, 실시간 접속 상태 표시, AI 튜터 대화)과 팀원이 전담한 기능을 코드 이력으로 구분해 설명할 수 있고, 사내 자발적 태스크포스에서는 기획자·디자이너·프론트엔드 개발자·운영 담당자와 함께 무료체험 신청 시스템을 백엔드 담당으로 완성했습니다. 3인이 함께한 사이드 프로젝트에서도 같은 방식으로 협업했습니다.',
    `display_order` = 6,
    `updated_at` = NOW()
WHERE `id` = 9;

UPDATE `competency`
SET `summary` = '제 경력과 프로젝트 설명은 실제 코드와 커밋을 다시 확인하며 근거 없는 표현을 걸러내고 사실대로 씁니다. 예를 들어 이전에 다른 프로젝트 설명에 "검색 결과를 AI가 재정렬해 정확도를 높였다"고 적었던 문구가 실제로는 구현되지 않았다는 걸 코드로 직접 확인하고 사실대로 고쳤습니다.',
    `is_visible` = 1,
    `display_order` = 7,
    `updated_at` = NOW()
WHERE `id` = 11;

-- @workspace_id가 NULL이면(= id=6 competency 행 자체가 없는 빈 DB, 예: 로컬에서 베이스라인만 적용한 상태)
-- 모든 UNION 분기가 걸러져 0건 삽입되고 조용히 넘어감 — tag.workspace_id NOT NULL 제약 위반을 피하기 위한 가드.
INSERT INTO `tag` (`workspace_id`, `name`, `slug`)
SELECT @workspace_id, '오너십', 'ownership' FROM DUAL WHERE @workspace_id IS NOT NULL
UNION ALL SELECT @workspace_id, '주도성', 'initiative' FROM DUAL WHERE @workspace_id IS NOT NULL
UNION ALL SELECT @workspace_id, '구조설계', 'architecture-design' FROM DUAL WHERE @workspace_id IS NOT NULL
UNION ALL SELECT @workspace_id, '확장성', 'extensibility' FROM DUAL WHERE @workspace_id IS NOT NULL
UNION ALL SELECT @workspace_id, '실행력', 'execution' FROM DUAL WHERE @workspace_id IS NOT NULL
UNION ALL SELECT @workspace_id, '성과측정', 'outcome-measurement' FROM DUAL WHERE @workspace_id IS NOT NULL
UNION ALL SELECT @workspace_id, '사전설계', 'proactive-design' FROM DUAL WHERE @workspace_id IS NOT NULL
UNION ALL SELECT @workspace_id, '성능', 'performance' FROM DUAL WHERE @workspace_id IS NOT NULL
UNION ALL SELECT @workspace_id, '근본원인분석', 'root-cause-analysis' FROM DUAL WHERE @workspace_id IS NOT NULL
UNION ALL SELECT @workspace_id, '문제해결', 'problem-solving' FROM DUAL WHERE @workspace_id IS NOT NULL
UNION ALL SELECT @workspace_id, '협업', 'collaboration' FROM DUAL WHERE @workspace_id IS NOT NULL
UNION ALL SELECT @workspace_id, '자기검증', 'self-verification' FROM DUAL WHERE @workspace_id IS NOT NULL
UNION ALL SELECT @workspace_id, '정직성', 'integrity' FROM DUAL WHERE @workspace_id IS NOT NULL;

INSERT INTO `competency_tag` (`competency_id`, `tag_id`)
SELECT 6, `id` FROM `tag` WHERE `workspace_id` = @workspace_id AND `name` IN ('오너십', '주도성')
UNION ALL
SELECT 1, `id` FROM `tag` WHERE `workspace_id` = @workspace_id AND `name` IN ('구조설계', '확장성')
UNION ALL
SELECT 12, `id` FROM `tag` WHERE `workspace_id` = @workspace_id AND `name` IN ('실행력', '성과측정')
UNION ALL
SELECT 8, `id` FROM `tag` WHERE `workspace_id` = @workspace_id AND `name` IN ('사전설계', '성능')
UNION ALL
SELECT 4, `id` FROM `tag` WHERE `workspace_id` = @workspace_id AND `name` IN ('근본원인분석', '문제해결')
UNION ALL
SELECT 9, `id` FROM `tag` WHERE `workspace_id` = @workspace_id AND `name` IN ('협업', '주도성')
UNION ALL
SELECT 11, `id` FROM `tag` WHERE `workspace_id` = @workspace_id AND `name` IN ('자기검증', '정직성');
