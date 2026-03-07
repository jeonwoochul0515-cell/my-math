import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type { Student } from '../types';
import type { ParentAuthStep, ParentContextValue } from '../context/ParentContext';

/**
 * 학부모 전화번호 인증 및 자녀 관리 훅
 *
 * 현재는 전화번호 매칭만으로 간소화 인증 처리.
 * 추후 SMS 인증(Firebase Phone Auth) 추가 시
 * loginWithPhone 내부에 인증 로직만 삽입하면 됨.
 */
export function useParent(): ParentContextValue {
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<ParentAuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');

  /** Supabase에서 학부모 전화번호로 자녀 조회 */
  const fetchChildren = useCallback(async (phone: string): Promise<Student[]> => {
    /** 하이픈 제거한 번호와 원본 번호 모두로 검색 */
    const normalized = phone.replace(/\D/g, '');

    /** 하이픈 형식(010-1234-5678)도 함께 검색 */
    const formatted = normalized.length === 11
      ? `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`
      : phone;

    const { data, error: dbError } = await supabase
      .from('students')
      .select('*')
      .or(`parent_phone.eq.${phone},parent_phone.eq.${normalized},parent_phone.eq.${formatted}`);

    if (dbError) throw new Error(dbError.message);
    if (!data || data.length === 0) return [];

    return data.map((row) => ({
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
  }, []);

  /**
   * 전화번호로 로그인 (간소화 인증)
   * - 전화번호를 students.parent_phone과 매칭
   * - 일치하는 자녀가 있으면 로그인 성공
   * - 추후 SMS 인증 추가 시 이 함수 내부에 인증 로직 삽입
   */
  const loginWithPhone = useCallback(async (phone: string) => {
    setLoading(true);
    setError(null);
    try {
      const foundChildren = await fetchChildren(phone);
      if (foundChildren.length === 0) {
        setError('등록된 자녀 정보가 없습니다. 전화번호를 확인하거나 학원에 문의해주세요.');
        return;
      }

      setPhoneNumber(phone);
      setChildren(foundChildren);
      setSelectedChild(foundChildren[0]);
      setAuthStep('done');
    } catch {
      setError('자녀 정보를 조회하는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, [fetchChildren]);

  /** 로그아웃 */
  const logout = useCallback(() => {
    setChildren([]);
    setSelectedChild(null);
    setPhoneNumber('');
    setAuthStep('phone');
    setError(null);
  }, []);

  return {
    children,
    selectedChild,
    setSelectedChild,
    loading,
    error,
    authStep,
    phoneNumber,
    loginWithPhone,
    logout,
  };
}
