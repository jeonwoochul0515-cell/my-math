-- ============================================
-- 008: 기능 확장 v2 — 문제 배정, OCR 채점, 오답 노트, AI 리포트
-- ============================================

-- ============================================
-- 1. problem_assignments (문제 배정)
-- 원장이 학생에게 문제를 배정하고 진행 상태를 추적
-- ============================================
CREATE TABLE problem_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES generated_problems(id) ON DELETE CASCADE,
  assigned_by TEXT NOT NULL,
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  UNIQUE(student_id, problem_id)
);

-- RLS 활성화
ALTER TABLE problem_assignments ENABLE ROW LEVEL SECURITY;

-- anon 역할 허용 정책 (앱에서 anon key 사용)
CREATE POLICY "problem_assignments_select" ON problem_assignments FOR SELECT USING (true);
CREATE POLICY "problem_assignments_insert" ON problem_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "problem_assignments_update" ON problem_assignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "problem_assignments_delete" ON problem_assignments FOR DELETE USING (true);

-- 성능 인덱스: 학생별 상태 조회
CREATE INDEX idx_problem_assignments_student_status ON problem_assignments (student_id, status);

-- ============================================
-- 2. ocr_results (OCR 채점 결과)
-- 학생 손글씨 답안의 OCR 인식 결과 및 채점 정보
-- ============================================
CREATE TABLE ocr_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES generated_problems(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES problem_assignments(id) ON DELETE SET NULL,
  recognized_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  error_analysis TEXT,
  weak_topics JSONB DEFAULT '[]',
  confidence FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;

-- anon 역할 허용 정책
CREATE POLICY "ocr_results_select" ON ocr_results FOR SELECT USING (true);
CREATE POLICY "ocr_results_insert" ON ocr_results FOR INSERT WITH CHECK (true);
CREATE POLICY "ocr_results_update" ON ocr_results FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "ocr_results_delete" ON ocr_results FOR DELETE USING (true);

-- 성능 인덱스: 학생별 최신 결과 조회
CREATE INDEX idx_ocr_results_student_created ON ocr_results (student_id, created_at DESC);

-- ============================================
-- 3. wrong_answer_notes (오답 노트)
-- 틀린 문제를 기록하고 재학습 여부를 추적
-- ============================================
CREATE TABLE wrong_answer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES generated_problems(id) ON DELETE CASCADE,
  original_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  error_analysis TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, problem_id)
);

-- RLS 활성화
ALTER TABLE wrong_answer_notes ENABLE ROW LEVEL SECURITY;

-- anon 역할 허용 정책
CREATE POLICY "wrong_answer_notes_select" ON wrong_answer_notes FOR SELECT USING (true);
CREATE POLICY "wrong_answer_notes_insert" ON wrong_answer_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "wrong_answer_notes_update" ON wrong_answer_notes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "wrong_answer_notes_delete" ON wrong_answer_notes FOR DELETE USING (true);

-- 성능 인덱스: 학생별 미해결 오답 조회
CREATE INDEX idx_wrong_answer_notes_student_resolved ON wrong_answer_notes (student_id, is_resolved, created_at DESC);

-- ============================================
-- 4. ai_reports (AI 분석 리포트)
-- 약점 분석, 학부모 보고서, 학습 지도 계획
-- ============================================
CREATE TABLE ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('weakness', 'parent_analysis', 'guidance_plan')),
  content TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- anon 역할 허용 정책
CREATE POLICY "ai_reports_select" ON ai_reports FOR SELECT USING (true);
CREATE POLICY "ai_reports_insert" ON ai_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "ai_reports_update" ON ai_reports FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "ai_reports_delete" ON ai_reports FOR DELETE USING (true);

-- 성능 인덱스: 학생별 리포트 유형별 최신 조회
CREATE INDEX idx_ai_reports_student_type_created ON ai_reports (student_id, report_type, created_at DESC);

-- ============================================
-- 5. solve_logs 테이블 컬럼 추가
-- 배정 연결, 오류 분석, 약점 단원 추적용
-- ============================================
ALTER TABLE solve_logs ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES problem_assignments(id) ON DELETE SET NULL;
ALTER TABLE solve_logs ADD COLUMN IF NOT EXISTS error_analysis TEXT;
ALTER TABLE solve_logs ADD COLUMN IF NOT EXISTS weak_topics JSONB DEFAULT '[]';
