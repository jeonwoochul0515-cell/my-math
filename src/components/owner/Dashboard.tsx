import { useState, useEffect } from 'react';
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
import { useAuth } from '../../hooks/useAuth';
import { useAcademy } from '../../hooks/useAcademy';
import { useStudents } from '../../hooks/useStudents';
import { getAttendanceByDate } from '../../services/attendance';
import { getClasses } from '../../services/classes';
import { getProblems } from '../../services/problems';
import Loading from '../common/Loading';
import type { AttendanceRecord, Student } from '../../types';

/** 주간 정답률 데이터 타입 */
interface WeeklyData {
  day: string;
  정답률: number;
}

/** 주간 차트 목업 데이터 (실 데이터 분석은 추후 구현) */
const WEEKLY_DATA: WeeklyData[] = [
  { day: '월', 정답률: 0 },
  { day: '화', 정답률: 0 },
  { day: '수', 정답률: 0 },
  { day: '목', 정답률: 0 },
  { day: '금', 정답률: 0 },
  { day: '토', 정답률: 0 },
  { day: '일', 정답률: 0 },
];

/** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/** 시간 포맷 (HH:MM) */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** 원장 대시보드 - 요약 통계, 최근 출석, 주간 정답률 차트 */
export default function Dashboard() {
  const { user } = useAuth();
  const { academy, loading: academyLoading } = useAcademy(user?.uid ?? null);
  const { students, loading: studentsLoading } = useStudents(academy?.id ?? null);

  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [classCount, setClassCount] = useState(0);
  const [problemCount, setProblemCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 대시보드 데이터 로드 */
  useEffect(() => {
    if (!academy?.id) {
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    const today = getTodayString();

    Promise.all([
      getAttendanceByDate(academy.id, today),
      getClasses(academy.id),
      getProblems(academy.id),
    ])
      .then(([attendance, classes, problems]) => {
        setTodayAttendance(attendance);
        setClassCount(classes.length);
        setProblemCount(problems.length);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setDataLoading(false));
  }, [academy?.id]);

  /** 로딩 상태 */
  if (academyLoading || studentsLoading || dataLoading) {
    return <Loading role="owner" message="대시보드를 불러오는 중..." />;
  }

  /** 학원 미등록 상태 */
  if (!academy) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-gray-700">학원을 먼저 등록해주세요</p>
        <p className="mt-2 text-sm text-gray-500">설정 메뉴에서 학원 정보를 등록할 수 있습니다.</p>
      </div>
    );
  }

  /** 에러 상태 */
  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">데이터를 불러오지 못했습니다: {error}</p>
      </div>
    );
  }

  /** 학생 맵 (ID → Student) - 출석 기록에서 이름 조회용 */
  const studentMap = new Map<string, Student>(students.map((s) => [s.id, s]));

  /** 통계 카드 데이터 */
  const stats = [
    { label: '총 학생', value: students.length, icon: <Users className="h-6 w-6" />, color: 'bg-blue-100 text-blue-600' },
    { label: '오늘 출석', value: todayAttendance.length, icon: <UserCheck className="h-6 w-6" />, color: 'bg-green-100 text-green-600' },
    { label: '총 반', value: classCount, icon: <BookOpen className="h-6 w-6" />, color: 'bg-purple-100 text-purple-600' },
    { label: '생성된 문제', value: problemCount, icon: <FileQuestion className="h-6 w-6" />, color: 'bg-orange-100 text-orange-600' },
  ];

  /** 최근 출석 기록 (최대 5개) */
  const recentCheckins = todayAttendance.slice(0, 5).map((record) => {
    const student = studentMap.get(record.studentId);
    return {
      id: record.id,
      name: student?.name ?? '알 수 없음',
      grade: student?.grade ?? '-',
      time: formatTime(record.checkIn),
    };
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">대시보드</h2>

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
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
          {recentCheckins.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">오늘 출석 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {recentCheckins.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <div>
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="ml-2 text-xs text-gray-500">{item.grade}</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600">{item.time}</span>
                </li>
              ))}
            </ul>
          )}
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
                <Tooltip formatter={(value) => `${String(value)}%`} />
                <Bar dataKey="정답률" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
