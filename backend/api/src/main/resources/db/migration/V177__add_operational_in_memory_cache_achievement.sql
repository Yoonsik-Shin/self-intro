-- 커밋/소스와 2026-08-10 사용자 확인을 교차 검증한 운영형 인메모리 캐싱 성과.
-- Redis 분산 캐시가 아닌 ECS 태스크별 프로세스 로컬 캐시로 명확히 구분한다.

UPDATE experience
SET summary = '핵심 학습 API에서 MongoDB 쿼리·인덱스와 인메모리 읽기 모델을 최적화하고, 학습 종료 처리를 이벤트 fan-out으로 전환했으며, 운영형 AI 튜터와 교사용 실시간 상태 기능을 개발했습니다.',
    takeaway = 'Atlas Profiler 기반 튜닝, 정적 기준 데이터의 로컬 캐시, 평균 2.74초→413ms의 학습 종료 개선처럼 운영 데이터와 제약을 설계 변경으로 연결했습니다.'
WHERE id = 17;

INSERT INTO experience_detail
    (experience_id, content, display_order, situation, task, action_detail, outcome, narrative, visible)
SELECT
     17,
     'plannedStudy 인메모리 읽기 모델 설계·운영',
     4,
     '학습 계획을 생성할 때 변경 빈도가 낮은 커리큘럼·문항 기준 데이터를 반복 조회하고, curriculum-problems와 problems를 $lookup하는 비용이 누적됐습니다.',
     'DB 조회 부하를 줄이면서 ECS 태스크별 메모리 비용과 기준 데이터 갱신 정합성을 함께 관리해야 했습니다.',
     '- 인스턴스 시작 시 curriculum-problems·problems를 1회 aggregate해 프로세스 메모리에 선적재\n- problems·concept-problems·concept-validation-problems로 캐시 범위를 확장해 plannedStudy의 조회를 메모리 탐색으로 전환\n- initializePromise로 비동기 초기화를 단일화\n- 캐시 원본을 변형하던 필터링 사이드이펙트를 복사 후 가공하도록 핫픽스\n- 최초 배포의 메모리 부족에 대응해 캐시를 임시 제외하고 ECS 메모리를 1GB에서 2GB로 조정 후 재적용\n- 기준 데이터 변경 시 서버 재배포로 태스크별 로컬 캐시 교체',
     '2025년 1월 Problem 캐시와 4월 Concept 계열 캐시를 운영에 배포했고, plannedStudy의 반복 DB 조회·$lookup을 제거했습니다. 메모리 용량과 데이터 신선도는 서버 용량 조정과 재배포 정책으로 관리했습니다.',
     '변경 빈도가 낮은 커리큘럼·문항이라는 특성을 활용해 Redis 분산 캐시 대신 ECS 태스크별 로컬 읽기 모델을 선택했습니다. 최초 Problem 캐시 운영 반영 시 OOM은 아니지만 메모리 부족을 확인해 일시 제외하고, ECS 메모리를 조정한 뒤 재적용했습니다. 데이터 변경은 서버 재배포로 모든 태스크의 캐시를 교체했습니다. 정확한 응답시간 전후 수치는 보존되지 않아 사용하지 않습니다.',
     1
WHERE NOT EXISTS (
    SELECT 1 FROM experience_detail
    WHERE experience_id = 17
      AND content IN (
          'plannedStudy 인메모리 읽기 모델 설계·운영',
          '정적 기준 데이터의 인메모리 읽기 모델 설계·운영'
      )
);

SELECT id INTO @in_memory_cache_detail_id
FROM experience_detail
WHERE experience_id = 17
  AND content IN (
      'plannedStudy 인메모리 읽기 모델 설계·운영',
      '정적 기준 데이터의 인메모리 읽기 모델 설계·운영'
  )
LIMIT 1;

UPDATE competency
SET summary = 'MongoDB Atlas Profiler에서 병목 쿼리를 찾은 뒤 aggregation·인덱스·인메모리 읽기 모델을 함께 조정했습니다. 동기 부가 작업으로 느려진 학습 종료 API는 이벤트 fan-out으로 전환해 평균 2.74초를 413ms로 줄였습니다. 성능·메모리·정합성의 트레이드오프를 운영 제약에 맞게 설계합니다.',
    updated_at = NOW()
WHERE id = 12;

INSERT INTO competency_evidence
    (competency_id, experience_id, evidence_summary, is_primary, display_order)
VALUES
    (12, 17, 'Atlas Profiler 기반 MongoDB 튜닝, plannedStudy 로컬 캐시 운영, 학습 종료 API 2.74초→413ms 개선', 1, 0)
ON DUPLICATE KEY UPDATE
    evidence_summary = VALUES(evidence_summary), is_primary = VALUES(is_primary),
    display_order = VALUES(display_order);

INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
VALUES (@in_memory_cache_detail_id, 16, 0)
ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id);
