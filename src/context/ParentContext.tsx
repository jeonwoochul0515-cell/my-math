import { createContext, useContext } from 'react';
import type { Student } from '../types';

/** 학부모 인증 단계 */
export type ParentAuthStep = 'phone' | 'done';

/** 학부모 컨텍스트 값 타입 */
export interface ParentContextValue {
  /** 인증된 자녀 목록 */
  children: Student[];
  /** 현재 선택된 자녀 */
  selectedChild: Student | null;
  /** 자녀 선택 변경 */
  setSelectedChild: (child: Student) => void;
  /** 로딩 상태 */
  loading: boolean;
  /** 에러 메시지 (한국어) */
  error: string | null;
  /** 현재 인증 단계 */
  authStep: ParentAuthStep;
  /** 인증된 전화번호 */
  phoneNumber: string;
  /** 전화번호로 자녀 조회 (간소화 인증) */
  loginWithPhone: (phoneNumber: string) => Promise<void>;
  /** 로그아웃 */
  logout: () => void;
}

/** 학부모 컨텍스트 */
export const ParentContext = createContext<ParentContextValue | null>(null);

/** 학부모 컨텍스트 사용 훅 */
export function useParentContext(): ParentContextValue {
  const ctx = useContext(ParentContext);
  if (!ctx) {
    throw new Error('useParentContext는 ParentContext.Provider 안에서 사용해야 합니다.');
  }
  return ctx;
}
