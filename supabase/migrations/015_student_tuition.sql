-- 015: 학생별 수납 관리 — 수납일, 월별 결제 기록

-- 학생 테이블에 수납일(매월 몇일) 추가
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_day INT;
COMMENT ON COLUMN students.payment_day IS '매월 수납일 (1~31)';

-- 월별 수납 기록 테이블
CREATE TABLE IF NOT EXISTS tuition_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,           -- '2026-03' 형식
  amount INT NOT NULL DEFAULT 0,      -- 금액 (원)
  method TEXT NOT NULL DEFAULT '',     -- '현금' | '카드' | '이체'
  paid_at TIMESTAMPTZ DEFAULT now(),  -- 수납 일시
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, year_month)      -- 학생당 월 1건
);

-- RLS
ALTER TABLE tuition_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tuition_select" ON tuition_payments
  FOR SELECT USING (true);

CREATE POLICY "tuition_insert" ON tuition_payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "tuition_update" ON tuition_payments
  FOR UPDATE USING (true);

CREATE POLICY "tuition_delete" ON tuition_payments
  FOR DELETE USING (true);
