-- 007: 2022 개정 수학과 교육과정 섹션 저장 테이블
-- 학년/과목별로 분할된 교육과정 텍스트를 저장하여
-- AI 문제 생성 시 해당 학년/단원의 성취기준을 Claude 프롬프트에 포함시킨다.

CREATE TABLE curriculum_sections (
  id SERIAL PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  grade_group TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  domains JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: 교육과정은 공개 데이터이므로 모든 사용자에게 읽기 허용
ALTER TABLE curriculum_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "교육과정 전체 읽기 허용"
  ON curriculum_sections FOR SELECT USING (true);

-- 서비스 역할(스크립트)에서 INSERT/UPDATE 허용
CREATE POLICY "교육과정 서비스 역할 쓰기 허용"
  ON curriculum_sections FOR ALL USING (true);
