import { useState } from 'react';
import { Loader2, Phone, LogIn } from 'lucide-react';
import { useParentContext } from '../../context/ParentContext';

/**
 * 학부모 전화번호 로그인 폼
 * - 전화번호 입력 → students.parent_phone 매칭 → 자녀 목록 조회
 * - 현재는 SMS 인증 없이 전화번호 매칭만으로 간소화
 * - 추후 SMS 인증 추가 시 2단계(phone → code) 전환 가능하도록 구조 유지
 */
export default function ParentLoginForm() {
  const { loading, error, loginWithPhone } = useParentContext();

  /** 전화번호 입력값 */
  const [phone, setPhone] = useState('');

  /** 전화번호 입력 시 숫자와 하이픈만 허용 */
  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^\d-]/g, '');
    setPhone(cleaned);
  };

  /** 로그인 제출 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) return;

    /** 최소 10자리 숫자 확인 (하이픈 제외) */
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 10) return;

    await loginWithPhone(trimmed);
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="rounded-full bg-purple-100 p-4">
            <LogIn className="h-8 w-8 text-purple-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">학부모 로그인</h2>
          <p className="mt-1 text-sm text-gray-500">
            학원에 등록된 전화번호를 입력하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="010-1234-5678"
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || phone.replace(/\D/g, '').length < 10}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              '로그인'
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          학원에서 등록한 학부모 전화번호로 로그인합니다
        </p>
      </div>
    </div>
  );
}
