import { useState, useEffect, useCallback } from 'react';
import { BookOpen, CalendarCheck, Target, TrendingUp, Loader2, LogIn } from 'lucide-react';
import { useStudentContext } from '../../context/StudentContext';
import { getSolveLogs } from '../../services/problems';
import { getStudentAttendance } from '../../services/attendance';
import type { SolveLog } from '../../types';

/** 진행률 퍼센트 계산 */
function getProgressPercent(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/** 정답률 계산 */
function calcAccuracy(logs: SolveLog[]): number {
  if (logs.length === 0) return 0;
  const correct = logs.filter((l) => l.isCorrect).length;
  return Math.round((correct / logs.length) * 100);
}

/** PIN 로그인 폼 */
function PinLoginForm() {
  const { loginWithPin, loading, error } = useStudentContext();
  const [pin, setPin] = useState('');

  /** PIN 입력 시 숫자만 허용, 4자리 제한 */
  const handlePinChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setPin(digits);
  };

  /** 로그인 제출 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return;
    await loginWithPin(pin);
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="rounded-full bg-indigo-100 p-4">
            <LogIn className="h-8 w-8 text-indigo-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">학생 로그인</h2>
          <p className="mt-1 text-sm text-gray-500">4자리 PIN을 입력하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            placeholder="PIN 4자리"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />

          {error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={pin.length !== 4 || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              '로그인'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/** 학생 홈 페이지 - 환영 인사, 오늘의 과제, 빠른 통계 표시 */
export default function StudentHome() {
  const { student } = useStudentContext();
  const [solveLogs, setSolveLogs] = useState<SolveLog[]>([]);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);

  /** 학생 통계 데이터 로드 */
  const loadStats = useCallback(async () => {
    if (!student) return;
    setStatsLoading(true);
    try {
      const logs = await getSolveLogs(student.id);
      setSolveLogs(logs);

      /** 최근 30일 출결 조회 */
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];
      const attendance = await getStudentAttendance(student.id, startDate, endDate);
      setAttendanceCount(attendance.length);
    } catch {
      /* 통계 로드 실패는 조용히 처리 */
    } finally {
      setStatsLoading(false);
    }
  }, [student]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /** 로그인 전이면 PIN 입력 폼 표시 */
  if (!student) return <PinLoginForm />;

  const accuracy = calcAccuracy(solveLogs);
  const totalSolved = solveLogs.length;
  const todayLogs = solveLogs.filter(
    (l) => l.solvedAt.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
  );
  const todaySolved = todayLogs.length;
  const progressPercent = getProgressPercent(todaySolved, 5);

  /** 빠른 통계 항목 */
  const quickStats = [
    { label: '전체 정답률', value: `${accuracy}%`, icon: Target, color: 'bg-green-100 text-green-600' },
    { label: '이번 달 출석', value: `${attendanceCount}일`, icon: CalendarCheck, color: 'bg-amber-100 text-amber-600' },
    { label: '푼 문제 수', value: String(totalSolved), icon: BookOpen, color: 'bg-indigo-100 text-indigo-600' },
  ];

  return (
    <div className="space-y-6">
      {/* 환영 인사 */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8" />
          <div>
            <h2 className="text-xl font-bold">{student.name}님, 안녕하세요!</h2>
            <p className="mt-1 text-sm text-indigo-100">오늘도 열심히 공부해봐요</p>
          </div>
        </div>
      </div>

      {/* 오늘의 과제 카드 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900">오늘의 문제</h3>
        <p className="mt-1 text-sm text-gray-500">오늘 목표: 5문제 풀기</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">{todaySolved}/5 완료</span>
          <span className="font-semibold text-indigo-600">{progressPercent}%</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* 빠른 통계 카드 */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickStats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className={`rounded-full p-3 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
