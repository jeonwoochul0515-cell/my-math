-- problem_embeddings에 INSERT/UPDATE 정책 추가
-- 스크립트에서 문제 삽입 및 임베딩 업데이트를 위해 필요

CREATE POLICY "problem_embeddings_insert" ON problem_embeddings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "problem_embeddings_update" ON problem_embeddings
  FOR UPDATE USING (true) WITH CHECK (true);
