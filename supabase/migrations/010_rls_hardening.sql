-- ============================================
-- 010: RLS 정책 강화
-- 002에서 Firebase Auth 호환을 위해 모든 정책을 USING(true)로 열어둔 것을
-- academy_id 기반 필터링으로 실용적 수준으로 강화한다.
--
-- 설계 원칙:
-- 1) 앱이 anon key를 사용하므로 JWT 기반 정책은 불가.
--    대신 academy_id를 앱에서 명시적으로 전달하는 방식으로 격리.
-- 2) SELECT: academy_id 필터를 앱 레벨에서 수행 (RLS에서 완전 차단 불가).
--    단, INSERT/UPDATE/DELETE에서 academy_id NOT NULL을 강제하여 데이터 무결성 확보.
-- 3) problem_embeddings, curriculum_sections, generated_problems:
--    공개 데이터이므로 SELECT 허용, 쓰기는 제한.
-- 4) 민감한 테이블(payments, ai_reports)은 가능한 범위에서 제한.
--
-- 참고: 완전한 보안은 Supabase Auth 도입 후 JWT 기반 정책으로 전환 시 달성 가능.
--       현 단계에서는 "실수로 다른 학원 데이터를 조작하는 것"을 방지하는 수준.
-- ============================================

-- ============================================
-- 1. academies (학원)
-- SELECT: 허용 (앱에서 owner_id로 필터링)
-- INSERT: owner_id 필수
-- UPDATE/DELETE: 허용 (앱 레벨에서 자기 학원만 접근)
-- ============================================
-- 기존 정책 제거
DROP POLICY IF EXISTS "academies_select" ON academies;
DROP POLICY IF EXISTS "academies_insert" ON academies;
DROP POLICY IF EXISTS "academies_update" ON academies;
DROP POLICY IF EXISTS "academies_delete" ON academies;

CREATE POLICY "academies_select_v2" ON academies
  FOR SELECT USING (true);

CREATE POLICY "academies_insert_v2" ON academies
  FOR INSERT WITH CHECK (owner_id IS NOT NULL AND name IS NOT NULL);

CREATE POLICY "academies_update_v2" ON academies
  FOR UPDATE USING (true) WITH CHECK (owner_id IS NOT NULL);

CREATE POLICY "academies_delete_v2" ON academies
  FOR DELETE USING (true);

-- ============================================
-- 2. classes (반)
-- academy_id NOT NULL 강제 (INSERT/UPDATE)
-- ============================================
DROP POLICY IF EXISTS "classes_select" ON classes;
DROP POLICY IF EXISTS "classes_insert" ON classes;
DROP POLICY IF EXISTS "classes_update" ON classes;
DROP POLICY IF EXISTS "classes_delete" ON classes;

CREATE POLICY "classes_select_v2" ON classes
  FOR SELECT USING (true);

CREATE POLICY "classes_insert_v2" ON classes
  FOR INSERT WITH CHECK (academy_id IS NOT NULL);

CREATE POLICY "classes_update_v2" ON classes
  FOR UPDATE USING (true) WITH CHECK (academy_id IS NOT NULL);

CREATE POLICY "classes_delete_v2" ON classes
  FOR DELETE USING (true);

-- ============================================
-- 3. students (학생)
-- academy_id NOT NULL 강제 (INSERT/UPDATE)
-- pin은 INSERT 시 필수
-- ============================================
DROP POLICY IF EXISTS "students_select" ON students;
DROP POLICY IF EXISTS "students_insert" ON students;
DROP POLICY IF EXISTS "students_update" ON students;
DROP POLICY IF EXISTS "students_delete" ON students;

CREATE POLICY "students_select_v2" ON students
  FOR SELECT USING (true);

CREATE POLICY "students_insert_v2" ON students
  FOR INSERT WITH CHECK (
    academy_id IS NOT NULL
    AND name IS NOT NULL
    AND pin IS NOT NULL
    AND LENGTH(pin) = 4
  );

CREATE POLICY "students_update_v2" ON students
  FOR UPDATE USING (true) WITH CHECK (academy_id IS NOT NULL);

CREATE POLICY "students_delete_v2" ON students
  FOR DELETE USING (true);

-- ============================================
-- 4. attendance (출결)
-- student_id가 유효한 학생을 참조하는지 FK로 보장 (이미 있음)
-- ============================================
DROP POLICY IF EXISTS "attendance_select" ON attendance;
DROP POLICY IF EXISTS "attendance_insert" ON attendance;
DROP POLICY IF EXISTS "attendance_update" ON attendance;
DROP POLICY IF EXISTS "attendance_delete" ON attendance;

CREATE POLICY "attendance_select_v2" ON attendance
  FOR SELECT USING (true);

CREATE POLICY "attendance_insert_v2" ON attendance
  FOR INSERT WITH CHECK (student_id IS NOT NULL);

CREATE POLICY "attendance_update_v2" ON attendance
  FOR UPDATE USING (true) WITH CHECK (student_id IS NOT NULL);

-- DELETE: 출결 기록 삭제 방지 (감사 추적용)
CREATE POLICY "attendance_delete_v2" ON attendance
  FOR DELETE USING (false);

-- ============================================
-- 5. problem_embeddings (AIHub 원본 문제 + 벡터)
-- SELECT: 모든 사용자 허용 (공개 문제 은행)
-- INSERT/UPDATE: 허용 유지 (스크립트에서 사용, 추후 서비스 역할로 제한)
-- DELETE: 차단 (원본 문제 보호)
-- ============================================
DROP POLICY IF EXISTS "문제 임베딩 누구나 조회" ON problem_embeddings;
DROP POLICY IF EXISTS "problem_embeddings_insert" ON problem_embeddings;
DROP POLICY IF EXISTS "problem_embeddings_update" ON problem_embeddings;

CREATE POLICY "problem_embeddings_select_v2" ON problem_embeddings
  FOR SELECT USING (true);

CREATE POLICY "problem_embeddings_insert_v2" ON problem_embeddings
  FOR INSERT WITH CHECK (content IS NOT NULL AND grade IS NOT NULL AND topic IS NOT NULL);

CREATE POLICY "problem_embeddings_update_v2" ON problem_embeddings
  FOR UPDATE USING (true) WITH CHECK (content IS NOT NULL);

CREATE POLICY "problem_embeddings_delete_v2" ON problem_embeddings
  FOR DELETE USING (false);

-- ============================================
-- 6. generated_problems (AI 생성 문제)
-- SELECT: 모든 사용자 허용
-- INSERT: academy_id 있으면 유효해야 함 (NULL도 허용 - 공개 문제)
-- DELETE: 차단 (생성된 문제는 solve_logs에서 참조)
-- ============================================
DROP POLICY IF EXISTS "generated_problems_select" ON generated_problems;
DROP POLICY IF EXISTS "generated_problems_insert" ON generated_problems;
DROP POLICY IF EXISTS "generated_problems_update" ON generated_problems;
DROP POLICY IF EXISTS "generated_problems_delete" ON generated_problems;

CREATE POLICY "generated_problems_select_v2" ON generated_problems
  FOR SELECT USING (true);

CREATE POLICY "generated_problems_insert_v2" ON generated_problems
  FOR INSERT WITH CHECK (content IS NOT NULL AND grade IS NOT NULL AND topic IS NOT NULL);

CREATE POLICY "generated_problems_update_v2" ON generated_problems
  FOR UPDATE USING (true);

-- 삭제 차단: solve_logs FK 참조 보호
CREATE POLICY "generated_problems_delete_v2" ON generated_problems
  FOR DELETE USING (false);

-- ============================================
-- 7. solve_logs (학생 풀이 기록)
-- INSERT: student_id, problem_id 필수
-- UPDATE: is_correct 수정만 허용되도록 (앱 레벨)
-- DELETE: 차단 (학습 기록 보호)
-- ============================================
DROP POLICY IF EXISTS "solve_logs_select" ON solve_logs;
DROP POLICY IF EXISTS "solve_logs_insert" ON solve_logs;
DROP POLICY IF EXISTS "solve_logs_update" ON solve_logs;
DROP POLICY IF EXISTS "solve_logs_delete" ON solve_logs;

CREATE POLICY "solve_logs_select_v2" ON solve_logs
  FOR SELECT USING (true);

CREATE POLICY "solve_logs_insert_v2" ON solve_logs
  FOR INSERT WITH CHECK (student_id IS NOT NULL AND problem_id IS NOT NULL);

CREATE POLICY "solve_logs_update_v2" ON solve_logs
  FOR UPDATE USING (true);

-- 삭제 차단: 학습 기록 보존
CREATE POLICY "solve_logs_delete_v2" ON solve_logs
  FOR DELETE USING (false);

-- ============================================
-- 8. notifications (알림)
-- ============================================
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
DROP POLICY IF EXISTS "notifications_delete" ON notifications;

CREATE POLICY "notifications_select_v2" ON notifications
  FOR SELECT USING (true);

CREATE POLICY "notifications_insert_v2" ON notifications
  FOR INSERT WITH CHECK (student_id IS NOT NULL AND type IS NOT NULL);

CREATE POLICY "notifications_update_v2" ON notifications
  FOR UPDATE USING (true);

CREATE POLICY "notifications_delete_v2" ON notifications
  FOR DELETE USING (true);

-- ============================================
-- 9. payments (결제 내역) - 민감 데이터
-- DELETE: 차단 (결제 기록 보호)
-- ============================================
DROP POLICY IF EXISTS "payments_select" ON payments;
DROP POLICY IF EXISTS "payments_insert" ON payments;
DROP POLICY IF EXISTS "payments_update" ON payments;
DROP POLICY IF EXISTS "payments_delete" ON payments;

CREATE POLICY "payments_select_v2" ON payments
  FOR SELECT USING (true);

CREATE POLICY "payments_insert_v2" ON payments
  FOR INSERT WITH CHECK (academy_id IS NOT NULL AND amount > 0);

CREATE POLICY "payments_update_v2" ON payments
  FOR UPDATE USING (true) WITH CHECK (academy_id IS NOT NULL);

-- 삭제 차단: 결제 기록 보호
CREATE POLICY "payments_delete_v2" ON payments
  FOR DELETE USING (false);

-- ============================================
-- 10. problem_assignments (문제 배정)
-- ============================================
DROP POLICY IF EXISTS "problem_assignments_select" ON problem_assignments;
DROP POLICY IF EXISTS "problem_assignments_insert" ON problem_assignments;
DROP POLICY IF EXISTS "problem_assignments_update" ON problem_assignments;
DROP POLICY IF EXISTS "problem_assignments_delete" ON problem_assignments;

CREATE POLICY "problem_assignments_select_v2" ON problem_assignments
  FOR SELECT USING (true);

CREATE POLICY "problem_assignments_insert_v2" ON problem_assignments
  FOR INSERT WITH CHECK (
    student_id IS NOT NULL
    AND problem_id IS NOT NULL
    AND academy_id IS NOT NULL
  );

CREATE POLICY "problem_assignments_update_v2" ON problem_assignments
  FOR UPDATE USING (true);

-- 삭제 차단: 배정 기록 보존
CREATE POLICY "problem_assignments_delete_v2" ON problem_assignments
  FOR DELETE USING (false);

-- ============================================
-- 11. ocr_results (OCR 채점 결과)
-- ============================================
DROP POLICY IF EXISTS "ocr_results_select" ON ocr_results;
DROP POLICY IF EXISTS "ocr_results_insert" ON ocr_results;
DROP POLICY IF EXISTS "ocr_results_update" ON ocr_results;
DROP POLICY IF EXISTS "ocr_results_delete" ON ocr_results;

CREATE POLICY "ocr_results_select_v2" ON ocr_results
  FOR SELECT USING (true);

CREATE POLICY "ocr_results_insert_v2" ON ocr_results
  FOR INSERT WITH CHECK (student_id IS NOT NULL AND problem_id IS NOT NULL);

CREATE POLICY "ocr_results_update_v2" ON ocr_results
  FOR UPDATE USING (true);

CREATE POLICY "ocr_results_delete_v2" ON ocr_results
  FOR DELETE USING (false);

-- ============================================
-- 12. wrong_answer_notes (오답 노트)
-- ============================================
DROP POLICY IF EXISTS "wrong_answer_notes_select" ON wrong_answer_notes;
DROP POLICY IF EXISTS "wrong_answer_notes_insert" ON wrong_answer_notes;
DROP POLICY IF EXISTS "wrong_answer_notes_update" ON wrong_answer_notes;
DROP POLICY IF EXISTS "wrong_answer_notes_delete" ON wrong_answer_notes;

CREATE POLICY "wrong_answer_notes_select_v2" ON wrong_answer_notes
  FOR SELECT USING (true);

CREATE POLICY "wrong_answer_notes_insert_v2" ON wrong_answer_notes
  FOR INSERT WITH CHECK (student_id IS NOT NULL AND problem_id IS NOT NULL);

CREATE POLICY "wrong_answer_notes_update_v2" ON wrong_answer_notes
  FOR UPDATE USING (true);

CREATE POLICY "wrong_answer_notes_delete_v2" ON wrong_answer_notes
  FOR DELETE USING (false);

-- ============================================
-- 13. ai_reports (AI 분석 리포트) - 민감 데이터
-- ============================================
DROP POLICY IF EXISTS "ai_reports_select" ON ai_reports;
DROP POLICY IF EXISTS "ai_reports_insert" ON ai_reports;
DROP POLICY IF EXISTS "ai_reports_update" ON ai_reports;
DROP POLICY IF EXISTS "ai_reports_delete" ON ai_reports;

CREATE POLICY "ai_reports_select_v2" ON ai_reports
  FOR SELECT USING (true);

CREATE POLICY "ai_reports_insert_v2" ON ai_reports
  FOR INSERT WITH CHECK (student_id IS NOT NULL AND report_type IS NOT NULL);

CREATE POLICY "ai_reports_update_v2" ON ai_reports
  FOR UPDATE USING (true);

-- 삭제 차단: 리포트 기록 보호
CREATE POLICY "ai_reports_delete_v2" ON ai_reports
  FOR DELETE USING (false);

-- ============================================
-- 14. curriculum_sections (교육과정)
-- SELECT: 공개 데이터
-- INSERT/UPDATE: 허용 유지 (스크립트에서 사용)
-- DELETE: 차단
-- ============================================
DROP POLICY IF EXISTS "교육과정 전체 읽기 허용" ON curriculum_sections;
DROP POLICY IF EXISTS "교육과정 서비스 역할 쓰기 허용" ON curriculum_sections;

CREATE POLICY "curriculum_sections_select_v2" ON curriculum_sections
  FOR SELECT USING (true);

CREATE POLICY "curriculum_sections_insert_v2" ON curriculum_sections
  FOR INSERT WITH CHECK (section_key IS NOT NULL AND content IS NOT NULL);

CREATE POLICY "curriculum_sections_update_v2" ON curriculum_sections
  FOR UPDATE USING (true) WITH CHECK (section_key IS NOT NULL);

CREATE POLICY "curriculum_sections_delete_v2" ON curriculum_sections
  FOR DELETE USING (false);
