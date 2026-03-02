-- ============================================
-- 마이매쓰 하이브리드 검색: 풀텍스트 인덱스 + RRF 함수
-- ============================================

-- 1. content_tsv 컬럼 추가 (tsvector, 전문 검색용)
ALTER TABLE problem_embeddings
  ADD COLUMN IF NOT EXISTS content_tsv TSVECTOR;

-- 2. 기존 레코드의 content_tsv 채우기
--    simple 설정은 한국어 토큰을 공백 기준으로 분리 (수학 용어에 적합)
UPDATE problem_embeddings
SET content_tsv = to_tsvector('simple',
  coalesce(content, '') || ' ' ||
  coalesce(answer, '') || ' ' ||
  coalesce(topic, '')
);

-- 3. GIN 인덱스 생성 (tsvector 전문 검색용)
CREATE INDEX IF NOT EXISTS idx_problem_embeddings_tsv
  ON problem_embeddings USING gin(content_tsv);

-- 4. 자동 갱신 트리거: INSERT/UPDATE 시 content_tsv 자동 업데이트
CREATE OR REPLACE FUNCTION update_content_tsv()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_tsv := to_tsvector('simple',
    coalesce(NEW.content, '') || ' ' ||
    coalesce(NEW.answer, '') || ' ' ||
    coalesce(NEW.topic, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_content_tsv ON problem_embeddings;
CREATE TRIGGER trg_update_content_tsv
  BEFORE INSERT OR UPDATE OF content, answer, topic
  ON problem_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_content_tsv();

-- 5. 풀텍스트 전용 검색 함수
CREATE OR REPLACE FUNCTION search_problems_fulltext(
  query_text TEXT,
  match_grade TEXT,
  match_topic TEXT,
  match_count INT DEFAULT 20
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  answer TEXT,
  solution TEXT,
  rank FLOAT
)
AS $$
  SELECT
    pe.id,
    pe.content,
    pe.answer,
    pe.solution,
    ts_rank_cd(pe.content_tsv, plainto_tsquery('simple', query_text))::FLOAT AS rank
  FROM problem_embeddings pe
  WHERE pe.grade = match_grade
    AND pe.topic = match_topic
    AND pe.content_tsv @@ plainto_tsquery('simple', query_text)
  ORDER BY rank DESC
  LIMIT match_count;
$$ LANGUAGE sql STABLE;

-- 6. 하이브리드 검색 함수 (벡터 + 풀텍스트 + RRF)
--    k = 60 (RRF 표준 상수)
--    vector_weight = 0.6 (벡터 검색 가중치, 의미 유사도 중시)
--    fulltext_weight = 0.4 (풀텍스트 검색 가중치, 키워드 매칭 보완)
CREATE OR REPLACE FUNCTION search_problems_hybrid(
  query_embedding VECTOR(768),
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
-- 벡터 검색: 상위 20개 (코사인 유사도)
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
-- 풀텍스트 검색: 상위 20개 (ts_rank)
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
-- RRF 합산: 두 결과를 합치고 점수 계산
combined AS (
  SELECT
    COALESCE(v.id, f.id) AS id,
    COALESCE(v.content, f.content) AS content,
    COALESCE(v.answer, f.answer) AS answer,
    COALESCE(v.solution, f.solution) AS solution,
    COALESCE(v.difficulty, f.difficulty) AS difficulty,
    COALESCE(v.similarity, 0)::FLOAT AS vector_similarity,
    COALESCE(f.ft_rank, 0)::FLOAT AS fulltext_rank,
    -- RRF: score = weight / (k + rank)
    -- 결과에 없으면 rank=1000 → 매우 낮은 점수
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
