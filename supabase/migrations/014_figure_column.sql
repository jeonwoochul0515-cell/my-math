-- 014: generated_problems 테이블에 figure (도형/그래프 데이터) 컬럼 추가
-- AI가 생성한 JSXGraph FigureSpec을 JSONB로 저장

ALTER TABLE generated_problems ADD COLUMN IF NOT EXISTS figure JSONB;

COMMENT ON COLUMN generated_problems.figure IS 'JSXGraph 도형/그래프 명세 (FigureSpec JSON)';
