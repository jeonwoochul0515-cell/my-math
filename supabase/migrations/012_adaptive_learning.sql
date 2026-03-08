-- 012: 적응형 학습 — 학생별 단원 숙련도 추적
-- 4문제 세트 단위로 정답률 추적, 4/4 맞추면 난이도 승급

CREATE TABLE IF NOT EXISTS student_topic_level (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  current_difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (current_difficulty IN ('easy', 'medium', 'hard')),
  consecutive_perfect INT NOT NULL DEFAULT 0,
  total_sets INT NOT NULL DEFAULT 0,
  total_correct INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, topic)
);

-- 적응형 세트 이력 — 어떤 문제가 어떤 세트로 출제되었는지 추적
CREATE TABLE IF NOT EXISTS adaptive_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topics TEXT[] NOT NULL,
  difficulty TEXT NOT NULL,
  problem_ids TEXT[] NOT NULL,
  correct_count INT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- RLS 활성화
ALTER TABLE student_topic_level ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_sets ENABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_stl_student ON student_topic_level(student_id);
CREATE INDEX IF NOT EXISTS idx_stl_student_topic ON student_topic_level(student_id, topic);
CREATE INDEX IF NOT EXISTS idx_adaptive_sets_student ON adaptive_sets(student_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_sets_incomplete ON adaptive_sets(student_id, is_completed) WHERE NOT is_completed;

-- RLS 정책: 본인 데이터만 접근
CREATE POLICY stl_select ON student_topic_level FOR SELECT USING (true);
CREATE POLICY stl_insert ON student_topic_level FOR INSERT WITH CHECK (true);
CREATE POLICY stl_update ON student_topic_level FOR UPDATE USING (true);
CREATE POLICY as_select ON adaptive_sets FOR SELECT USING (true);
CREATE POLICY as_insert ON adaptive_sets FOR INSERT WITH CHECK (true);
CREATE POLICY as_update ON adaptive_sets FOR UPDATE USING (true);
