import { useState, useEffect, useCallback } from 'react';
import {
  getStudents,
  createStudent,
  deleteStudent,
} from '../services/students';
import type { Student } from '../types';

/** 학생 목록 훅 */
export function useStudents(academyId: string | null) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 학생 목록 새로고침 */
  const refresh = useCallback(async () => {
    if (!academyId) return;
    setLoading(true);
    try {
      const data = await getStudents(academyId);
      setStudents(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '학생 목록을 불러오지 못했습니다.'
      );
    } finally {
      setLoading(false);
    }
  }, [academyId]);

  /** 초기 로드 */
  useEffect(() => {
    refresh();
  }, [refresh]);

  /** 학생 추가 */
  const add = useCallback(
    async (student: Omit<Student, 'id' | 'createdAt'>) => {
      const newStudent = await createStudent(student);
      setStudents((prev) => [...prev, newStudent]);
      return newStudent;
    },
    []
  );

  /** 학생 삭제 */
  const remove = useCallback(async (id: string) => {
    await deleteStudent(id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { students, loading, error, refresh, add, remove };
}
