/**
 * AI 서비스 모듈 - 하이브리드 검색(벡터+풀텍스트+RRF) + Claude 리랭킹 기반 문제 생성
 *
 * 이 모듈은 다음 기능을 제공합니다:
 * 1. 텍스트 임베딩 생성 (Voyage AI API)
 * 2. 하이브리드 문제 검색 (벡터 + 풀텍스트 + RRF 합산)
 * 3. Claude 리랭킹 (참고 문제 품질 필터링)
 * 4. RAG 기반 AI 문제 생성 (하이브리드 검색 -> 리랭킹 -> Claude 생성)
 * 5. 학생 약점 분석 (풀이 기록 기반)
 */

import { supabase } from '../config/supabase';
import type { WeaknessReport, FigureSpec } from '../types';
import { getCurriculumLookup } from '../utils/curriculumMapping';

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

/** pgvector 유사 문제 검색 결과 (기존 호환) */
export interface SimilarProblem {
  id: number;
  content: string;
  answer: string;
  solution: string;
  similarity: number;
}

/** 하이브리드 검색 결과 (벡터 + 풀텍스트 + RRF) */
export interface HybridSearchResult {
  id: number;
  content: string;
  answer: string;
  solution: string;
  difficulty: string;
  vectorSimilarity: number;
  fulltextRank: number;
  rrfScore: number;
}

/** AI가 생성한 문제 */
export interface GeneratedProblem {
  id: string;
  content: string;
  answer: string;
  solution: string;
  choices: string[];
  grade: string;
  topic: string;
  subTopic?: string;
  difficulty: string;
  figure?: FigureSpec;
}

/** 문제 생성 요청 파라미터 */
export interface GenerateParams {
  grade: string;
  topic: string;
  subTopic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
}

/** 유사 문제 검색 파라미터 */
export interface SearchParams {
  query: string;
  grade: string;
  topic: string;
  count?: number;
}

// ---------------------------------------------------------------------------
// 교육과정 영역 텍스트 추출
// ---------------------------------------------------------------------------

/**
 * 교육과정 섹션 텍스트에서 특정 영역(domain)에 해당하는 부분만 추출한다.
 * 큰 섹션(예: 중학교 38페이지)에서 해당 영역만 추출하여 프롬프트 크기를 관리한다.
 *
 * @param content - 교육과정 섹션 전체 텍스트
 * @param domain - 추출할 영역명 (null이면 전체 반환)
 * @param maxChars - 최대 문자 수 (기본 6000)
 * @returns 해당 영역의 텍스트 (maxChars 이내)
 */
export function extractDomainContent(
  content: string,
  domain: string | null,
  maxChars: number = 6000
): string {
  /** domain이 null이면 (고등) → 전체 content 반환 (maxChars 제한) */
  if (!domain) {
    if (content.length <= maxChars) return content;
    /** 마지막 완전한 성취기준에서 자름 */
    const truncated = content.slice(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    return lastPeriod > 0 ? truncated.slice(0, lastPeriod + 1) : truncated;
  }

  /** 텍스트에서 (N) {영역명} 패턴을 찾아 해당 영역 시작~다음 영역 시작까지 추출 */
  const domainPattern = new RegExp(`\\(\\d+\\)\\s*${domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const match = domainPattern.exec(content);

  if (!match) {
    /** 영역 패턴을 못 찾으면 전체 반환 (maxChars 제한) */
    if (content.length <= maxChars) return content;
    const truncated = content.slice(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    return lastPeriod > 0 ? truncated.slice(0, lastPeriod + 1) : truncated;
  }

  const startIdx = match.index;

  /** 다음 영역 시작 패턴: (N+1) 또는 다음 (숫자) */
  const nextDomainPattern = /\(\d+\)\s*[가-힣]/g;
  nextDomainPattern.lastIndex = startIdx + match[0].length;
  const nextMatch = nextDomainPattern.exec(content);

  const endIdx = nextMatch ? nextMatch.index : content.length;
  let extracted = content.slice(startIdx, endIdx).trim();

  /** maxChars 제한 */
  if (extracted.length > maxChars) {
    extracted = extracted.slice(0, maxChars);
    const lastPeriod = extracted.lastIndexOf('.');
    extracted = lastPeriod > 0 ? extracted.slice(0, lastPeriod + 1) : extracted;
  }

  return extracted;
}

// ---------------------------------------------------------------------------
// 1. 텍스트 임베딩 함수
// ---------------------------------------------------------------------------

/**
 * Voyage AI 임베딩 API를 호출하여 텍스트의 벡터 임베딩을 생성한다.
 * Cloudflare Pages Function(/api/embed)을 경유하여 서버 사이드에서 API 키를 사용한다.
 *
 * @param text - 임베딩할 텍스트
 * @returns 1024차원 벡터 배열
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: [text] }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error ?? '임베딩 생성에 실패했습니다.');
    }

    const result = (await response.json()) as { embeddings: number[][] };

    if (!result.embeddings?.[0]) {
      throw new Error('임베딩 결과가 비어있습니다.');
    }

    return result.embeddings[0];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`임베딩 생성 오류: ${error.message}`);
    }
    throw new Error('임베딩 생성 중 알 수 없는 오류가 발생했습니다.');
  }
}

/**
 * 여러 텍스트의 임베딩을 한 번에 생성한다. (배치 처리)
 *
 * @param texts - 임베딩할 텍스트 배열
 * @returns 각 텍스트에 대한 1024차원 벡터 배열
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const response = await fetch('/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error ?? '배치 임베딩 생성에 실패했습니다.');
    }

    const result = (await response.json()) as { embeddings: number[][] };

    if (!result.embeddings?.length) {
      throw new Error('임베딩 결과가 비어있습니다.');
    }

    return result.embeddings;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`배치 임베딩 생성 오류: ${error.message}`);
    }
    throw new Error('배치 임베딩 생성 중 알 수 없는 오류가 발생했습니다.');
  }
}

// ---------------------------------------------------------------------------
// 2. 유사 문제 검색 (기존 벡터 전용 — 폴백용으로 유지)
// ---------------------------------------------------------------------------

/**
 * 쿼리 텍스트를 임베딩으로 변환한 뒤 Supabase pgvector에서
 * 유사한 문제를 검색한다. (벡터 전용, 폴백용)
 */
export async function searchSimilarProblems(
  params: SearchParams
): Promise<SimilarProblem[]> {
  const { query, grade, topic, count = 5 } = params;

  try {
    const queryEmbedding = await getEmbedding(query);

    const { data, error } = await supabase.rpc('search_similar_problems', {
      query_embedding: queryEmbedding,
      match_grade: grade,
      match_topic: topic,
      match_count: count,
    });

    if (error) {
      throw new Error(`유사 문제 검색 실패: ${error.message}`);
    }

    if (!data || (data as SimilarProblem[]).length === 0) {
      return [];
    }

    return (data as Record<string, unknown>[]).map((row) => ({
      id: row.id as number,
      content: row.content as string,
      answer: row.answer as string,
      solution: row.solution as string,
      similarity: row.similarity as number,
    }));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`유사 문제 검색 오류: ${error.message}`);
    }
    throw new Error('유사 문제 검색 중 알 수 없는 오류가 발생했습니다.');
  }
}

// ---------------------------------------------------------------------------
// 3. 하이브리드 검색 (벡터 + 풀텍스트 + RRF)
// ---------------------------------------------------------------------------

/**
 * 하이브리드 검색: Voyage AI 벡터 검색 + PostgreSQL 풀텍스트 검색을
 * RRF(Reciprocal Rank Fusion)로 합산하여 최적의 참고 문제를 찾는다.
 *
 * @param queryEmbedding - Voyage AI로 생성한 쿼리 벡터
 * @param queryText - 풀텍스트 검색용 키워드
 * @param grade - 학년 필터
 * @param topic - 단원 필터
 * @param count - 반환할 결과 수 (기본 10)
 * @returns RRF 점수 기준 정렬된 문제 배열
 */
export async function searchProblemsHybrid(
  queryEmbedding: number[],
  queryText: string,
  grade: string,
  topic: string,
  count: number = 10
): Promise<HybridSearchResult[]> {
  try {
    const { data, error } = await supabase.rpc('search_problems_hybrid', {
      query_embedding: queryEmbedding,
      query_text: queryText,
      match_grade: grade,
      match_topic: topic,
      match_count: count,
      vector_weight: 0.6,
      fulltext_weight: 0.4,
      rrf_k: 60,
    });

    if (error) {
      throw new Error(`하이브리드 검색 실패: ${error.message}`);
    }

    if (!data || (data as HybridSearchResult[]).length === 0) {
      return [];
    }

    return (data as Record<string, unknown>[]).map((row) => ({
      id: row.id as number,
      content: row.content as string,
      answer: row.answer as string,
      solution: row.solution as string,
      difficulty: (row.difficulty as string) ?? '',
      vectorSimilarity: row.vector_similarity as number,
      fulltextRank: row.fulltext_rank as number,
      rrfScore: row.rrf_score as number,
    }));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`하이브리드 검색 오류: ${error.message}`);
    }
    throw new Error('하이브리드 검색 중 알 수 없는 오류가 발생했습니다.');
  }
}

// ---------------------------------------------------------------------------
// 4. Claude 리랭킹
// ---------------------------------------------------------------------------

/**
 * Claude를 사용하여 하이브리드 검색 결과를 리랭킹한다.
 * 후보 문제 중 새 문제 생성에 가장 적합한 참고 문제를 선택한다.
 *
 * @param candidates - 하이브리드 검색 결과 후보
 * @param grade - 학년
 * @param topic - 단원
 * @param difficulty - 난이도
 * @param topK - 선택할 문제 수 (기본 5)
 * @param subTopic - 세부 성취기준 (선택)
 * @returns 리랭킹된 문제 배열
 */
async function rerankWithClaude(
  candidates: HybridSearchResult[],
  grade: string,
  topic: string,
  difficulty: string,
  topK: number = 5,
  subTopic?: string
): Promise<HybridSearchResult[]> {
  /** 후보가 topK 이하면 리랭킹 불필요 */
  if (candidates.length <= topK) {
    return candidates;
  }

  try {
    const response = await fetch('/api/rerank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidates: candidates.map((c) => ({
          id: c.id,
          content: c.content,
          answer: c.answer,
          difficulty: c.difficulty,
          rrfScore: c.rrfScore,
        })),
        grade,
        topic,
        ...(subTopic ? { subTopic } : {}),
        difficulty,
        topK,
      }),
    });

    if (!response.ok) {
      /** 리랭킹 실패 시 RRF 상위 topK 반환 */
      return candidates.slice(0, topK);
    }

    const result = (await response.json()) as { rankedIds: number[]; fallback?: boolean };

    /** 리랭킹된 ID 순서로 후보 재정렬 */
    const reranked = result.rankedIds
      .map((id) => candidates.find((c) => c.id === id))
      .filter((c): c is HybridSearchResult => c !== undefined);

    /** 리랭킹 결과가 부족하면 나머지를 RRF 순서로 채움 */
    if (reranked.length < topK) {
      const usedIds = new Set(reranked.map((r) => r.id));
      const remaining = candidates.filter((c) => !usedIds.has(c.id));
      reranked.push(...remaining.slice(0, topK - reranked.length));
    }

    return reranked;
  } catch {
    /** 리랭킹 오류 시 RRF 상위 topK로 폴백 */
    return candidates.slice(0, topK);
  }
}

// ---------------------------------------------------------------------------
// 5. AI 문제 생성 (하이브리드 검색 + 리랭킹 + Claude 생성)
// ---------------------------------------------------------------------------

/**
 * RAG 기반 AI 문제 생성 파이프라인 (하이브리드 검색 버전)
 *
 * 순서:
 * 1. 쿼리 임베딩 생성 (Voyage AI)
 * 2. 하이브리드 검색 (벡터 + 풀텍스트 + RRF) → 10개 후보
 * 3. Claude 리랭킹 → 최적 5개 선택
 * 4. 참고 문제와 함께 Claude API로 문제 생성
 * 5. generated_problems 테이블에 저장 (source_refs, similarity_score 포함)
 *
 * @param params - 생성 조건 (학년, 단원, 난이도, 개수)
 * @returns 생성되어 DB에 저장된 문제 배열
 */
export async function generateProblemsWithRAG(
  params: GenerateParams
): Promise<GeneratedProblem[]> {
  const { grade, topic, subTopic, difficulty, count } = params;

  try {
    /** 1단계: 쿼리 구성 및 임베딩 생성 (세부 성취기준이 있으면 포함) */
    const vectorQuery = subTopic
      ? `${grade} ${topic} ${subTopic} ${difficulty} 수학 문제`
      : `${grade} ${topic} ${difficulty} 수학 문제`;
    const fulltextQuery = topic; // 풀텍스트는 단원명 중심
    const queryEmbedding = await getEmbedding(vectorQuery);

    /** 2단계: 하이브리드 검색 (벡터 + 풀텍스트 + RRF) */
    let searchResults: HybridSearchResult[] = [];
    let sourceRefs: number[] = [];
    let avgSimilarity = 0;

    try {
      searchResults = await searchProblemsHybrid(
        queryEmbedding,
        fulltextQuery,
        grade,
        topic,
        10
      );
    } catch {
      /** 하이브리드 검색 실패 시 벡터 전용 검색으로 폴백 */
      console.warn('하이브리드 검색 실패, 벡터 전용 검색으로 폴백합니다.');
      try {
        const fallback = await searchSimilarProblems({
          query: vectorQuery,
          grade,
          topic,
          count: 5,
        });
        searchResults = fallback.map((r) => ({
          id: r.id,
          content: r.content,
          answer: r.answer,
          solution: r.solution,
          difficulty: '',
          vectorSimilarity: r.similarity,
          fulltextRank: 0,
          rrfScore: r.similarity,
        }));
      } catch {
        console.warn('벡터 검색도 실패, 참고 문제 없이 생성합니다.');
      }
    }

    /** 3단계: Claude 리랭킹 (후보가 5개 초과 시) */
    let topResults: HybridSearchResult[];
    if (searchResults.length > 5) {
      topResults = await rerankWithClaude(searchResults, grade, topic, difficulty, 5, subTopic);
    } else {
      topResults = searchResults.slice(0, 5);
    }

    /** 참고 문제 메타데이터 추출 */
    sourceRefs = topResults.map((r) => r.id);
    avgSimilarity = topResults.length > 0
      ? topResults.reduce((sum, r) => sum + r.vectorSimilarity, 0) / topResults.length
      : 0;

    const referenceProblems = topResults.map((p) => ({
      content: p.content,
      answer: p.answer,
      solution: p.solution,
    }));

    /** 3.5단계: 교육과정 컨텍스트 조회 */
    let curriculumContext = '';
    try {
      const { sectionKey, domain } = getCurriculumLookup(grade, topic);
      if (sectionKey) {
        const { data: sectionData } = await supabase
          .from('curriculum_sections')
          .select('content')
          .eq('section_key', sectionKey)
          .single();

        if (sectionData) {
          curriculumContext = extractDomainContent(
            (sectionData as Record<string, unknown>).content as string,
            domain,
            6000
          );
        }
      }
    } catch {
      /** 교육과정 조회 실패 시 빈 문자열 유지 (기존 동작 유지) */
      console.warn('교육과정 컨텍스트 조회 실패, 교육과정 없이 생성합니다.');
    }

    /** 4단계: Claude API로 문제 생성 */
    const response = await fetch('/api/generate-problem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade,
        topic,
        ...(subTopic ? { subTopic } : {}),
        difficulty,
        count,
        referenceProblems,
        curriculumContext,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error ?? '문제 생성에 실패했습니다.');
    }

    const result = (await response.json()) as {
      problems: {
        content: string;
        answer: string;
        solution: string;
        choices: string[];
        figure?: FigureSpec;
      }[];
      verified?: boolean;
    };

    if (!result.problems?.length) {
      throw new Error('생성된 문제가 없습니다.');
    }

    /** H7: 검증 스킵 시 경고 로그 */
    if (result.verified === false) {
      console.warn('AI 검증이 스킵되었습니다. 구조 검증만 통과한 문제가 반환됩니다.');
    }

    /** 5단계: 생성된 문제를 DB에 저장 (source_refs, similarity_score 포함) */
    const savedProblems: GeneratedProblem[] = [];

    for (const problem of result.problems) {
      const { data, error } = await supabase
        .from('generated_problems')
        .insert({
          content: problem.content,
          answer: problem.answer,
          solution: problem.solution ?? '',
          grade,
          topic,
          sub_topic: subTopic ?? null,
          difficulty,
          choices: problem.choices ?? [],
          source_refs: sourceRefs.length > 0 ? sourceRefs : null,
          similarity_score: avgSimilarity > 0 ? avgSimilarity : null,
        })
        .select()
        .single();

      if (error) {
        console.warn(`문제 저장 실패: ${error.message}`);
        savedProblems.push({
          id: `temp-${Date.now()}-${String(savedProblems.length)}`,
          content: problem.content,
          answer: problem.answer,
          solution: problem.solution ?? '',
          choices: problem.choices ?? [],
          grade,
          topic,
          subTopic,
          difficulty,
          figure: problem.figure,
        });
        continue;
      }

      const row = data as Record<string, unknown>;
      savedProblems.push({
        id: row.id as string,
        content: row.content as string,
        answer: row.answer as string,
        solution: (row.solution as string) ?? '',
        choices: (row.choices as string[]) ?? [],
        grade: row.grade as string,
        topic: row.topic as string,
        subTopic,
        difficulty: row.difficulty as string,
        figure: problem.figure,
      });
    }

    return savedProblems;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`AI 문제 생성 오류: ${error.message}`);
    }
    throw new Error('AI 문제 생성 중 알 수 없는 오류가 발생했습니다.');
  }
}

// ---------------------------------------------------------------------------
// 6. 약점 분석 함수
// ---------------------------------------------------------------------------

/** 단원별 통계를 집계하기 위한 내부 타입 */
interface TopicStats {
  total: number;
  correct: number;
}

/**
 * 학생의 풀이 기록을 분석하여 단원별 약점 리포트를 생성한다.
 *
 * @param studentId - 분석 대상 학생의 UUID
 * @returns 정확도 낮은 순으로 정렬된 약점 리포트 배열
 */
export async function analyzeWeakness(
  studentId: string
): Promise<WeaknessReport[]> {
  try {
    /** 1단계: 학생의 풀이 기록 조회 */
    const { data: solveLogs, error: logsError } = await supabase
      .from('solve_logs')
      .select('problem_id, is_correct')
      .eq('student_id', studentId);

    if (logsError) {
      throw new Error(`풀이 기록 조회 실패: ${logsError.message}`);
    }

    if (!solveLogs || solveLogs.length === 0) {
      return [];
    }

    /** 2단계: 풀이한 문제들의 ID 추출 (중복 제거) */
    const problemIds = [
      ...new Set(
        solveLogs.map(
          (log) => (log as Record<string, unknown>).problem_id as string
        )
      ),
    ];

    /** 3단계: 문제들의 단원 정보 조회 */
    const { data: problems, error: problemsError } = await supabase
      .from('generated_problems')
      .select('id, topic')
      .in('id', problemIds);

    if (problemsError) {
      throw new Error(`문제 정보 조회 실패: ${problemsError.message}`);
    }

    /** 문제 ID -> 단원 매핑 생성 */
    const topicMap = new Map<string, string>();
    for (const problem of problems ?? []) {
      const row = problem as Record<string, unknown>;
      topicMap.set(row.id as string, row.topic as string);
    }

    /** 4단계: 단원별 정답률 집계 */
    const topicStats = new Map<string, TopicStats>();

    for (const log of solveLogs) {
      const row = log as Record<string, unknown>;
      const problemId = row.problem_id as string;
      const isCorrect = row.is_correct as boolean;
      const logTopic = topicMap.get(problemId) ?? '기타';

      const stats = topicStats.get(logTopic) ?? { total: 0, correct: 0 };
      stats.total += 1;
      if (isCorrect) stats.correct += 1;
      topicStats.set(logTopic, stats);
    }

    /** 5단계: 약점 리포트 생성 */
    const reports: WeaknessReport[] = [];

    for (const [reportTopic, stats] of topicStats) {
      const accuracy = Math.round((stats.correct / stats.total) * 100);

      let recommendation: string;
      if (accuracy < 40) {
        recommendation =
          '해당 단원의 기초 개념이 부족합니다. 개념 정리부터 다시 시작하세요.';
      } else if (accuracy < 60) {
        recommendation =
          '기본 개념은 이해하고 있으나, 기초 문제 반복 연습이 필요합니다.';
      } else if (accuracy < 80) {
        recommendation =
          '중간 수준입니다. 응용 문제를 추가로 풀어보세요.';
      } else {
        recommendation =
          '잘하고 있습니다! 심화 문제에 도전해보세요.';
      }

      reports.push({
        topic: reportTopic,
        accuracy,
        totalProblems: stats.total,
        correctCount: stats.correct,
        recommendation,
      });
    }

    return reports.sort((a, b) => a.accuracy - b.accuracy);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`약점 분석 오류: ${error.message}`);
    }
    throw new Error('약점 분석 중 알 수 없는 오류가 발생했습니다.');
  }
}
