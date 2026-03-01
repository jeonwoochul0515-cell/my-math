import { AlertTriangle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/** 단원별 성적 항목 타입 */
interface TopicGrade {
  topic: string;
  accuracy: number;
  correct: number;
  total: number;
}

/** 주간 정답률 추이 데이터 타입 */
interface WeeklyTrend {
  week: string;
  accuracy: number;
}

/** 자녀 성적 확인 페이지 */
export default function ChildGrades() {
  /** 전체 정답률 (목업) */
  const overallAccuracy = 78;

  /** 단원별 성적 데이터 (목업) */
  const topicGrades: TopicGrade[] = [
    { topic: '이차방정식', accuracy: 85, correct: 12, total: 14 },
    { topic: '일차함수', accuracy: 72, correct: 8, total: 11 },
    { topic: '인수분해', accuracy: 90, correct: 9, total: 10 },
    { topic: '제곱근', accuracy: 65, correct: 7, total: 11 },
  ];

  /** 주간 정답률 추이 (목업) */
  const weeklyTrend: WeeklyTrend[] = [
    { week: '1주차', accuracy: 70 },
    { week: '2주차', accuracy: 74 },
    { week: '3주차', accuracy: 80 },
    { week: '4주차', accuracy: 78 },
  ];

  /** 정답률에 따른 색상 반환 */
  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 80) return 'text-green-600';
    if (accuracy >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* 페이지 제목 */}
      <h2 className="text-xl font-bold text-gray-900">자녀 성적</h2>

      {/* 전체 정답률 */}
      <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">전체 정답률</p>
        <p className={`text-5xl font-bold ${getAccuracyColor(overallAccuracy)}`}>
          {overallAccuracy}%
        </p>
        <p className="mt-1 text-sm text-gray-400">최근 전체 문제 기준</p>
      </div>

      {/* 단원별 성적 테이블 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-900">단원별 성적</h3>
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
              {topicGrades.map((grade) => (
                <tr key={grade.topic} className="border-b border-gray-100">
                  <td className="py-3 font-medium text-gray-900">
                    {grade.topic}
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`font-semibold ${getAccuracyColor(grade.accuracy)}`}
                    >
                      {grade.accuracy}%
                    </span>
                  </td>
                  <td className="py-3 text-right text-gray-500">
                    {grade.correct}/{grade.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 주간 정답률 추이 차트 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-900">주간 정답률 추이</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [`${value}%`, '정답률']}
              />
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

      {/* 약점 분석 카드 */}
      <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
        <div>
          <h4 className="font-semibold text-yellow-800">약점 분석</h4>
          <p className="mt-1 text-sm text-yellow-700">
            제곱근 단원 정답률이 65%로 낮습니다. 추가 연습을 권장합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
