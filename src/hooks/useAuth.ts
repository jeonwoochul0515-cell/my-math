import { useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../config/firebase';
import type { UserRole } from '../types';

/** 인증 상태 인터페이스 */
interface AuthState {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
}

/** Firebase 인증 훅 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
    error: null,
  });

  /** 인증 상태 변경 감지 */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthState({ user, role: 'owner', loading: false, error: null });
      } else {
        setAuthState({ user: null, role: null, loading: false, error: null });
      }
    });
    return unsubscribe;
  }, []);

  /** 이메일/비밀번호 로그인 (원장용) */
  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setAuthState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  /** 이메일/비밀번호 회원가입 (원장용) */
  const signup = useCallback(async (email: string, password: string) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '회원가입에 실패했습니다.';
      setAuthState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  /** 로그아웃 */
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setAuthState({ user: null, role: null, loading: false, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '로그아웃에 실패했습니다.';
      setAuthState((prev) => ({ ...prev, error: message }));
    }
  }, []);

  return { ...authState, login, signup, logout };
}
