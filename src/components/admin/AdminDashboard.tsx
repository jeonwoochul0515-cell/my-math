import { useState, useEffect } from 'react';
import { Building2, CreditCard, AlertTriangle, TrendingUp } from 'lucide-react';
import { getAllAcademies, getAllPayments } from '../../services/admin';
import Loading from '../common/Loading';
import type { Academy, Payment } from '../../types';

/** 통계 카드 */
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

/** 관리자 대시보드 */
export default function AdminDashboard() {
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  /** 데이터 로드 */
  useEffect(() => {
    Promise.all([getAllAcademies(), getAllPayments()])
      .then(([a, p]) => {
        setAcademies(a);
        setPayments(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Loading role="admin" message="대시보드를 불러오는 중..." />;
  }

  /** 이번 달 결제 완료 건수 */
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const paidThisMonth = payments.filter(
    (p) => p.status === 'paid' && p.periodStart.startsWith(thisMonth)
  );

  /** 미결제 건수 */
  const overdueCount = payments.filter(
    (p) => p.status === 'overdue' || p.status === 'pending'
  ).length;

  /** 이번 달 매출 */
  const monthlyRevenue = paidThisMonth.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">관리자 대시보드</h2>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Building2 className="h-5 w-5 text-gray-600" />}
          label="총 학원 수"
          value={academies.length}
          color="bg-gray-100"
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5 text-green-600" />}
          label="이번달 결제"
          value={`${paidThisMonth.length}건`}
          color="bg-green-100"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
          label="미결제"
          value={`${overdueCount}건`}
          color="bg-orange-100"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          label="이번달 매출"
          value={`${monthlyRevenue.toLocaleString()}원`}
          color="bg-blue-100"
        />
      </div>

      {/* 최근 등록 학원 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">최근 등록 학원</h3>
        {academies.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 학원이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {academies.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{a.name}</p>
                  <p className="text-xs text-gray-500">
                    {a.ownerPhone || '연락처 미등록'} · {a.address || '주소 미등록'}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {a.createdAt.toLocaleDateString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
