import { AlertTriangle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/** 단원별 정답률 목 데이터 */
const TOPIC_ACCURACY = [
  { topic: '이차방정식', accuracy: 85, total: 20, correct: 17 },
  { topic: '일차함수', accuracy: 72, total: 18, correct: 13 },
  { topic: '인수분해', accuracy: 90, total: 10, correct: 9 },
  { topic: '제곱근', accuracy: 65, total: 15, correct: 10 },
];

/** 주간 정답률 추이 목 데이터 */
const WEEKLY_TREND = [
  { day: '월', accuracy: 78 },
  { day: '화', accuracy: 82 },
  { day: '수', accuracy: 75 },
  { day: '목', accuracy: 88 },
  { day: '금', accuracy: 80 },
  { day: '토', accuracy: 92 },
  { day: '일', accuracy: 85 },
];

/** 약점 단원 찾기 - 정답률이 가장 낮은 단원 반환 */
function findWeakestTopic(): { topic: string; accuracy: number } {
  let weakest = TOPIC_ACCURACY[0];
  for (const item of TOPIC_ACCURACY) {
    if (item.accuracy < weakest.accuracy) {
      weakest = item;
    }
  }
  return { topic: weakest.topic, accuracy: weakest.accuracy };
}

/** 전체 정답률 계산 */
function getOverallAccuracy(): number {
  const totalCorrect = TOPIC_ACCURACY.reduce((sum, t) => sum + t.correct, 0);
  const totalProblems = TOPIC_ACCURACY.reduce((sum, t) => sum + t.total, 0);
  if (totalProblems === 0) return 0;
  return Math.round((totalCorrect / totalProblems) * 100);
}

/** 성적 확인 페이지 - 전체 정답률, 단원별 성적, 주간 추이 차트 */
export default function GradeCheck() {
  const overallAccuracy = getOverallAccuracy();
  const weakest = findWeakestTopic();

  return (
    <div className="space-y-6">
      {/* 전체 정답률 카드 */}
      <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 text-white shadow-lg">
        <p className="text-sm font-medium text-indigo-100">전체 정답률</p>
        <p className="mt-2 text-5xl font-extrabold">{overallAccuracy}%</p>
        <p className="mt-2 text-sm text-indigo-200">총 {TOPIC_ACCURACY.reduce((s, t) => s + t.total, 0)}문제 풀이</p>
      </div>

      {/* 단원별 정답률 테이블 */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-bold text-gray-900">단원별 정답률</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {TOPIC_ACCURACY.map((item) => (
            <div key={item.topic} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-medium text-gray-700">{item.topic}</span>
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
                <span className="text-xs text-gray-400">{item.correct}/{item.total}</span>
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
            <BarChart data={WEEKLY_TREND}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 13 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 13 }} unit="%" />
              <Tooltip
                formatter={(value) => [`${value}%`, '정답률']}
                contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
              />
              <Bar dataKey="accuracy" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 약점 알림 */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-bold text-amber-800">약점 단원: {weakest.topic} ({weakest.accuracy}%)</p>
          <p className="mt-1 text-sm text-amber-700">추가 연습이 필요합니다</p>
        </div>
      </div>
    </div>
  );
}
