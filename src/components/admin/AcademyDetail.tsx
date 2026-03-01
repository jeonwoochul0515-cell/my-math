import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  CreditCard,
} from 'lucide-react';
import {
  getAcademyDetail,
  updateAcademyAdmin,
  getPayments,
  createPayment,
  deletePayment,
} from '../../services/admin';
import Loading from '../common/Loading';
import type { Academy, Payment, PaymentStatus } from '../../types';

/** 입력 필드 공통 스타일 */
const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-800';

/** 결제 상태 배지 색상 */
const STATUS_STYLE: Record<PaymentStatus, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

/** 결제 상태 라벨 */
const STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: '결제완료',
  pending: '대기',
  overdue: '미결제',
  cancelled: '취소',
};

/** 학원 상세 + 결제 관리 페이지 */
export default function AcademyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [academy, setAcademy] = useState<Academy | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /** 학원 정보 폼 */
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');

  /** 결제 추가 폼 표시 */
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  /** 결제 폼 입력 */
  const [pAmount, setPAmount] = useState('79000');
  const [pStatus, setPStatus] = useState<PaymentStatus>('paid');
  const [pMethod, setPMethod] = useState('');
  const [pMemo, setPMemo] = useState('');
  const [pStart, setPStart] = useState('');
  const [pEnd, setPEnd] = useState('');

  /** 데이터 로드 */
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        getAcademyDetail(id),
        getPayments(id),
      ]);
      if (a) {
        setAcademy(a);
        setFormName(a.name);
        setFormPhone(a.ownerPhone ?? '');
        setFormAddress(a.address ?? '');
      }
      setPayments(p);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** 학원 정보 저장 */
  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateAcademyAdmin(id, {
        name: formName.trim(),
        owner_phone: formPhone.trim(),
        address: formAddress.trim(),
      });
      alert('저장되었습니다.');
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  /** 결제 추가 */
  const handleAddPayment = async () => {
    if (!id || !pStart || !pEnd) return;
    setPaymentLoading(true);
    try {
      const newPayment = await createPayment({
        academyId: id,
        amount: Number(pAmount) || 79000,
        status: pStatus,
        method: pMethod.trim(),
        memo: pMemo.trim(),
        paidAt: pStatus === 'paid' ? new Date() : null,
        periodStart: pStart,
        periodEnd: pEnd,
      });
      setPayments((prev) => [newPayment, ...prev]);
      setShowPaymentForm(false);
      setPAmount('79000');
      setPStatus('paid');
      setPMethod('');
      setPMemo('');
      setPStart('');
      setPEnd('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '결제 추가에 실패했습니다.');
    } finally {
      setPaymentLoading(false);
    }
  };

  /** 결제 삭제 */
  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('이 결제 내역을 삭제하시겠습니까?')) return;
    setDeleteLoading(paymentId);
    try {
      await deletePayment(paymentId);
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return <Loading role="admin" message="학원 정보를 불러오는 중..." />;
  }

  if (!academy) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-medium text-gray-700">학원을 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate('/admin/academies')}
          className="mt-4 text-sm text-gray-500 underline"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/academies')}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">{academy.name}</h2>
      </div>

      {/* 학원 정보 수정 */}
      <div className="rounded-xl bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-gray-900">학원 정보</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학원명
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              원장님 연락처
            </label>
            <input
              type="tel"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="010-0000-0000"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주소
            </label>
            <input
              type="text"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="학원 주소 입력"
              className={INPUT_CLASS}
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-gray-800 px-5 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          저장
        </button>
      </div>

      {/* 결제 내역 */}
      <div className="rounded-xl bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-900">결제 내역</h3>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
              {payments.length}건
            </span>
          </div>
          <button
            onClick={() => setShowPaymentForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 transition-colors"
          >
            <Plus className="h-4 w-4" /> 결제 추가
          </button>
        </div>

        {/* 결제 추가 폼 */}
        {showPaymentForm && (
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  금액 (원)
                </label>
                <input
                  type="number"
                  value={pAmount}
                  onChange={(e) => setPAmount(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  상태
                </label>
                <select
                  value={pStatus}
                  onChange={(e) => setPStatus(e.target.value as PaymentStatus)}
                  className={INPUT_CLASS}
                >
                  <option value="paid">결제완료</option>
                  <option value="pending">대기</option>
                  <option value="overdue">미결제</option>
                  <option value="cancelled">취소</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  결제 수단
                </label>
                <input
                  type="text"
                  value={pMethod}
                  onChange={(e) => setPMethod(e.target.value)}
                  placeholder="카드, 계좌이체 등"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  이용기간 시작
                </label>
                <input
                  type="date"
                  value={pStart}
                  onChange={(e) => setPStart(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  이용기간 종료
                </label>
                <input
                  type="date"
                  value={pEnd}
                  onChange={(e) => setPEnd(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  메모
                </label>
                <input
                  type="text"
                  value={pMemo}
                  onChange={(e) => setPMemo(e.target.value)}
                  placeholder="메모 (선택)"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddPayment}
                disabled={paymentLoading || !pStart || !pEnd}
                className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50 transition-colors"
              >
                {paymentLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                추가
              </button>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 결제 목록 */}
        {payments.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            결제 내역이 없습니다.
          </p>
        ) : (
          <>
            {/* 데스크톱 테이블 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="px-3 py-2 font-medium text-gray-600">이용기간</th>
                    <th className="px-3 py-2 font-medium text-gray-600">금액</th>
                    <th className="px-3 py-2 font-medium text-gray-600">상태</th>
                    <th className="px-3 py-2 font-medium text-gray-600">수단</th>
                    <th className="px-3 py-2 font-medium text-gray-600">메모</th>
                    <th className="px-3 py-2 font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-3 py-2 text-gray-700">
                        {p.periodStart} ~ {p.periodEnd}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {p.amount.toLocaleString()}원
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[p.status]}`}
                        >
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {p.method || '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {p.memo || '-'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => handleDeletePayment(p.id)}
                          disabled={deleteLoading === p.id}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="삭제"
                        >
                          {deleteLoading === p.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 */}
            <div className="space-y-2 md:hidden">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-gray-100 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {p.amount.toLocaleString()}원
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.periodStart} ~ {p.periodEnd}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[p.status]}`}
                      >
                        {STATUS_LABEL[p.status]}
                      </span>
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        disabled={deleteLoading === p.id}
                        className="rounded p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                      >
                        {deleteLoading === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  {(p.method || p.memo) && (
                    <p className="mt-1 text-xs text-gray-400">
                      {[p.method, p.memo].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
