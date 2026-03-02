-- ============================================
-- 벡터 차원 변경: 768 → 1024 (Voyage AI voyage-3 기본 차원)
-- ============================================

-- 1. 기존 IVFFlat 인덱스 삭제
DROP INDEX IF EXISTS idx_problem_embeddings_embedding;

-- 2. 임베딩 컬럼 타입 변경 (768 → 1024)
ALTER TABLE problem_embeddings
  ALTER COLUMN embedding TYPE VECTOR(1024);

-- 3. IVFFlat 인덱스 재생성
CREATE INDEX idx_problem_embeddings_embedding
  ON problem_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. 벡터 전용 검색 함수 업데이트
CREATE OR REPLACE FUNCTION search_similar_problems(
  query_embedding VECTOR(1024),
  match_grade TEXT,
  match_topic TEXT,
  match_count INT DEFAULT 5
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  answer TEXT,
  solution TEXT,
  similarity FLOAT
)
AS $$
  SELECT
    pe.id,
    pe.content,
    pe.answer,
    pe.solution,
    (1 - (pe.embedding <=> query_embedding))::FLOAT AS similarity
  FROM problem_embeddings pe
  WHERE pe.grade = match_grade
    AND pe.topic = match_topic
    AND pe.embedding IS NOT NULL
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE;

-- 5. 하이브리드 검색 함수 업데이트
CREATE OR REPLACE FUNCTION search_problems_hybrid(
  query_embedding VECTOR(1024),
  query_text TEXT,
  match_grade TEXT,
  match_topic TEXT,
  match_count INT DEFAULT 10,
  vector_weight FLOAT DEFAULT 0.6,
  fulltext_weight FLOAT DEFAULT 0.4,
  rrf_k INT DEFAULT 60
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  answer TEXT,
  solution TEXT,
  difficulty TEXT,
  vector_similarity FLOAT,
  fulltext_rank FLOAT,
  rrf_score FLOAT
)
AS $$
WITH
vector_results AS (
  SELECT
    pe.id,
    pe.content,
    pe.answer,
    pe.solution,
    pe.difficulty,
    (1 - (pe.embedding <=> query_embedding))::FLOAT AS similarity,
    ROW_NUMBER() OVER (ORDER BY pe.embedding <=> query_embedding) AS rank_pos
  FROM problem_embeddings pe
  WHERE pe.grade = match_grade
    AND pe.topic = match_topic
    AND pe.embedding IS NOT NULL
  ORDER BY pe.embedding <=> query_embedding
  LIMIT 20
),
fulltext_results AS (
  SELECT
    pe.id,
    pe.content,
    pe.answer,
    pe.solution,
    pe.difficulty,
    ts_rank_cd(pe.content_tsv, plainto_tsquery('simple', query_text))::FLOAT AS ft_rank,
    ROW_NUMBER() OVER (
      ORDER BY ts_rank_cd(pe.content_tsv, plainto_tsquery('simple', query_text)) DESC
    ) AS rank_pos
  FROM problem_embeddings pe
  WHERE pe.grade = match_grade
    AND pe.topic = match_topic
    AND pe.content_tsv @@ plainto_tsquery('simple', query_text)
  ORDER BY ft_rank DESC
  LIMIT 20
),
combined AS (
  SELECT
    COALESCE(v.id, f.id) AS id,
    COALESCE(v.content, f.content) AS content,
    COALESCE(v.answer, f.answer) AS answer,
    COALESCE(v.solution, f.solution) AS solution,
    COALESCE(v.difficulty, f.difficulty) AS difficulty,
    COALESCE(v.similarity, 0)::FLOAT AS vector_similarity,
    COALESCE(f.ft_rank, 0)::FLOAT AS fulltext_rank,
    (vector_weight / (rrf_k + COALESCE(v.rank_pos, 1000)) +
     fulltext_weight / (rrf_k + COALESCE(f.rank_pos, 1000)))::FLOAT AS rrf_score
  FROM vector_results v
  FULL OUTER JOIN fulltext_results f ON v.id = f.id
)
SELECT
  combined.id,
  combined.content,
  combined.answer,
  combined.solution,
  combined.difficulty,
  combined.vector_similarity,
  combined.fulltext_rank,
  combined.rrf_score
FROM combined
ORDER BY combined.rrf_score DESC
LIMIT match_count;
$$ LANGUAGE sql STABLE;
