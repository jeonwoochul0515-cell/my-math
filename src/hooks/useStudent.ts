import { useState, useCallback } from 'react';
import { getStudentByPin } from '../services/students';
import { checkInByPin } from '../services/attendance';
import type { Student } from '../types';

/** 현재 로그인한 학생 관리 훅 */
export function useStudent() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** PIN으로 학생 로그인 + 자동 체크인 */
  const loginWithPin = useCallback(async (pin: string) => {
    setLoading(true);
    setError(null);
    try {
      const found = await getStudentByPin(pin);
      if (!found) {
        setError('학생 정보를 찾을 수 없습니다. PIN을 확인해주세요.');
        return false;
      }
      setStudent(found);

      /** PIN 로그인 성공 시 자동 출석 체크인 (실패해도 로그인은 유지) */
      try {
        await checkInByPin(found.id, found.name, found.parentPhone);
      } catch {
        /* 자동 체크인 실패는 조용히 처리 — 로그인 자체는 성공 */
      }

      return true;
    } catch {
      setError('로그인에 실패했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /** 로그아웃 */
  const logout = useCallback(() => setStudent(null), []);

  return { student, loading, error, loginWithPin, logout };
}
