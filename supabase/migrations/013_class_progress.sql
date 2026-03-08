-- 013: 반별 진도 관리 — covered_topics 컬럼 추가
-- 원장이 반별로 배운 단원을 체크하면 적응형 학습에서 해당 범위만 출제

ALTER TABLE classes ADD COLUMN IF NOT EXISTS covered_topics TEXT[] DEFAULT '{}';
