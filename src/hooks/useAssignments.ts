import { useState, useEffect, useCallback } from 'react';
import type { ProblemAssignment, Problem } from '../types';
import { getStudentAssignments } from '../services/assignments';

/** 문제 배부 관리 훅 */
export function useAssignments(studentId: string | null) {
  const [assignments, setAssignments] = useState<ProblemAssignment[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 배부된 문제 조회 */
  const refresh = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await getStudentAssignments(studentId);
      setAssignments(data.assignments);
      setProblems(data.problems);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '배부 목록을 불러오지 못했습니다.'
      );
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  /** studentId 변경 시 자동 조회 */
  useEffect(() => {
    if (studentId) {
      refresh();
    }
  }, [studentId, refresh]);

  return { assignments, problems, loading, error, refresh };
}
