/**
 * 적응형 학습 서비스 — 학생 맞춤형 4문제 세트 구성
 *
 * 핵심 로직:
 * - 4문제 고정 세트
 * - 틀린 문제 → 같은 유형 다른 문제로 반복 출제
 * - 맞춘 문제 → 점진적 난이도 상승
 * - 4/4 맞추면 난이도 승급
 * - 안 배운 단원에서는 출제하지 않음
 */

import { supabase } from '../config/supabase';
import { getTopicList } from '../data/curriculum2022';
import { getClassById } from './classes';
import type { Problem, FigureSpec } from '../types';

/** 세트 크기 상수 */
const SET_SIZE = 4;

/** 난이도 순서 */
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'] as const;

/** 학생별 단원 숙련도 */
export interface TopicLevel {
  topic: string;
  currentDifficulty: 'easy' | 'medium' | 'hard';
  consecutivePerfect: number;
  totalSets: number;
  totalCorrect: number;
}

/** 적응형 세트 결과 */
export interface AdaptiveSet {
  id: string;
  problems: Problem[];
  topics: string[];
  difficulty: string;
}

/** 세트 완료 결과 */
export interface SetResult {
  setId: string;
  answers: { problemId: string; isCorrect: boolean }[];
}

// ---------------------------------------------------------------------------
// 1. 배운 단원 판별 — 교육과정 순서 + 풀이 이력 기반
// ---------------------------------------------------------------------------

/**
 * 학생이 배운 단원 목록을 반환한다.
 * 기준: 소속 반의 covered_topics (진도율) 기반
 * 반 진도가 없으면 교육과정 첫 단원만 반환한다.
 */
export async function getLearnedTopics(
  studentId: string,
  grade: string
): Promise<string[]> {
  /** 교육과정 순서대로 전체 단원 */
  const allTopics = getTopicList(grade);
  if (allTopics.length === 0) return [];

  /** 학생의 소속 반 조회 */
  const { data: studentData } = await supabase
    .from('students')
    .select('class_id')
    .eq('id', studentId)
    .single();

  const classId = studentData
    ? (studentData as Record<string, unknown>).class_id as string | null
    : null;

  if (classId) {
    const cls = await getClassById(classId);
    if (cls && cls.coveredTopics.length > 0) {
      /** 교육과정 순서를 유지하면서 반 진도에 포함된 단원만 반환 */
      const coveredSet = new Set(cls.coveredTopics);
      const learned = allTopics.filter((t) => coveredSet.has(t));
      if (learned.length > 0) return learned;
    }
  }

  /** 반 진도가 없으면 첫 번째 단원만 반환 */
  return [allTopics[0]];
}

// ---------------------------------------------------------------------------
// 2. 학생별 단원 숙련도 조회/갱신
// ---------------------------------------------------------------------------

/** 학생의 모든 단원 숙련도 조회 */
export async function getStudentMastery(
  studentId: string
): Promise<TopicLevel[]> {
  const { data, error } = await supabase
    .from('student_topic_level')
    .select('*')
    .eq('student_id', studentId);

  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map((row) => ({
    topic: row.topic as string,
    currentDifficulty: row.current_difficulty as 'easy' | 'medium' | 'hard',
    consecutivePerfect: row.consecutive_perfect as number,
    totalSets: row.total_sets as number,
    totalCorrect: row.total_correct as number,
  }));
}

/** 특정 단원의 숙련도 조회 (없으면 기본값) */
async function getTopicLevel(
  studentId: string,
  topic: string
): Promise<TopicLevel> {
  const { data } = await supabase
    .from('student_topic_level')
    .select('*')
    .eq('student_id', studentId)
    .eq('topic', topic)
    .single();

  if (!data) {
    return {
      topic,
      currentDifficulty: 'easy',
      consecutivePerfect: 0,
      totalSets: 0,
      totalCorrect: 0,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    topic: row.topic as string,
    currentDifficulty: row.current_difficulty as 'easy' | 'medium' | 'hard',
    consecutivePerfect: row.consecutive_perfect as number,
    totalSets: row.total_sets as number,
    totalCorrect: row.total_correct as number,
  };
}

// ---------------------------------------------------------------------------
// 3. 오답 단원 분석 — 최근 틀린 문제의 단원 + 난이도 파악
// ---------------------------------------------------------------------------

interface WeakTopic {
  topic: string;
  difficulty: string;
  wrongProblemIds: string[];
}

/** 최근 오답 단원 분석 (최근 20문제 기준) */
async function getRecentWeakTopics(studentId: string): Promise<WeakTopic[]> {
  const { data } = await supabase
    .from('solve_logs')
    .select('problem_id, is_correct')
    .eq('student_id', studentId)
    .eq('is_correct', false)
    .order('solved_at', { ascending: false })
    .limit(20);

  if (!data || data.length === 0) return [];

  const wrongIds = data.map((d) => (d as Record<string, unknown>).problem_id as string);

  /** 틀린 문제들의 단원/난이도 조회 */
  const { data: problems } = await supabase
    .from('generated_problems')
    .select('id, topic, difficulty')
    .in('id', wrongIds);

  if (!problems) return [];

  /** 단원별 그룹핑 */
  const topicMap = new Map<string, WeakTopic>();
  for (const p of problems as Record<string, unknown>[]) {
    const topic = p.topic as string;
    const existing = topicMap.get(topic);
    if (existing) {
      existing.wrongProblemIds.push(p.id as string);
    } else {
      topicMap.set(topic, {
        topic,
        difficulty: p.difficulty as string,
        wrongProblemIds: [p.id as string],
      });
    }
  }

  /** 오답 수 많은 순으로 정렬 */
  return [...topicMap.values()].sort(
    (a, b) => b.wrongProblemIds.length - a.wrongProblemIds.length
  );
}

// ---------------------------------------------------------------------------
// 4. 문제 조회 — problem_embeddings에서 같은 유형 다른 문제 가져오기
// ---------------------------------------------------------------------------

/** DB row를 Problem으로 변환 */
function rowToProblem(row: Record<string, unknown>, source: Problem['source'] = 'aihub'): Problem {
  const rawFigure = row.figure as Record<string, unknown> | null | undefined;
  const figure: FigureSpec | undefined =
    rawFigure && typeof rawFigure === 'object' && 'boundingBox' in rawFigure
      ? (rawFigure as unknown as FigureSpec)
      : undefined;

  return {
    id: String(row.id),
    content: row.content as string,
    answer: row.answer as string,
    solution: (row.solution as string) ?? '',
    grade: row.grade as string,
    topic: row.topic as string,
    difficulty: (row.difficulty as 'easy' | 'medium' | 'hard') ?? 'medium',
    choices: (row.choices as string[]) ?? [],
    source,
    figure,
  };
}

/**
 * 같은 단원+난이도에서 이미 푼 문제를 제외한 문제를 가져온다.
 * problem_embeddings (원본)과 generated_problems (생성된) 둘 다 검색.
 */
async function fetchUnsolvedProblems(
  studentId: string,
  grade: string,
  topic: string,
  difficulty: string,
  count: number,
  excludeIds: string[] = []
): Promise<Problem[]> {
  /** 학생이 이미 푼 문제 ID 수집 */
  const { data: solvedData } = await supabase
    .from('solve_logs')
    .select('problem_id')
    .eq('student_id', studentId);

  const solvedIds = new Set(
    (solvedData ?? []).map((d) => (d as Record<string, unknown>).problem_id as string)
  );
  excludeIds.forEach((id) => solvedIds.add(id));

  const results: Problem[] = [];

  /** 1. generated_problems에서 검색 (보기가 이미 있음) */
  const { data: genData } = await supabase
    .from('generated_problems')
    .select('*')
    .eq('grade', grade)
    .eq('topic', topic)
    .eq('difficulty', difficulty)
    .limit(count * 4);

  if (genData) {
    for (const row of genData as Record<string, unknown>[]) {
      const id = row.id as string;
      if (!solvedIds.has(id)) {
        const p = rowToProblem(row, 'ai-generated');
        if (p.choices.length === 4) {
          results.push(p);
          solvedIds.add(id);
        }
      }
      if (results.length >= count) break;
    }
  }

  /** 2. 부족하면 problem_embeddings에서 보충 (보기 자동 생성 필요) */
  if (results.length < count) {
    const needed = count - results.length;
    const { data: embData } = await supabase
      .from('problem_embeddings')
      .select('id, content, answer, solution, grade, topic, difficulty')
      .eq('grade', grade)
      .eq('topic', topic)
      .eq('difficulty', difficulty)
      .limit(needed * 4);

    if (embData) {
      /** 같은 단원의 다른 정답들을 오답 보기 후보로 수집 */
      const allAnswers = (embData as Record<string, unknown>[]).map(
        (r) => r.answer as string
      );
      const uniqueAnswers = [...new Set(allAnswers)];

      for (const row of embData as Record<string, unknown>[]) {
        const id = String(row.id);
        if (solvedIds.has(id)) continue;

        const answer = row.answer as string;
        const others = uniqueAnswers.filter((a) => a !== answer).sort(() => Math.random() - 0.5);
        const wrongChoices = others.slice(0, 3);
        while (wrongChoices.length < 3) {
          wrongChoices.push(`보기 ${String(wrongChoices.length + 2)}`);
        }

        const choices = [answer, ...wrongChoices].sort(() => Math.random() - 0.5);

        results.push({
          id,
          content: row.content as string,
          answer,
          solution: (row.solution as string) ?? '',
          grade: row.grade as string,
          topic: row.topic as string,
          difficulty: (row.difficulty as 'easy' | 'medium' | 'hard') ?? 'medium',
          choices,
          source: 'aihub',
        });
        solvedIds.add(id);

        if (results.length >= count) break;
      }
    }
  }

  /** 3. 난이도 필터 없이 재시도 (해당 난이도 문제 부족 시) */
  if (results.length < count) {
    const needed = count - results.length;
    const { data: fallbackData } = await supabase
      .from('problem_embeddings')
      .select('id, content, answer, solution, grade, topic, difficulty')
      .eq('grade', grade)
      .eq('topic', topic)
      .limit(needed * 4);

    if (fallbackData) {
      const allAnswers = (fallbackData as Record<string, unknown>[]).map(
        (r) => r.answer as string
      );
      const uniqueAnswers = [...new Set(allAnswers)];

      for (const row of fallbackData as Record<string, unknown>[]) {
        const id = String(row.id);
        if (solvedIds.has(id)) continue;

        const answer = row.answer as string;
        const others = uniqueAnswers.filter((a) => a !== answer).sort(() => Math.random() - 0.5);
        const wrongChoices = others.slice(0, 3);
        while (wrongChoices.length < 3) {
          wrongChoices.push(`보기 ${String(wrongChoices.length + 2)}`);
        }
        const choices = [answer, ...wrongChoices].sort(() => Math.random() - 0.5);

        results.push({
          id,
          content: row.content as string,
          answer,
          solution: (row.solution as string) ?? '',
          grade: row.grade as string,
          topic: row.topic as string,
          difficulty: (row.difficulty as 'easy' | 'medium' | 'hard') ?? difficulty as 'easy' | 'medium' | 'hard',
          choices,
          source: 'aihub',
        });
        solvedIds.add(id);

        if (results.length >= count) break;
      }
    }
  }

  /** 셔플 */
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }

  return results.slice(0, count);
}

// ---------------------------------------------------------------------------
// 5. 적응형 4문제 세트 구성 (핵심 로직)
// ---------------------------------------------------------------------------

/**
 * 학생 맞춤형 4문제 세트를 구성한다.
 *
 * 구성 우선순위:
 * 1. 오답 반복: 최근 틀린 단원에서 같은 유형 다른 문제 (최대 2문제)
 * 2. 현행 학습: 가장 최근 배운 단원에서 현재 난이도 문제 (나머지)
 * 3. 안 배운 단원은 절대 출제하지 않음
 *
 * @param studentId - 학생 UUID
 * @param grade - 학년
 * @returns 4문제 세트 + 메타데이터
 */
export async function composeAdaptiveSet(
  studentId: string,
  grade: string
): Promise<AdaptiveSet> {
  /** 배운 단원 목록 */
  const learnedTopics = await getLearnedTopics(studentId, grade);
  const learnedSet = new Set(learnedTopics);

  /** 최근 오답 단원 (배운 단원 필터) */
  const weakTopics = (await getRecentWeakTopics(studentId)).filter(
    (w) => learnedSet.has(w.topic)
  );

  /** 현재 학습 단원 (가장 최근 배운 단원) */
  const currentTopic = learnedTopics[learnedTopics.length - 1];
  const currentLevel = await getTopicLevel(studentId, currentTopic);

  const problems: Problem[] = [];
  const usedIds: string[] = [];
  const topics = new Set<string>();

  /** 1단계: 오답 반복 문제 (최대 2문제) */
  const maxReview = Math.min(2, weakTopics.length);
  for (let i = 0; i < maxReview; i++) {
    const weak = weakTopics[i];
    const level = await getTopicLevel(studentId, weak.topic);

    const reviewProblems = await fetchUnsolvedProblems(
      studentId,
      grade,
      weak.topic,
      level.currentDifficulty,
      1,
      usedIds
    );

    if (reviewProblems.length > 0) {
      problems.push(reviewProblems[0]);
      usedIds.push(reviewProblems[0].id);
      topics.add(weak.topic);
    }
  }

  /** 2단계: 나머지를 현행 학습 단원으로 채움 */
  const remaining = SET_SIZE - problems.length;
  if (remaining > 0) {
    const currentProblems = await fetchUnsolvedProblems(
      studentId,
      grade,
      currentTopic,
      currentLevel.currentDifficulty,
      remaining,
      usedIds
    );

    for (const p of currentProblems) {
      problems.push(p);
      usedIds.push(p.id);
      topics.add(currentTopic);
    }
  }

  /** 3단계: 그래도 부족하면 다른 배운 단원에서 보충 */
  if (problems.length < SET_SIZE) {
    const still = SET_SIZE - problems.length;
    for (const fallbackTopic of learnedTopics.slice().reverse()) {
      if (problems.length >= SET_SIZE) break;
      if (fallbackTopic === currentTopic) continue;

      const level = await getTopicLevel(studentId, fallbackTopic);
      const extras = await fetchUnsolvedProblems(
        studentId,
        grade,
        fallbackTopic,
        level.currentDifficulty,
        still,
        usedIds
      );

      for (const p of extras) {
        problems.push(p);
        usedIds.push(p.id);
        topics.add(fallbackTopic);
        if (problems.length >= SET_SIZE) break;
      }
    }
  }

  /** DB에 세트 기록 */
  const topicsArr = [...topics];
  const { data: setData } = await supabase
    .from('adaptive_sets')
    .insert({
      student_id: studentId,
      topics: topicsArr,
      difficulty: currentLevel.currentDifficulty,
      problem_ids: problems.map((p) => p.id),
    })
    .select('id')
    .single();

  const setId = setData ? (setData as Record<string, unknown>).id as string : `temp-${Date.now()}`;

  return {
    id: setId,
    problems,
    topics: topicsArr,
    difficulty: currentLevel.currentDifficulty,
  };
}

// ---------------------------------------------------------------------------
// 6. 세트 결과 기록 + 승급/강등 판정
// ---------------------------------------------------------------------------

/**
 * 4문제 세트 결과를 기록하고 숙련도를 갱신한다.
 *
 * - 4/4 맞추면 → 난이도 승급 (easy→medium→hard)
 * - hard에서 4/4 → consecutive_perfect 증가 (마스터)
 * - 틀린 문제가 있으면 → consecutive_perfect 리셋, 난이도 유지
 *
 * @param studentId - 학생 UUID
 * @param result - 세트 결과
 */
export async function recordSetResult(
  studentId: string,
  result: SetResult
): Promise<{ promoted: boolean; newDifficulty: string; topic: string } | null> {
  const { setId, answers } = result;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const isPerfect = correctCount === SET_SIZE;

  /** adaptive_sets 완료 기록 */
  await supabase
    .from('adaptive_sets')
    .update({
      correct_count: correctCount,
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', setId);

  /** 세트에 포함된 문제들의 단원 조회 */
  const problemIds = answers.map((a) => a.problemId);
  const { data: probData } = await supabase
    .from('generated_problems')
    .select('id, topic')
    .in('id', problemIds);

  /** problem_embeddings에서도 조회 (원본 문제인 경우) */
  const numericIds = problemIds.filter((id) => /^\d+$/.test(id)).map(Number);
  let embTopics: Record<string, unknown>[] = [];
  if (numericIds.length > 0) {
    const { data: embData } = await supabase
      .from('problem_embeddings')
      .select('id, topic')
      .in('id', numericIds);
    embTopics = (embData ?? []) as Record<string, unknown>[];
  }

  /** 문제ID → 단원 매핑 */
  const topicMap = new Map<string, string>();
  for (const row of (probData ?? []) as Record<string, unknown>[]) {
    topicMap.set(row.id as string, row.topic as string);
  }
  for (const row of embTopics) {
    topicMap.set(String(row.id), row.topic as string);
  }

  /** 단원별 정답 집계 */
  const topicResults = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const topic = topicMap.get(a.problemId) ?? 'unknown';
    const entry = topicResults.get(topic) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (a.isCorrect) entry.correct += 1;
    topicResults.set(topic, entry);
  }

  /** 각 단원의 숙련도 갱신 */
  let promotionResult: { promoted: boolean; newDifficulty: string; topic: string } | null = null;

  for (const [topic, stats] of topicResults) {
    if (topic === 'unknown') continue;

    const level = await getTopicLevel(studentId, topic);
    const topicPerfect = stats.correct === stats.total;

    let newDifficulty = level.currentDifficulty;
    let newConsecutive = level.consecutivePerfect;
    let promoted = false;

    if (isPerfect && topicPerfect) {
      /** 전체 4/4이고 이 단원도 전부 맞춤 → 승급 판정 */
      const currentIdx = DIFFICULTY_ORDER.indexOf(level.currentDifficulty);
      if (currentIdx < DIFFICULTY_ORDER.length - 1) {
        newDifficulty = DIFFICULTY_ORDER[currentIdx + 1];
        newConsecutive = 0;
        promoted = true;
      } else {
        /** 이미 hard → 연속 만점 증가 */
        newConsecutive = level.consecutivePerfect + 1;
      }
    } else {
      /** 틀린 문제 있음 → 연속 리셋, 난이도 유지 */
      newConsecutive = 0;
    }

    /** upsert */
    await supabase
      .from('student_topic_level')
      .upsert(
        {
          student_id: studentId,
          topic,
          current_difficulty: newDifficulty,
          consecutive_perfect: newConsecutive,
          total_sets: level.totalSets + 1,
          total_correct: level.totalCorrect + stats.correct,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,topic' }
      );

    if (promoted) {
      promotionResult = { promoted: true, newDifficulty, topic };
    }
  }

  return promotionResult;
}

// ---------------------------------------------------------------------------
// 7. 미완료 세트 조회 (이어풀기용)
// ---------------------------------------------------------------------------

/**
 * 학생의 미완료 적응형 세트를 조회한다.
 * 이전에 시작했지만 완료하지 않은 세트가 있으면 이어서 풀 수 있다.
 */
export async function getIncompleteSet(
  studentId: string
): Promise<AdaptiveSet | null> {
  const { data } = await supabase
    .from('adaptive_sets')
    .select('*')
    .eq('student_id', studentId)
    .eq('is_completed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  const row = data as Record<string, unknown>;
  const problemIds = row.problem_ids as string[];

  /** 문제 데이터 로드 */
  const problems: Problem[] = [];

  /** generated_problems에서 조회 */
  const uuidIds = problemIds.filter((id) => id.includes('-'));
  if (uuidIds.length > 0) {
    const { data: genData } = await supabase
      .from('generated_problems')
      .select('*')
      .in('id', uuidIds);

    if (genData) {
      for (const r of genData as Record<string, unknown>[]) {
        problems.push(rowToProblem(r, 'ai-generated'));
      }
    }
  }

  /** problem_embeddings에서 조회 (숫자 ID) */
  const numIds = problemIds.filter((id) => /^\d+$/.test(id)).map(Number);
  if (numIds.length > 0) {
    const { data: embData } = await supabase
      .from('problem_embeddings')
      .select('id, content, answer, solution, grade, topic, difficulty')
      .in('id', numIds);

    if (embData) {
      for (const r of embData as Record<string, unknown>[]) {
        /** 보기가 없으므로 빈 배열 (UI에서 주관식으로 처리하거나 별도 생성) */
        problems.push({
          id: String(r.id),
          content: r.content as string,
          answer: r.answer as string,
          solution: (r.solution as string) ?? '',
          grade: r.grade as string,
          topic: r.topic as string,
          difficulty: (r.difficulty as 'easy' | 'medium' | 'hard') ?? 'medium',
          choices: [],
          source: 'aihub',
        });
      }
    }
  }

  return {
    id: row.id as string,
    problems,
    topics: row.topics as string[],
    difficulty: row.difficulty as string,
  };
}
