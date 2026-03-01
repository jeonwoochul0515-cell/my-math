import { BookOpen, CalendarCheck, Target, TrendingUp } from 'lucide-react';

/** 오늘의 학습 진행 데이터 */
const DAILY_PROGRESS = { completed: 3, total: 5 };

/** 학생 빠른 통계 목 데이터 */
const QUICK_STATS = [
  { label: '이번 주 정답률', value: '85%', icon: Target, color: 'bg-green-100 text-green-600' },
  { label: '연속 출석', value: '12일', icon: CalendarCheck, color: 'bg-amber-100 text-amber-600' },
  { label: '푼 문제 수', value: '47', icon: BookOpen, color: 'bg-indigo-100 text-indigo-600' },
];

/** 진행률 퍼센트 계산 */
function getProgressPercent(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/** 학생 홈 페이지 - 환영 인사, 오늘의 과제, 빠른 통계 표시 */
export default function StudentHome() {
  const studentName = '김민수';
  const progressPercent = getProgressPercent(DAILY_PROGRESS.completed, DAILY_PROGRESS.total);

  return (
    <div className="space-y-6">
      {/* 환영 인사 */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8" />
          <div>
            <h2 className="text-xl font-bold">{studentName}님, 안녕하세요!</h2>
            <p className="mt-1 text-sm text-indigo-100">오늘도 열심히 공부해봐요</p>
          </div>
        </div>
      </div>

      {/* 오늘의 과제 카드 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900">오늘의 문제</h3>
        <p className="mt-1 text-sm text-gray-500">
          오늘의 문제 {DAILY_PROGRESS.total}개 풀기
        </p>

        {/* 진행 상태 텍스트 */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            {DAILY_PROGRESS.completed}/{DAILY_PROGRESS.total} 완료
          </span>
          <span className="font-semibold text-indigo-600">{progressPercent}%</span>
        </div>

        {/* 진행 바 */}
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 빠른 통계 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {QUICK_STATS.map((stat) => (
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
    </div>
  );
}
