import { useState, useEffect } from 'react';
import { CheckCircle, TrendingUp, Calendar, Bell, Target, Loader2 } from 'lucide-react';
import { useParentContext } from '../../context/ParentContext';
import { getSolveLogs } from '../../services/problems';
import { getStudentAttendance } from '../../services/attendance';
import { getNotifications } from '../../services/notifications';
import ParentLoginForm from './ParentLoginForm';
import type { Notification as AppNotification } from '../../types';

/** 학부모 홈 페이지 */
export default function ParentHome() {
  const { children, selectedChild, setSelectedChild } = useParentContext();

  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [weakCount, setWeakCount] = useState(0);
  const [recentNotis, setRecentNotis] = useState<AppNotification[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  /** 선택된 자녀가 바뀌면 통계 새로고침 */
  useEffect(() => {
    if (!selectedChild) return;
    const load = async () => {
      setStatsLoading(true);
      try {
        const logs = await getSolveLogs(selectedChild.id);
        if (logs.length > 0) {
          const correct = logs.filter((l) => l.isCorrect).length;
          setAccuracy(Math.round((correct / logs.length) * 100));
          const topicMap = new Map<string, { total: number; correct: number }>();
          for (const l of logs) {
            const s = topicMap.get(l.problemId) ?? { total: 0, correct: 0 };
            s.total += 1;
            if (l.isCorrect) s.correct += 1;
            topicMap.set(l.problemId, s);
          }
          setWeakCount([...topicMap.values()].filter(
            (s) => s.total >= 2 && s.correct / s.total < 0.7
          ).length);
        } else {
          setAccuracy(null);
          setWeakCount(0);
        }
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const startDate = `${now.getFullYear()}-${mm}-01`;
        const endDate = `${now.getFullYear()}-${mm}-${dd}`;
        const records = await getStudentAttendance(selectedChild.id, startDate, endDate);
        setAttendanceRate(records.length > 0 ? Math.round((records.length / now.getDate()) * 100) : null);
        const notis = await getNotifications(selectedChild.id);
        setRecentNotis(notis.slice(0, 3));
      } catch { /* 통계 로드 실패 무시 */ }
      finally { setStatsLoading(false); }
    };
    void load();
  }, [selectedChild]);

  /** 로그인 전이면 로그인 폼 표시 */
  if (!selectedChild) return <ParentLoginForm />;

  /** 시간 포맷팅 */
  const formatTime = (date: Date): string => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    return date.toLocaleDateString('ko-KR');
  };

  /** 통계 카드 */
  const stats = [
    { label: '전체 정답률', value: accuracy !== null ? `${accuracy}%` : '-', icon: <TrendingUp className="h-6 w-6" />, color: 'bg-purple-100 text-purple-600' },
    { label: '이번 달 출석', value: attendanceRate !== null ? `${attendanceRate}%` : '-', icon: <Calendar className="h-6 w-6" />, color: 'bg-purple-100 text-purple-600' },
    { label: '약점 단원', value: `${weakCount}개`, icon: <Target className="h-6 w-6" />, color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      {/* 환영 메시지 + 자녀 선택 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{selectedChild.name} 학부모님, 안녕하세요!</h2>
          <p className="mt-1 text-sm text-gray-500">자녀의 학습 현황을 한눈에 확인하세요.</p>
        </div>
        {children.length > 1 && (
          <select value={selectedChild.id} onChange={(e) => { const c = children.find((ch) => ch.id === e.target.value); if (c) setSelectedChild(c); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* 자녀 요약 카드 */}
      <div className="rounded-xl border border-purple-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <span className="text-lg font-bold text-purple-600">{selectedChild.name.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{selectedChild.name}</h3>
            <p className="text-sm text-gray-500">{selectedChild.grade}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">등록됨</span>
          </div>
        </div>
      </div>

      {/* 통계 카드 3개 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
            <div className={`rounded-lg p-2.5 ${stat.color}`}>{stat.icon}</div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {statsLoading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 최근 알림 미리보기 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">최근 알림</h3>
        </div>
        {recentNotis.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">최근 알림이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {recentNotis.map((noti) => (
              <div key={noti.id} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-purple-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{noti.message}</p>
                  <p className="mt-1 text-xs text-gray-400">{formatTime(noti.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
