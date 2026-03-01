-- ============================================
-- 마이매쓰 관리자 기능: academies 컬럼 추가 + payments 테이블
-- ============================================

-- 1. academies 테이블에 원장 연락처, 주소 컬럼 추가
ALTER TABLE academies ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. payments (결제 내역) 테이블 생성
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'overdue', 'cancelled')),
  method TEXT,
  memo TEXT,
  paid_at TIMESTAMPTZ,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select" ON payments FOR SELECT USING (true);
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "payments_update" ON payments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "payments_delete" ON payments FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_payments_academy_id ON payments (academy_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
