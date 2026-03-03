import { useState, useEffect, useCallback } from 'react';
import type { WrongAnswerNote, Problem } from '../types';
import {
  getWrongAnswers,
  deleteWrongAnswer,
  toggleWrongAnswerResolved,
} from '../services/wrongAnswers';

/** 오답노트 관리 훅 */
export function useWrongAnswers(studentId: string | null) {
  const [notes, setNotes] = useState<(WrongAnswerNote & { problem: Problem })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 오답 목록 조회 */
  const refresh = useCallback(
    async (filter?: 'all' | 'unresolved' | 'resolved') => {
      if (!studentId) return;
      setLoading(true);
      try {
        const data = await getWrongAnswers(studentId, filter);
        setNotes(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '오답 목록을 불러오지 못했습니다.'
        );
      } finally {
        setLoading(false);
      }
    },
    [studentId]
  );

  /** 오답 삭제 */
  const remove = useCallback(
    async (noteId: string) => {
      try {
        await deleteWrongAnswer(noteId);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '오답 삭제에 실패했습니다.'
        );
      }
    },
    []
  );

  /** 해결됨 토글 */
  const toggleResolved = useCallback(
    async (noteId: string, resolved: boolean) => {
      try {
        await toggleWrongAnswerResolved(noteId, resolved);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId ? { ...n, isResolved: resolved } : n
          )
        );
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '오답 상태 변경에 실패했습니다.'
        );
      }
    },
    []
  );

  /** studentId 변경 시 자동 조회 */
  useEffect(() => {
    if (studentId) {
      refresh();
    }
  }, [studentId, refresh]);

  return { notes, loading, error, refresh, remove, toggleResolved };
}
