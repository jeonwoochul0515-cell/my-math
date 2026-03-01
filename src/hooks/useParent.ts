import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type { Student } from '../types';

/** 학부모 로그인 및 자녀 관리 훅 */
export function useParent() {
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 전화번호로 자녀 찾기 */
  const loginWithPhone = useCallback(async (phone: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('students')
        .select('*')
        .eq('parent_phone', phone);
      if (dbError) throw new Error(dbError.message);
      if (!data || data.length === 0) {
        setError('등록된 자녀 정보가 없습니다. 학원에 문의해주세요.');
        return false;
      }
      const mapped: Student[] = data.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        grade: row.grade as string,
        phone: (row.phone as string) ?? '',
        parentPhone: (row.parent_phone as string) ?? '',
        pin: row.pin as string,
        classId: (row.class_id as string) ?? '',
        academyId: row.academy_id as string,
        createdAt: new Date(row.created_at as string),
      }));
      setChildren(mapped);
      setSelectedChild(mapped[0]);
      return true;
    } catch {
      setError('로그인에 실패했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /** 로그아웃 */
  const logout = useCallback(() => {
    setChildren([]);
    setSelectedChild(null);
  }, []);

  return {
    children,
    selectedChild,
    setSelectedChild,
    loading,
    error,
    loginWithPhone,
    logout,
  };
}
