import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Loader2, BookOpen } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useStudentContext } from '../../context/StudentContext';
import { getSolveLogs, getProblems } from '../../services/problems';
import { analyzeWeakness } from '../../services/analytics';
import type { SolveLog, WeaknessReport, Problem } from '../../types';

/** 주간 정답률 추이 계산 (최근 7일) */
function calcWeeklyTrend(logs: SolveLog[]): { day: string; accuracy: number }[] {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const result: { day: string; accuracy: number }[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLogs = logs.filter(
      (l) => l.solvedAt.toISOString().split('T')[0] === dateStr
    );
    const correct = dayLogs.filter((l) => l.isCorrect).length;
    const accuracy = dayLogs.length > 0 ? Math.round((correct / dayLogs.length) * 100) : 0;
    result.push({ day: days[d.getDay()], accuracy });
  }
  return result;
}

/** 성적 확인 페이지 - 전체 정답률, 단원별 성적, 주간 추이 차트 */
export default function GradeCheck() {
  const { student } = useStudentContext();
  const [reports, setReports] = useState<WeaknessReport[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<{ day: string; accuracy: number }[]>([]);
  const [totalProblems, setTotalProblems] = useState(0);
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 데이터 로드 */
  const loadData = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    setError(null);
    try {
      /** 풀이 기록과 문제 목록을 병렬 로드 */
      const [logs, problems] = await Promise.all([
        getSolveLogs(student.id),
        getProblems(student.academyId),
      ]);

      /** 문제 ID -> 단원 매핑 */
      const topicMap = new Map<string, string>();
      problems.forEach((p: Problem) => topicMap.set(p.id, p.topic));

      /** 약점 분석 */
      const weakness = analyzeWeakness(logs, topicMap);
      setReports(weakness);

      /** 전체 정답률 계산 */
      const total = logs.length;
      const correct = logs.filter((l: SolveLog) => l.isCorrect).length;
      setTotalProblems(total);
      setOverallAccuracy(total > 0 ? Math.round((correct / total) * 100) : 0);

      /** 주간 추이 */
      setWeeklyTrend(calcWeeklyTrend(logs));
    } catch {
      setError('성적 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** 로그인 전 */
  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <BookOpen className="mb-3 h-12 w-12 text-gray-300" />
        <p>먼저 홈에서 로그인해주세요.</p>
      </div>
    );
  }

  /** 로딩 중 */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  /** 에러 */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <p>{error}</p>
        <button onClick={loadData} className="mt-3 text-sm text-indigo-600 underline">
          다시 시도
        </button>
      </div>
    );
  }

  /** 데이터 없음 */
  if (totalProblems === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <BookOpen className="mb-3 h-12 w-12 text-gray-300" />
        <p className="text-lg font-semibold">아직 풀이 기록이 없습니다</p>
        <p className="mt-1 text-sm">문제를 풀면 성적이 여기에 표시됩니다.</p>
      </div>
    );
  }

  /** 가장 약한 단원 */
  const weakest = reports.length > 0 ? reports[0] : null;

  return (
    <div className="space-y-6">
      {/* 전체 정답률 카드 */}
      <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 text-white shadow-lg">
        <p className="text-sm font-medium text-indigo-100">전체 정답률</p>
        <p className="mt-2 text-5xl font-extrabold">{overallAccuracy}%</p>
        <p className="mt-2 text-sm text-indigo-200">총 {totalProblems}문제 풀이</p>
      </div>

      {/* 단원별 정답률 테이블 */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-bold text-gray-900">단원별 정답률</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {reports.map((item) => (
            <div key={item.topic} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-medium text-gray-700">{item.topic}</span>
              {item.subTopic && <span className="ml-1 text-xs text-gray-400">&middot; {item.subTopic}</span>}
              <div className="flex items-center gap-3">
                <div className="hidden w-32 sm:block">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full ${item.accuracy >= 80 ? 'bg-green-500' : item.accuracy >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${item.accuracy}%` }}
                    />
                  </div>
                </div>
                <span className={`text-sm font-bold ${item.accuracy >= 80 ? 'text-green-600' : item.accuracy >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                  {item.accuracy}%
                </span>
                <span className="text-xs text-gray-400">
                  {item.correctCount}/{item.totalProblems}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 주간 정답률 추이 차트 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-gray-900">주간 정답률 추이</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 13 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 13 }} unit="%" />
              <Tooltip
                formatter={(value) => [`${String(value)}%`, '정답률']}
                contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
              />
              <Bar dataKey="accuracy" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 약점 알림 */}
      {weakest && weakest.accuracy < 80 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              약점 단원: {weakest.topic} ({weakest.accuracy}%)
            </p>
            <p className="mt-1 text-sm text-amber-700">{weakest.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
