-- 2026-08-10 사용자 인터뷰에서 구조 전환 후 반복되던 60초 timeout 해소를 확인했다.
-- 정확한 응답시간 전후 수치는 보존되지 않았으므로 추가하지 않는다.

UPDATE experience_detail
SET outcome = '제출 통계 책임과 읽기·쓰기 경계를 분리한 뒤, 운영에서 반복되던 60초 timeout이 사라졌습니다. 후속 읽기 모델 서비스와 BFF 분리를 진행할 기반도 마련했습니다.',
    narrative = '문제 진단과 아키텍처 방향은 팀과 함께 논의했고, 저는 제출 통계 4분할·DB 경계·마이그레이션의 설계와 핵심 구현을 담당했습니다. 구조 전환 후 운영에서 반복되던 60초 timeout이 실제로 사라졌습니다. 정확한 응답시간 전후 수치는 보존되지 않아 추가 수치로 과장하지 않습니다.'
WHERE experience_id = 17
  AND content = '1초 Polling 병목 분석과 읽기·쓰기 경계 재설계';

UPDATE experience
SET takeaway = 'Atlas Profiler 기반 튜닝, 정적 기준 데이터의 로컬 캐시, 학습 종료 API 평균 2.74초→413ms 개선, 1초 Polling 요청 중첩으로 발생한 60초 timeout 해소처럼 운영 문제를 구조 변경으로 연결했습니다.'
WHERE id = 17;

UPDATE competency
SET summary = 'MongoDB Atlas Profiler에서 병목 쿼리를 찾은 뒤 aggregation·인덱스·인메모리 읽기 모델을 함께 조정했습니다. 학습 종료 API는 이벤트 fan-out으로 평균 2.74초를 413ms로 줄였고, 1초 Polling 요청 중첩으로 반복되던 60초 timeout은 통계 모델과 읽기·쓰기 경계를 재설계해 해소했습니다.',
    updated_at = NOW()
WHERE id = 12;

UPDATE competency_evidence
SET evidence_summary = 'Atlas Profiler 기반 MongoDB 튜닝, 로컬 캐시 운영, 학습 종료 API 2.74초→413ms 개선, Polling 중첩 60초 timeout 해소'
WHERE competency_id = 12 AND experience_id = 17;
