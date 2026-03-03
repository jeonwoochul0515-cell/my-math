import { supabase } from '../config/supabase';
import type { Problem, SolveLog } from '../types';

/** DB row를 Problem 타입으로 변환 */
function toProblem(row: Record<string, unknown>): Problem {
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
  };
}

/** DB row를 SolveLog 타입으로 변환 */
function toSolveLog(row: Record<string, unknown>): SolveLog {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    problemId: row.problem_id as string,
    answer: row.answer as string,
    isCorrect: row.is_correct as boolean,
    solvedAt: new Date(row.solved_at as string),
  };
}

/** AI 문제 생성 (하이브리드 검색 + Claude 리랭킹 + 생성) */
export async function generateProblems(
  grade: string,
  topic: string,
  difficulty: string,
  count: number
): Promise<Problem[]> {
  const { generateProblemsWithRAG } = await import('./ai');
  const results = await generateProblemsWithRAG({
    grade,
    topic,
    difficulty: difficulty as 'easy' | 'medium' | 'hard',
    count,
  });
  return results.map((p) => ({
    id: p.id,
    content: p.content,
    answer: p.answer,
    solution: p.solution,
    grade: p.grade,
    topic: p.topic,
    difficulty: p.difficulty as 'easy' | 'medium' | 'hard',
    choices: p.choices,
    source: 'ai-generated' as const,
    figure: p.figure as Problem['figure'],
  }));
}

/** 생성된 문제를 DB에 저장 */
export async function saveProblem(
  problem: Omit<Problem, 'id' | 'source'>,
  academyId: string
): Promise<Problem> {
  const { data, error } = await supabase
    .from('generated_problems')
    .insert({
      content: problem.content,
      answer: problem.answer,
      solution: problem.solution,
      grade: problem.grade,
      topic: problem.topic,
      difficulty: problem.difficulty,
      choices: problem.choices,
      academy_id: academyId,
    })
    .select()
    .single();
  if (error)
    throw new Error('문제 저장에 실패했습니다: ' + error.message);
  return toProblem(data);
}

/** 문제 목록 조회 */
export async function getProblems(
  _academyId: string,
  filters?: { grade?: string; topic?: string; difficulty?: string }
): Promise<Problem[]> {
  let query = supabase
    .from('generated_problems')
    .select('*');
  if (filters?.grade) query = query.eq('grade', filters.grade);
  if (filters?.topic) query = query.eq('topic', filters.topic);
  if (filters?.difficulty)
    query = query.eq('difficulty', filters.difficulty);
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(50);
  if (error)
    throw new Error('문제 목록을 불러오지 못했습니다: ' + error.message);
  return (data ?? []).map(toProblem);
}

/** 풀이 기록 저장 */
export async function submitAnswer(
  studentId: string,
  problemId: string,
  answer: string,
  isCorrect: boolean
): Promise<SolveLog> {
  const { data, error } = await supabase
    .from('solve_logs')
    .insert({
      student_id: studentId,
      problem_id: problemId,
      answer,
      is_correct: isCorrect,
    })
    .select()
    .single();
  if (error)
    throw new Error('답안 제출에 실패했습니다: ' + error.message);
  return toSolveLog(data);
}

/** 학생의 풀이 기록 조회 */
export async function getSolveLogs(studentId: string): Promise<SolveLog[]> {
  const { data, error } = await supabase
    .from('solve_logs')
    .select('*')
    .eq('student_id', studentId)
    .order('solved_at', { ascending: false });
  if (error)
    throw new Error('풀이 기록을 불러오지 못했습니다: ' + error.message);
  return (data ?? []).map(toSolveLog);
}
