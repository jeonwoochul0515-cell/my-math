import { createContext, useContext } from 'react';
import type { Student } from '../types';

/** 학부모 컨텍스트 값 타입 */
export interface ParentContextValue {
  children: Student[];
  selectedChild: Student | null;
  setSelectedChild: (child: Student) => void;
  loading: boolean;
  error: string | null;
  loginWithPhone: (phone: string) => Promise<boolean>;
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
