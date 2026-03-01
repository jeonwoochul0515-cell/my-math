import { Users, UserCheck, BookOpen, FileQuestion } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/** 통계 카드 데이터 타입 */
interface StatCard {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

/** 최근 출석 데이터 타입 */
interface RecentCheckIn {
  name: string;
  grade: string;
  time: string;
}

/** 주간 정답률 데이터 타입 */
interface WeeklyData {
  day: string;
  정답률: number;
}

/** 대시보드 통계 카드 목록 (목업 데이터) */
const STATS: StatCard[] = [
  { label: '총 학생', value: 42, icon: <Users className="h-6 w-6" />, color: 'bg-blue-100 text-blue-600' },
  { label: '오늘 출석', value: 38, icon: <UserCheck className="h-6 w-6" />, color: 'bg-green-100 text-green-600' },
  { label: '총 반', value: 6, icon: <BookOpen className="h-6 w-6" />, color: 'bg-purple-100 text-purple-600' },
  { label: '이번 주 문제', value: 156, icon: <FileQuestion className="h-6 w-6" />, color: 'bg-orange-100 text-orange-600' },
];

/** 최근 출석 기록 (목업 데이터) */
const RECENT_CHECKINS: RecentCheckIn[] = [
  { name: '김민준', grade: '중2', time: '14:02' },
  { name: '이서연', grade: '중3', time: '14:05' },
  { name: '박지호', grade: '고1', time: '14:10' },
  { name: '최수아', grade: '중1', time: '14:15' },
  { name: '정예준', grade: '중2', time: '14:18' },
];

/** 주간 정답률 차트 데이터 (목업) */
const WEEKLY_DATA: WeeklyData[] = [
  { day: '월', 정답률: 72 },
  { day: '화', 정답률: 68 },
  { day: '수', 정답률: 81 },
  { day: '목', 정답률: 75 },
  { day: '금', 정답률: 85 },
  { day: '토', 정답률: 79 },
  { day: '일', 정답률: 0 },
];

/** 원장 대시보드 - 요약 통계, 최근 출석, 주간 정답률 차트 */
export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">대시보드</h2>

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-2 gap-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm"
          >
            <div className={`rounded-lg p-3 ${stat.color}`}>{stat.icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 최근 출석 + 주간 차트 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 최근 출석 */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-gray-900">최근 출석</h3>
          <ul className="space-y-2">
            {RECENT_CHECKINS.map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{item.grade}</span>
                </div>
                <span className="text-sm text-blue-600 font-medium">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 주간 정답률 차트 */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-gray-900">주간 정답률</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="정답률" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
