-- ============================================
-- RLS 정책 수정: Firebase Auth 호환
-- JWT 기반 정책을 허용 정책으로 변경
-- (추후 Supabase Auth 도입 시 다시 제한)
-- ============================================

-- ============================================
-- 1. academies (학원)
-- ============================================
DROP POLICY IF EXISTS "학원 소유자만 조회" ON academies;
DROP POLICY IF EXISTS "학원 소유자만 수정" ON academies;

CREATE POLICY "academies_select" ON academies FOR SELECT USING (true);
CREATE POLICY "academies_insert" ON academies FOR INSERT WITH CHECK (true);
CREATE POLICY "academies_update" ON academies FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "academies_delete" ON academies FOR DELETE USING (true);

-- ============================================
-- 2. classes (반)
-- ============================================
DROP POLICY IF EXISTS "자기 학원 반만 조회" ON classes;
DROP POLICY IF EXISTS "자기 학원 반만 수정" ON classes;

CREATE POLICY "classes_select" ON classes FOR SELECT USING (true);
CREATE POLICY "classes_insert" ON classes FOR INSERT WITH CHECK (true);
CREATE POLICY "classes_update" ON classes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "classes_delete" ON classes FOR DELETE USING (true);

-- ============================================
-- 3. students (학생)
-- ============================================
DROP POLICY IF EXISTS "자기 학원 학생만 조회" ON students;
DROP POLICY IF EXISTS "자기 학원 학생만 수정" ON students;

CREATE POLICY "students_select" ON students FOR SELECT USING (true);
CREATE POLICY "students_insert" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "students_update" ON students FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "students_delete" ON students FOR DELETE USING (true);

-- ============================================
-- 4. attendance (출결)
-- ============================================
DROP POLICY IF EXISTS "자기 학원 출결만 조회" ON attendance;
DROP POLICY IF EXISTS "자기 학원 출결만 수정" ON attendance;

CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (true);
CREATE POLICY "attendance_insert" ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "attendance_update" ON attendance FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "attendance_delete" ON attendance FOR DELETE USING (true);

-- ============================================
-- 5. problem_embeddings (AIHub 원본 문제 + 벡터)
-- 이미 허용 정책("문제 임베딩 누구나 조회")이므로 변경 없음
-- ============================================

-- ============================================
-- 6. generated_problems (AI 생성 문제)
-- ============================================
DROP POLICY IF EXISTS "자기 학원 생성 문제 조회" ON generated_problems;
DROP POLICY IF EXISTS "자기 학원 생성 문제 수정" ON generated_problems;

CREATE POLICY "generated_problems_select" ON generated_problems FOR SELECT USING (true);
CREATE POLICY "generated_problems_insert" ON generated_problems FOR INSERT WITH CHECK (true);
CREATE POLICY "generated_problems_update" ON generated_problems FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "generated_problems_delete" ON generated_problems FOR DELETE USING (true);

-- ============================================
-- 7. solve_logs (학생 풀이 기록)
-- ============================================
DROP POLICY IF EXISTS "자기 학원 풀이 기록 조회" ON solve_logs;
DROP POLICY IF EXISTS "자기 학원 풀이 기록 수정" ON solve_logs;

CREATE POLICY "solve_logs_select" ON solve_logs FOR SELECT USING (true);
CREATE POLICY "solve_logs_insert" ON solve_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "solve_logs_update" ON solve_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "solve_logs_delete" ON solve_logs FOR DELETE USING (true);

-- ============================================
-- 8. notifications (알림)
-- ============================================
DROP POLICY IF EXISTS "자기 학원 알림 조회" ON notifications;
DROP POLICY IF EXISTS "자기 학원 알림 수정" ON notifications;

CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (true);
