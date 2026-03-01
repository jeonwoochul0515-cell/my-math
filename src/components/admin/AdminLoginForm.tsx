import { useState } from 'react';
import { Lock, LogIn } from 'lucide-react';

interface AdminLoginFormProps {
  error: string | null;
  onLogin: (password: string) => void;
}

/** 관리자 로그인 폼 (비밀번호만 입력) */
export default function AdminLoginForm({ error, onLogin }: AdminLoginFormProps) {
  const [password, setPassword] = useState('');

  /** 폼 제출 */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">마이매쓰 관리자</h1>
          <p className="mt-1 text-sm text-gray-500">관리자 비밀번호를 입력하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-800"
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!password}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
