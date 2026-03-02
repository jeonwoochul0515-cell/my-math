import { useState, useCallback, useRef } from 'react';
import {
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type RecaptchaVerifier,
} from 'firebase/auth';
import { auth, createRecaptchaVerifier } from '../config/firebase';
import { supabase } from '../config/supabase';
import type { Student } from '../types';
import type { ParentAuthStep, ParentContextValue } from '../context/ParentContext';

/** 전화번호를 E.164 형식(+821012345678)으로 변환 */
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('010')) {
    return `+82${digits.slice(1)}`;
  }
  if (digits.startsWith('82')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

/** 학부모 Firebase Phone Auth 및 자녀 관리 훅 */
export function useParent(): ParentContextValue {
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<ParentAuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  /** RecaptchaVerifier 참조 (재생성 방지) */
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  /** reCAPTCHA 인증기 가져오기 (없으면 생성) */
  const getRecaptchaVerifier = useCallback((): RecaptchaVerifier => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = createRecaptchaVerifier('recaptcha-container');
    }
    return recaptchaRef.current;
  }, []);

  /** reCAPTCHA 인증기 정리 */
  const clearRecaptcha = useCallback(() => {
    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }
  }, []);

  /** 전화번호로 인증번호 발송 */
  const sendVerificationCode = useCallback(async (phone: string) => {
    setLoading(true);
    setError(null);
    try {
      const e164Phone = toE164(phone);
      const verifier = getRecaptchaVerifier();
      const result = await signInWithPhoneNumber(auth, e164Phone, verifier);
      setConfirmationResult(result);
      setPhoneNumber(phone);
      setAuthStep('code');
    } catch (err: unknown) {
      clearRecaptcha();
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/invalid-phone-number') {
        setError('올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)');
      } else if (firebaseError.code === 'auth/too-many-requests') {
        setError('인증 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
      } else if (firebaseError.code === 'auth/captcha-check-failed') {
        setError('보안 인증에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
      } else {
        setError('인증번호 발송에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  }, [getRecaptchaVerifier, clearRecaptcha]);

  /** Supabase에서 학부모 전화번호로 자녀 조회 */
  const fetchChildren = useCallback(async (phone: string): Promise<Student[]> => {
    /** 하이픈 제거한 번호와 원본 번호 모두로 검색 */
    const normalized = phone.replace(/\D/g, '');
    const { data, error: dbError } = await supabase
      .from('students')
      .select('*')
      .or(`parent_phone.eq.${phone},parent_phone.eq.${normalized}`);

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

  /** 인증번호 확인 → 자녀 조회 */
  const verifyCode = useCallback(async (code: string) => {
    if (!confirmationResult) {
      setError('인증 세션이 만료되었습니다. 다시 시도해주세요.');
      setAuthStep('phone');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      /** Firebase 인증번호 확인 */
      await confirmationResult.confirm(code);
      clearRecaptcha();

      /** Supabase에서 자녀 조회 */
      const foundChildren = await fetchChildren(phoneNumber);
      if (foundChildren.length === 0) {
        setError('등록된 자녀 정보가 없습니다. 학원에 문의해주세요.');
        await signOut(auth);
        setAuthStep('phone');
        return;
      }

      setChildren(foundChildren);
      setSelectedChild(foundChildren[0]);
      setAuthStep('done');
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/invalid-verification-code') {
        setError('인증번호가 올바르지 않습니다. 다시 확인해주세요.');
      } else if (firebaseError.code === 'auth/code-expired') {
        setError('인증번호가 만료되었습니다. 다시 발송해주세요.');
        setAuthStep('phone');
      } else {
        setError('인증에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  }, [confirmationResult, phoneNumber, clearRecaptcha, fetchChildren]);

  /** 로그아웃 */
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch {
      /** Firebase 로그아웃 실패 시에도 로컬 상태는 초기화 */
    }
    clearRecaptcha();
    setChildren([]);
    setSelectedChild(null);
    setConfirmationResult(null);
    setPhoneNumber('');
    setAuthStep('phone');
    setError(null);
  }, [clearRecaptcha]);

  return {
    children,
    selectedChild,
    setSelectedChild,
    loading,
    error,
    authStep,
    phoneNumber,
    confirmationResult,
    sendVerificationCode,
    verifyCode,
    logout,
  };
}
