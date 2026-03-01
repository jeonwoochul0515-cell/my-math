import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

/** 원장 로그인/회원가입 폼 컴포넌트 */
export default function OwnerLoginForm() {
  const { login, signup, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignupMode, setIsSignupMode] = useState(false);

  /** 폼 제출 핸들러 - 로그인 또는 회원가입 실행 */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSignupMode) {
      await signup(email, password);
    } else {
      await login(email, password);
    }
  };

  /** 로그인/회원가입 모드 전환 */
  const toggleMode = () => {
    setIsSignupMode((prev) => !prev);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-blue-600">마이매쓰</h1>
          <p className="mt-2 text-sm text-gray-500">
            {isSignupMode ? '원장 계정을 만들어주세요' : '원장 계정으로 로그인해주세요'}
          </p>
        </div>

        {/* 로그인/회원가입 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이메일 입력 */}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              이메일
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* 비밀번호 입력 */}
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상 입력하세요"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSignupMode ? (
              <UserPlus className="h-4 w-4" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {loading
              ? '처리 중...'
              : isSignupMode
                ? '회원가입'
                : '로그인'}
          </button>
        </form>

        {/* 모드 전환 */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-gray-500 underline transition-colors hover:text-blue-600"
          >
            {isSignupMode
              ? '이미 계정이 있으신가요? 로그인'
              : '계정이 없으신가요? 회원가입'}
          </button>
        </div>
      </div>
    </div>
  );
}
