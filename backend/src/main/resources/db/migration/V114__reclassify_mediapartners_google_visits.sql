-- 2026-07-28 Google 광고 크롤러가 쿠키를 유지하지 않고 방문 API를 228회 호출해
-- 각각 순 방문자로 집계되었다. 해당 User-Agent의 일별 기록은 봇 감사 지표로
-- 보존하고, 사람 방문자용 시간대 통계에서는 제거한다.
DELETE hourly
FROM visitor_hourly_visit hourly
INNER JOIN visitor_daily_visit daily
    ON daily.visitor_hash = hourly.visitor_hash
    AND daily.visited_date = hourly.visited_date
WHERE daily.visited_date = '2026-07-28'
  AND daily.user_agent = 'Mediapartners-Google';

UPDATE visitor_daily_visit
SET is_bot = 1
WHERE visited_date = '2026-07-28'
  AND user_agent = 'Mediapartners-Google';
