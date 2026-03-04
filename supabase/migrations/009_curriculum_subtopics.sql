-- ============================================
-- 009: 교육과정 성취기준 세분화 지원
-- sub_topic 컬럼 + textbook_publisher 컬럼
-- ============================================

-- 1) generated_problems에 sub_topic 추가
ALTER TABLE generated_problems ADD COLUMN IF NOT EXISTS sub_topic TEXT;

-- 2) problem_embeddings에 sub_topic 추가
ALTER TABLE problem_embeddings ADD COLUMN IF NOT EXISTS sub_topic TEXT;

-- 3) academies에 textbook_publisher 추가
ALTER TABLE academies ADD COLUMN IF NOT EXISTS textbook_publisher TEXT;

-- 4) 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_generated_problems_sub_topic
  ON generated_problems (grade, topic, sub_topic) WHERE sub_topic IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_problem_embeddings_sub_topic
  ON problem_embeddings (grade, topic, sub_topic) WHERE sub_topic IS NOT NULL;
