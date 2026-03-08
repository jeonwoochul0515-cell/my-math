import { useState } from 'react';
import { Check, CreditCard, Banknote, Building2, Loader2 } from 'lucide-react';
import { recordPayment, cancelPayment } from '../../services/tuition';
import type { Student, TuitionPayment } from '../../types';

/** 현재 연월 문자열 */
function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** D-day 계산 (다음 결제일까지 남은 일수) */
function calcDday(paymentDay: number): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  /** 이번 달 수납일 */
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(paymentDay, lastDay);

  if (today <= day) {
    return day - today;
  }
  /** 이미 지났으면 다음 달 수납일까지 */
  const nextMonth = month + 1;
  const nextLastDay = new Date(year, nextMonth + 1, 0).getDate();
  const nextDay = Math.min(paymentDay, nextLastDay);
  const nextDate = new Date(year, nextMonth, nextDay);
  const diff = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

/** D-day 뱃지 (5일 전부터 표시) */
function DdayBadge({ paymentDay, isPaid }: { paymentDay: number; isPaid: boolean }) {
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <Check className="h-3 w-3" /> 수납완료
      </span>
    );
  }

  const dday = calcDday(paymentDay);

  if (dday > 5) return null;

  const label = dday === 0 ? 'D-Day' : dday < 0 ? `D+${Math.abs(dday)}` : `D-${dday}`;
  const colorClass =
    dday <= 0
      ? 'bg-red-100 text-red-700'
      : dday <= 2
        ? 'bg-orange-100 text-orange-700'
        : 'bg-yellow-100 text-yellow-700';

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${colorClass}`}>
      {label}
    </span>
  );
}

/** 결제 수단 아이콘 */
function MethodIcon({ method }: { method: string }) {
  switch (method) {
    case '카드': return <CreditCard className="h-3.5 w-3.5 text-blue-500" />;
    case '이체': return <Building2 className="h-3.5 w-3.5 text-purple-500" />;
    default: return <Banknote className="h-3.5 w-3.5 text-green-500" />;
  }
}

/** 수납 관리 셀 — 학생 1명의 수납 상태 + 체크 버튼 */
export default function TuitionBadge({
  student,
  payment,
  onPaymentChange,
}: {
  student: Student;
  payment: TuitionPayment | undefined;
  onPaymentChange: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const yearMonth = getCurrentYearMonth();

  /** 수납 처리 */
  const handlePay = async (method: '현금' | '카드' | '이체') => {
    setLoading(true);
    setShowMenu(false);
    try {
      await recordPayment(student.id, student.academyId, yearMonth, 0, method);
      onPaymentChange();
    } catch (err) {
      alert(err instanceof Error ? err.message : '수납 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /** 수납 취소 */
  const handleCancel = async () => {
    if (!payment || !confirm('수납을 취소하시겠습니까?')) return;
    setLoading(true);
    try {
      await cancelPayment(payment.id);
      onPaymentChange();
    } catch (err) {
      alert(err instanceof Error ? err.message : '수납 취소에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!student.paymentDay) {
    return <span className="text-xs text-gray-300">미설정</span>;
  }

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
  }

  return (
    <div className="relative flex items-center gap-1.5">
      <span className="text-xs text-gray-500">매월 {student.paymentDay}일</span>
      <DdayBadge paymentDay={student.paymentDay} isPaid={!!payment} />

      {payment ? (
        <button
          onClick={handleCancel}
          className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-green-700 hover:bg-green-50"
          title="수납 취소"
        >
          <MethodIcon method={payment.method} />
          {payment.method}
        </button>
      ) : (
        <>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
          >
            수납
          </button>
          {showMenu && (
            <div className="absolute top-full left-0 z-10 mt-1 rounded-lg bg-white shadow-lg border border-gray-200 py-1">
              {(['현금', '카드', '이체'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => handlePay(m)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <MethodIcon method={m} />
                  {m}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
