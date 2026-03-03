import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Loader2, BookOpen } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useStudentContext } from '../../context/StudentContext';
import { getSolveLogs, getProblems } from '../../services/problems';
import { analyzeWeakness } from '../../services/analytics';
import type { SolveLog, WeaknessReport, Problem } from '../../types';

/** 요일 라벨 */
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** 최근 7일 일별 정답률 계산 */
function calcDailyAccuracy(logs: SolveLog[]): { day: string; accuracy: number }[] {
  const today = new Date();
  const result: { day: string; accuracy: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLogs = logs.filter((l) => l.solvedAt.toISOString().split('T')[0] === dateStr);
    const correct = dayLogs.filter((l) => l.isCorrect).length;
    result.push({
      day: DAY_LABELS[d.getDay()],
      accuracy: dayLogs.length > 0 ? Math.round((correct / dayLogs.length) * 100) : 0,
    });
  }
  return result;
}

/** 지난 주 대비 변화 계산 */
function calcWeeklyDelta(logs: SolveLog[]): number {
  const today = new Date();
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const thisWeek = logs.filter((l) => l.solvedAt >= thisWeekStart);
  const lastWeek = logs.filter((l) => l.solvedAt >= lastWeekStart && l.solvedAt < thisWeekStart);

  const thisAcc = thisWeek.length > 0 ? Math.round((thisWeek.filter((l) => l.isCorrect).length / thisWeek.length) * 100) : 0;
  const lastAcc = lastWeek.length > 0 ? Math.round((lastWeek.filter((l) => l.isCorrect).length / lastWeek.length) * 100) : 0;
  return thisAcc - lastAcc;
}

/** 정답률 색상 반환 */
function accuracyColor(acc: number): string {
  if (acc >= 80) return 'text-green-600';
  if (acc >= 60) return 'text-amber-600';
  return 'text-red-600';
}

/** 학생 피드백 페이지 — 데이터 기반 약점 분석 및 추이 */
export default function StudentFeedback() {
  const { student } = useStudentContext();
  const [weakTopics, setWeakTopics] = useState<WeaknessReport[]>([]);
  const [dailyData, setDailyData] = useState<{ day: string; accuracy: number }[]>([]);
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [weeklyDelta, setWeeklyDelta] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 데이터 로드 */
  const loadData = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    setError(null);
    try {
      const [logs, probs] = await Promise.all([
        getSolveLogs(student.id),
        getProblems(student.academyId),
      ]);

      /** 문제 ID → 단원 매핑 */
      const topicMap = new Map<string, string>();
      probs.forEach((p: Problem) => topicMap.set(p.id, p.topic));

      /** 약점 분석 (정확도 80% 미만만 필터, 최대 5개) */
      const reports = analyzeWeakness(logs, topicMap);
      setWeakTopics(reports.filter((r) => r.accuracy < 80).slice(0, 5));

      /** 전체 정답률 */
      const total = logs.length;
      const correct = logs.filter((l: SolveLog) => l.isCorrect).length;
      setOverallAccuracy(total > 0 ? Math.round((correct / total) * 100) : 0);

      /** 주간 변화 */
      setWeeklyDelta(calcWeeklyDelta(logs));

      /** 일별 추이 */
      setDailyData(calcDailyAccuracy(logs));
    } catch {
      setError('피드백 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!student) return <Empty text="먼저 홈에서 로그인해주세요." />;
  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (error) return <div className="flex flex-col items-center py-20 text-red-500"><p>{error}</p><button onClick={loadData} className="mt-3 text-sm text-indigo-600 underline">다시 시도</button></div>;
  if (overallAccuracy === 0 && weakTopics.length === 0) return <Empty text="아직 풀이 기록이 없습니다. 문제를 풀어보세요!" />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 전체 정답률 카드 */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 text-center text-white shadow-lg">
        <p className="text-sm font-medium text-indigo-200">전체 정답률</p>
        <p className="mt-1 text-5xl font-extrabold">{overallAccuracy}%</p>
        <div className="mt-2 flex items-center justify-center gap-1 text-sm">
          {weeklyDelta >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-300" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-300" />
          )}
          <span className={weeklyDelta >= 0 ? 'text-green-200' : 'text-red-200'}>
            지난 주 대비 {weeklyDelta >= 0 ? '+' : ''}{weeklyDelta}%
          </span>
        </div>
      </div>

      {/* 약점 분석 */}
      {weakTopics.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">약점 분석</h3>
          {weakTopics.map((w) => (
            <div key={w.topic} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900">{w.topic}</p>
                <span className={`text-sm font-bold ${accuracyColor(w.accuracy)}`}>{w.accuracy}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${w.accuracy}%` }} />
              </div>
              <p className="mt-2 text-sm text-gray-500">{w.recommendation}</p>
              <a href={`/student/solve?topic=${encodeURIComponent(w.topic)}`} className="mt-2 inline-block text-sm font-bold text-indigo-600 hover:text-indigo-700">
                이 단원 연습하기 &rarr;
              </a>
            </div>
          ))}
        </div>
      )}

      {/* 최근 7일 추이 차트 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-gray-900">최근 7일 추이</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
              <Tooltip
                formatter={(value) => [`${String(value)}%`, '정답률']}
                contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
              />
              <Bar dataKey="accuracy" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/** 빈 상태 안내 */
function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <BookOpen className="mb-3 h-12 w-12 text-gray-300" />
      <p className="text-lg font-semibold">{text}</p>
    </div>
  );
}
