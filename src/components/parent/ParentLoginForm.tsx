import { useState } from 'react';
import { Loader2, Phone, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useParentContext } from '../../context/ParentContext';

/** 학부모 전화번호 인증 로그인 폼 (2단계) */
export default function ParentLoginForm() {
  const {
    loading,
    error,
    authStep,
    phoneNumber,
    sendVerificationCode,
    verifyCode,
  } = useParentContext();

  /** 전화번호 입력값 */
  const [phone, setPhone] = useState('');
  /** 인증번호 입력값 */
  const [code, setCode] = useState('');

  /** Step 1: 인증번호 발송 */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    await sendVerificationCode(phone.trim());
  };

  /** Step 2: 인증번호 확인 */
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.trim().length !== 6) return;
    await verifyCode(code.trim());
  };

  /** 인증번호 재발송 */
  const handleResendCode = async () => {
    setCode('');
    await sendVerificationCode(phoneNumber);
  };

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm">
        {/* Step 1: 전화번호 입력 */}
        {authStep === 'phone' && (
          <>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              학부모 로그인
            </h2>
            <p className="mb-6 text-sm text-gray-500">
              등록된 전화번호를 입력하면 인증번호를 보내드립니다.
            </p>
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                인증번호 발송
              </button>
            </form>
          </>
        )}

        {/* Step 2: 인증번호 입력 */}
        {authStep === 'code' && (
          <>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              전화번호 다시 입력
            </button>
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">인증번호 입력</h2>
            </div>
            <p className="mb-6 text-sm text-gray-500">
              <span className="font-medium text-purple-600">{phoneNumber}</span>
              (으)로 전송된 6자리 인증번호를 입력해주세요.
            </p>
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="인증번호 6자리"
                className="w-full rounded-lg border border-gray-300 py-3 text-center text-lg tracking-widest focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                autoFocus
                disabled={loading}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                인증 확인
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="w-full py-2 text-sm text-purple-600 hover:text-purple-700 hover:underline disabled:opacity-50"
              >
                인증번호 다시 받기
              </button>
            </form>
          </>
        )}
      </div>

      {/* Firebase reCAPTCHA 컨테이너 (invisible이므로 화면에 표시되지 않음) */}
      <div id="recaptcha-container" />
    </div>
  );
}
