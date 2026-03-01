import { createContext, useContext } from 'react';
import type { Student } from '../types';

/** 학생 컨텍스트 값 타입 */
export interface StudentContextValue {
  student: Student | null;
  loading: boolean;
  error: string | null;
  loginWithPin: (pin: string) => Promise<boolean>;
  logout: () => void;
}

/** 학생 컨텍스트 */
export const StudentContext = createContext<StudentContextValue | null>(null);

/** 학생 컨텍스트 사용 훅 - 컨텍스트가 없으면 에러 발생 */
export function useStudentContext(): StudentContextValue {
  const ctx = useContext(StudentContext);
  if (!ctx) {
    throw new Error('useStudentContext는 StudentProvider 안에서 사용해야 합니다.');
  }
  return ctx;
}
