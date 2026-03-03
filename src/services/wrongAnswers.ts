import { supabase } from '../config/supabase';
import type { WrongAnswerNote, Problem, FigureSpec } from '../types';

/** DB row를 WrongAnswerNote 타입으로 변환 */
function toWrongAnswerNote(row: Record<string, unknown>): WrongAnswerNote {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    problemId: row.problem_id as string,
    originalAnswer: row.original_answer as string,
    correctAnswer: row.correct_answer as string,
    errorAnalysis: (row.error_analysis as string) ?? null,
    retryCount: row.retry_count as number,
    isResolved: row.is_resolved as boolean,
    createdAt: new Date(row.created_at as string),
  };
}

/** DB row를 Problem 타입으로 변환 */
function toProblem(row: Record<string, unknown>): Problem {
  const rawFigure = row.figure as Record<string, unknown> | null | undefined;
  const figure: FigureSpec | undefined =
    rawFigure && typeof rawFigure === 'object' && 'boundingBox' in rawFigure
      ? (rawFigure as unknown as FigureSpec)
      : undefined;

  return {
    id: row.id as string,
    content: row.content as string,
    answer: row.answer as string,
    solution: (row.solution as string) ?? '',
    grade: row.grade as string,
    topic: row.topic as string,
    difficulty: row.difficulty as 'easy' | 'medium' | 'hard',
    choices: (row.choices as string[]) ?? [],
    source: 'ai-generated',
    figure,
  };
}

/** 오답 조회 (문제 정보 포함) */
export async function getWrongAnswers(
  studentId: string,
  filter?: 'all' | 'unresolved' | 'resolved'
): Promise<(WrongAnswerNote & { problem: Problem })[]> {
  let query = supabase
    .from('wrong_answer_notes')
    .select('*')
    .eq('student_id', studentId);

  /** 필터 적용 */
  if (filter === 'unresolved') {
    query = query.eq('is_resolved', false);
  } else if (filter === 'resolved') {
    query = query.eq('is_resolved', true);
  }

  const { data: noteData, error: noteError } = await query
    .order('created_at', { ascending: false });
  if (noteError)
    throw new Error('오답 목록을 불러오지 못했습니다: ' + noteError.message);

  const notes = (noteData ?? []).map(toWrongAnswerNote);

  if (notes.length === 0) return [];

  /** 관련 문제 데이터 조회 */
  const problemIds = notes.map((n) => n.problemId);
  const { data: problemData, error: problemError } = await supabase
    .from('generated_problems')
    .select('*')
    .in('id', problemIds);
  if (problemError)
    throw new Error('문제 데이터를 불러오지 못했습니다: ' + problemError.message);

  /** 문제 ID → Problem 맵 생성 */
  const problemMap = new Map<string, Problem>();
  for (const row of problemData ?? []) {
    const problem = toProblem(row as Record<string, unknown>);
    problemMap.set(problem.id, problem);
  }

  /** 오답노트 + 문제 결합 (문제가 없는 항목은 제외) */
  return notes
    .filter((note) => problemMap.has(note.problemId))
    .map((note) => ({
      ...note,
      problem: problemMap.get(note.problemId) as Problem,
    }));
}

/** 오답 삭제 */
export async function deleteWrongAnswer(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('wrong_answer_notes')
    .delete()
    .eq('id', noteId);
  if (error)
    throw new Error('오답 삭제에 실패했습니다: ' + error.message);
}

/** 해결됨 토글 */
export async function toggleWrongAnswerResolved(
  noteId: string,
  resolved: boolean
): Promise<void> {
  const { error } = await supabase
    .from('wrong_answer_notes')
    .update({ is_resolved: resolved })
    .eq('id', noteId);
  if (error)
    throw new Error('오답 상태 변경에 실패했습니다: ' + error.message);
}

/** 오답 자동 수집 (풀이 후 호출) */
export async function collectWrongAnswers(
  studentId: string,
  results: {
    problemId: string;
    answer: string;
    correctAnswer: string;
    isCorrect: boolean;
    errorAnalysis?: string;
  }[]
): Promise<void> {
  /** 오답만 필터링 */
  const wrongResults = results.filter((r) => !r.isCorrect);
  if (wrongResults.length === 0) return;

  const rows = wrongResults.map((r) => ({
    student_id: studentId,
    problem_id: r.problemId,
    original_answer: r.answer,
    correct_answer: r.correctAnswer,
    error_analysis: r.errorAnalysis ?? null,
    retry_count: 0,
    is_resolved: false,
  }));

  /** 중복 충돌 시 무시 (student_id, problem_id 기준) */
  const { error } = await supabase
    .from('wrong_answer_notes')
    .upsert(rows, { onConflict: 'student_id,problem_id', ignoreDuplicates: true });
  if (error)
    throw new Error('오답 수집에 실패했습니다: ' + error.message);
}

/** retry_count 증가 */
export async function incrementRetryCount(noteId: string): Promise<void> {
  /** 현재 값 조회 후 +1 업데이트 */
  const { data, error: fetchError } = await supabase
    .from('wrong_answer_notes')
    .select('retry_count')
    .eq('id', noteId)
    .single();
  if (fetchError)
    throw new Error('오답 정보를 불러오지 못했습니다: ' + fetchError.message);

  const currentCount = (data as Record<string, unknown>).retry_count as number;

  const { error: updateError } = await supabase
    .from('wrong_answer_notes')
    .update({ retry_count: currentCount + 1 })
    .eq('id', noteId);
  if (updateError)
    throw new Error('재시도 횟수 업데이트에 실패했습니다: ' + updateError.message);
}

/** 쌍둥이 문제 생성 요청 — /api/generate-twin 엔드포인트 호출 */
export async function generateTwinProblem(
  originalProblem: Problem,
  studentError: string,
  errorAnalysis: string
): Promise<Problem[]> {
  const response = await fetch('/api/generate-twin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalProblem,
      studentError,
      errorAnalysis,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error('쌍둥이 문제 생성에 실패했습니다: ' + errorBody);
  }

  const data: { problems: Problem[] } = await response.json();
  return data.problems;
}
