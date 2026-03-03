import { supabase } from '../config/supabase';
import type { ProblemAssignment, Problem, FigureSpec } from '../types';

/** DB row를 ProblemAssignment 타입으로 변환 */
function toAssignment(row: Record<string, unknown>): ProblemAssignment {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    problemId: row.problem_id as string,
    assignedBy: row.assigned_by as string,
    academyId: row.academy_id as string,
    status: row.status as 'pending' | 'submitted' | 'graded',
    assignedAt: new Date(row.assigned_at as string),
    submittedAt: row.submitted_at ? new Date(row.submitted_at as string) : null,
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

/** 문제 배부 (원장 -> 학생들) */
export async function assignProblems(
  problemIds: string[],
  studentIds: string[],
  assignedBy: string,
  academyId: string
): Promise<void> {
  /** 학생-문제 조합으로 행 생성 */
  const rows: {
    student_id: string;
    problem_id: string;
    assigned_by: string;
    academy_id: string;
    status: string;
  }[] = [];

  for (const studentId of studentIds) {
    for (const problemId of problemIds) {
      rows.push({
        student_id: studentId,
        problem_id: problemId,
        assigned_by: assignedBy,
        academy_id: academyId,
        status: 'pending',
      });
    }
  }

  /** 중복 충돌 시 무시 */
  const { error } = await supabase
    .from('problem_assignments')
    .upsert(rows, { onConflict: 'student_id,problem_id', ignoreDuplicates: true });
  if (error)
    throw new Error('문제 배부에 실패했습니다: ' + error.message);
}

/** 학생의 배부된 문제 조회 (pending만) */
export async function getStudentAssignments(studentId: string): Promise<{
  assignments: ProblemAssignment[];
  problems: Problem[];
}> {
  /** pending 상태의 배부 목록 조회 */
  const { data: assignData, error: assignError } = await supabase
    .from('problem_assignments')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'pending')
    .order('assigned_at', { ascending: false });
  if (assignError)
    throw new Error('배부 목록을 불러오지 못했습니다: ' + assignError.message);

  const assignments = (assignData ?? []).map(toAssignment);

  if (assignments.length === 0) {
    return { assignments: [], problems: [] };
  }

  /** 문제 ID 목록으로 실제 문제 데이터 조회 */
  const problemIds = assignments.map((a) => a.problemId);
  const { data: problemData, error: problemError } = await supabase
    .from('generated_problems')
    .select('*')
    .in('id', problemIds);
  if (problemError)
    throw new Error('문제 데이터를 불러오지 못했습니다: ' + problemError.message);

  const problems = (problemData ?? []).map(toProblem);

  return { assignments, problems };
}

/** 배부 상태 업데이트 */
export async function updateAssignmentStatus(
  assignmentIds: string[],
  status: 'submitted' | 'graded'
): Promise<void> {
  const updatePayload: { status: string; submitted_at?: string } = { status };

  /** 제출 상태인 경우 제출 시간 기록 */
  if (status === 'submitted') {
    updatePayload.submitted_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('problem_assignments')
    .update(updatePayload)
    .in('id', assignmentIds);
  if (error)
    throw new Error('배부 상태 업데이트에 실패했습니다: ' + error.message);
}

/** 학원 전체 배부 현황 (원장용) */
export async function getAcademyAssignmentSummary(academyId: string): Promise<{
  studentId: string;
  studentName: string;
  grade: string;
  totalAssigned: number;
  completed: number;
  accuracy: number;
  lastActivity: Date | null;
}[]> {
  /** 학원 소속 학생 목록 조회 */
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, grade')
    .eq('academy_id', academyId);
  if (studentsError)
    throw new Error('학생 목록을 불러오지 못했습니다: ' + studentsError.message);

  if (!students || students.length === 0) return [];

  const studentIds = students.map((s) => (s as Record<string, unknown>).id as string);

  /** 배부 목록 조회 */
  const { data: assignments, error: assignError } = await supabase
    .from('problem_assignments')
    .select('*')
    .in('student_id', studentIds);
  if (assignError)
    throw new Error('배부 현황을 불러오지 못했습니다: ' + assignError.message);

  /** 풀이 기록 조회 (정답률 계산용) */
  const { data: solveLogs, error: solveError } = await supabase
    .from('solve_logs')
    .select('*')
    .in('student_id', studentIds);
  if (solveError)
    throw new Error('풀이 기록을 불러오지 못했습니다: ' + solveError.message);

  /** 학생별 집계 */
  return students.map((s) => {
    const row = s as Record<string, unknown>;
    const sid = row.id as string;

    const studentAssignments = (assignments ?? []).filter(
      (a) => (a as Record<string, unknown>).student_id === sid
    );
    const completedAssignments = studentAssignments.filter(
      (a) => (a as Record<string, unknown>).status !== 'pending'
    );

    const studentLogs = (solveLogs ?? []).filter(
      (l) => (l as Record<string, unknown>).student_id === sid
    );
    const correctCount = studentLogs.filter(
      (l) => (l as Record<string, unknown>).is_correct === true
    ).length;
    const accuracy =
      studentLogs.length > 0
        ? Math.round((correctCount / studentLogs.length) * 100)
        : 0;

    /** 최근 활동 시간 */
    const solvedDates = studentLogs
      .map((l) => new Date((l as Record<string, unknown>).solved_at as string))
      .sort((a, b) => b.getTime() - a.getTime());
    const lastActivity = solvedDates.length > 0 ? solvedDates[0] : null;

    return {
      studentId: sid,
      studentName: row.name as string,
      grade: row.grade as string,
      totalAssigned: studentAssignments.length,
      completed: completedAssignments.length,
      accuracy,
      lastActivity,
    };
  });
}
