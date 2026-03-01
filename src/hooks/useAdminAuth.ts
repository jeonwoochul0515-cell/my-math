import { useState, useCallback } from 'react';

/** 관리자 세션 키 */
const ADMIN_SESSION_KEY = 'mymath_admin_auth';

/** 하드코딩된 관리자 비밀번호 */
const ADMIN_PASSWORD = '1234';

/** 관리자 인증 훅 (sessionStorage 기반, Firebase 미사용) */
export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true'
  );
  const [error, setError] = useState<string | null>(null);

  /** 비밀번호 확인 후 로그인 */
  const login = useCallback((password: string) => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setIsAuthenticated(true);
      setError(null);
    } else {
      setError('비밀번호가 올바르지 않습니다.');
    }
  }, []);

  /** 로그아웃 */
  const logout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, error, login, logout };
}
