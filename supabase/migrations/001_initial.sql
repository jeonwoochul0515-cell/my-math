-- ============================================
-- 마이매쓰(MyMath) 초기 데이터베이스 스키마
-- ============================================

-- pgvector 확장 활성화 (임베딩 벡터 검색용)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1. academies (학원)
-- ============================================
CREATE TABLE academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE academies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "학원 소유자만 조회" ON academies
  FOR SELECT USING (owner_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "학원 소유자만 수정" ON academies
  FOR ALL USING (owner_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================
-- 2. classes (반)
-- ============================================
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  schedule JSONB NOT NULL DEFAULT '[]',
  capacity INT NOT NULL DEFAULT 20,
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "자기 학원 반만 조회" ON classes
  FOR SELECT USING (
    academy_id IN (SELECT id FROM academies WHERE owner_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY "자기 학원 반만 수정" ON classes
  FOR ALL USING (
    academy_id IN (SELECT id FROM academies WHERE owner_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- ============================================
-- 3. students (학생)
-- ============================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  phone TEXT,
  parent_phone TEXT,
  pin TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "자기 학원 학생만 조회" ON students
  FOR SELECT USING (
    academy_id IN (SELECT id FROM academies WHERE owner_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY "자기 학원 학생만 수정" ON students
  FOR ALL USING (
    academy_id IN (SELECT id FROM academies WHERE owner_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- ============================================
-- 4. attendance (출결)
-- ============================================
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "자기 학원 출결만 조회" ON attendance
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students WHERE academy_id IN (
        SELECT id FROM academies WHERE owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );

CREATE POLICY "자기 학원 출결만 수정" ON attendance
  FOR ALL USING (
    student_id IN (
      SELECT id FROM students WHERE academy_id IN (
        SELECT id FROM academies WHERE owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );

-- ============================================
-- 5. problem_embeddings (AIHub 원본 문제 + 벡터)
-- ============================================
CREATE TABLE problem_embeddings (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  answer TEXT NOT NULL,
  solution TEXT,
  grade TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT 'aihub',
  embedding VECTOR(768)
);

ALTER TABLE problem_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "문제 임베딩 누구나 조회" ON problem_embeddings
  FOR SELECT USING (true);

-- 벡터 검색 인덱스
CREATE INDEX idx_problem_embeddings_vector ON problem_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_problem_embeddings_grade_topic ON problem_embeddings (grade, topic);

-- ============================================
-- 6. generated_problems (AI 생성 문제)
-- ============================================
CREATE TABLE generated_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  answer TEXT NOT NULL,
  solution TEXT,
  grade TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  choices JSONB NOT NULL DEFAULT '[]',
  source_refs BIGINT[],
  similarity_score FLOAT,
  academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE generated_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "자기 학원 생성 문제 조회" ON generated_problems
  FOR SELECT USING (
    academy_id IS NULL OR academy_id IN (
      SELECT id FROM academies WHERE owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "자기 학원 생성 문제 수정" ON generated_problems
  FOR ALL USING (
    academy_id IN (
      SELECT id FROM academies WHERE owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- ============================================
-- 7. solve_logs (학생 풀이 기록)
-- ============================================
CREATE TABLE solve_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES generated_problems(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  solved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE solve_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "자기 학원 풀이 기록 조회" ON solve_logs
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students WHERE academy_id IN (
        SELECT id FROM academies WHERE owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );

CREATE POLICY "자기 학원 풀이 기록 수정" ON solve_logs
  FOR ALL USING (
    student_id IN (
      SELECT id FROM students WHERE academy_id IN (
        SELECT id FROM academies WHERE owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );

-- ============================================
-- 8. notifications (알림)
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('attendance', 'grade', 'weakness')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "자기 학원 알림 조회" ON notifications
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students WHERE academy_id IN (
        SELECT id FROM academies WHERE owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );

CREATE POLICY "자기 학원 알림 수정" ON notifications
  FOR ALL USING (
    student_id IN (
      SELECT id FROM students WHERE academy_id IN (
        SELECT id FROM academies WHERE owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );

-- ============================================
-- 9. 벡터 유사도 검색 함수
-- ============================================
CREATE OR REPLACE FUNCTION search_similar_problems(
  query_embedding VECTOR(768),
  match_grade TEXT,
  match_topic TEXT,
  match_count INT DEFAULT 5
) RETURNS TABLE (id BIGINT, content TEXT, answer TEXT, solution TEXT, similarity FLOAT)
AS $$
  SELECT
    pe.id,
    pe.content,
    pe.answer,
    pe.solution,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM problem_embeddings pe
  WHERE pe.grade = match_grade AND pe.topic = match_topic
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
