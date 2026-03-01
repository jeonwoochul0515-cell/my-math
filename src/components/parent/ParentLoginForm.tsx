import { useState } from 'react';
import { Loader2, Phone } from 'lucide-react';
import { useParentContext } from '../../context/ParentContext';

/** 학부모 전화번호 로그인 폼 */
export default function ParentLoginForm() {
  const { loading, error, loginWithPhone } = useParentContext();
  const [phone, setPhone] = useState('');

  /** 폼 제출 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    await loginWithPhone(phone.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-xl font-bold text-gray-900">학부모 로그인</h2>
        <p className="mb-6 text-sm text-gray-500">
          등록된 전화번호를 입력해주세요.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
