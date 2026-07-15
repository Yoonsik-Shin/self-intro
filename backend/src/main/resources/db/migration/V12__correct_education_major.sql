-- Correct the portfolio owner's degree information in databases seeded with the old CS-major data.
UPDATE education edu
JOIN experience exp ON exp.id = edu.experience_id
SET edu.institution_name = '차의과학대학교'
WHERE exp.type = 'EDUCATION'
  AND exp.summary = '컴퓨터공학 학사 학위 취득';

UPDATE experience_detail detail
JOIN experience exp ON exp.id = detail.experience_id
SET detail.content = '스포츠의학과 학사 학위 취득 (IT 비전공)',
    detail.outcome = '차의과학대학교 스포츠의학과를 졸업했으며, IT 비전공자로서 개발 역량을 별도로 쌓았습니다.'
WHERE exp.type = 'EDUCATION'
  AND exp.summary = '컴퓨터공학 학사 학위 취득'
  AND detail.content = '컴퓨터공학 학사 학위 취득';

UPDATE experience
SET title = '차의과학대학교 스포츠의학과 졸업',
    summary = '스포츠의학과 학사 학위 취득 (IT 비전공)',
    takeaway = '차의과학대학교 스포츠의학과를 졸업했으며, IT 비전공자로서 개발 역량을 별도로 쌓았습니다.'
WHERE type = 'EDUCATION'
  AND summary = '컴퓨터공학 학사 학위 취득';
