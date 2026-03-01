import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { useParentContext } from '../../context/ParentContext';
import { getSolveLogs, getProblems } from '../../services/problems';
import { analyzeWeakness } from '../../services/analytics';
import type { WeaknessReport, SolveLog } from '../../types';

/** 주간 정답률 추이 데이터 타입 */
interface WeeklyTrend { week: string; accuracy: number }

/** 주간 추이 계산 */
function buildWeeklyTrend(logs: SolveLog[]): WeeklyTrend[] {
  if (logs.length === 0) return [];
  const sorted = [...logs].sort((a, b) => a.solvedAt.getTime() - b.solvedAt.getTime());
  const weeks = new Map<string, { correct: number; total: number }>();
  for (const log of sorted) {
    const d = log.solvedAt;
    /** ISO 주차 기반 키 생성 */
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${weekNum}`;
    const s = weeks.get(key) ?? { correct: 0, total: 0 };
    s.total += 1;
    if (log.isCorrect) s.correct += 1;
    weeks.set(key, s);
  }
  const entries = [...weeks.entries()];
  /** 최근 8주만 표시 */
  return entries.slice(-8).map(([_key, s], idx) => ({
    week: `${idx + 1}주차`,
    accuracy: Math.round((s.correct / s.total) * 100),
  }));
}

/** 자녀 성적 확인 페이지 */
export default function ChildGrades() {
  const { selectedChild } = useParentContext();
  const [reports, setReports] = useState<WeaknessReport[]>([]);
  const [overallAccuracy, setOverallAccuracy] = useState<number | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedChild) return;
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [logs, problems] = await Promise.all([
          getSolveLogs(selectedChild.id),
          getProblems(selectedChild.academyId),
        ]);

        /** 전체 정답률 */
        if (logs.length > 0) {
          const correct = logs.filter((l) => l.isCorrect).length;
          setOverallAccuracy(Math.round((correct / logs.length) * 100));
        } else {
          setOverallAccuracy(null);
        }

        /** topicMap 구성: problemId → topic */
        const topicMap = new Map<string, string>();
        for (const p of problems) topicMap.set(p.id, p.topic);

        /** 약점 분석 */
        setReports(analyzeWeakness(logs, topicMap));

        /** 주간 추이 */
        setWeeklyTrend(buildWeeklyTrend(logs));
      } catch {
        setErrorMsg('성적 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [selectedChild]);

  /** 정답률에 따른 색상 */
  const getAccuracyColor = (acc: number): string => {
    if (acc >= 80) return 'text-green-600';
    if (acc >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!selectedChild) {
    return <p className="py-16 text-center text-gray-400">먼저 홈에서 로그인해주세요.</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (errorMsg) {
    return <p className="py-16 text-center text-red-500">{errorMsg}</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">자녀 성적</h2>

      {/* 전체 정답률 */}
      <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">전체 정답률</p>
        {overallAccuracy !== null ? (
          <p className={`text-5xl font-bold ${getAccuracyColor(overallAccuracy)}`}>
            {overallAccuracy}%
          </p>
        ) : (
          <p className="text-2xl font-bold text-gray-300">데이터 없음</p>
        )}
        <p className="mt-1 text-sm text-gray-400">전체 풀이 기록 기준</p>
      </div>

      {/* 단원별 성적 테이블 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-900">단원별 성적</h3>
        {reports.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">풀이 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">단원</th>
                  <th className="pb-3 font-medium text-center">정답률</th>
                  <th className="pb-3 font-medium text-right">정답/문제수</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.topic} className="border-b border-gray-100">
                    <td className="py-3 font-medium text-gray-900">{r.topic}</td>
                    <td className="py-3 text-center">
                      <span className={`font-semibold ${getAccuracyColor(r.accuracy)}`}>
                        {r.accuracy}%
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-500">
                      {r.correctCount}/{r.totalProblems}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 주간 정답률 추이 차트 */}
      {weeklyTrend.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">주간 정답률 추이</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value}%`, '정답률']} />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#9333ea"
                  strokeWidth={2}
                  dot={{ fill: '#9333ea', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 약점 분석 카드 */}
      {reports.filter((r) => r.accuracy < 70).map((r) => (
        <div key={r.topic} className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
          <div>
            <h4 className="font-semibold text-yellow-800">약점 분석 - {r.topic}</h4>
            <p className="mt-1 text-sm text-yellow-700">
              {r.topic} 단원 정답률이 {r.accuracy}%로 낮습니다. {r.recommendation}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
