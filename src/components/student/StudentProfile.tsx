import { useState, useEffect, useCallback } from 'react';
import { User, CheckCircle, XCircle, Loader2, BookOpen } from 'lucide-react';
import { useStudentContext } from '../../context/StudentContext';
import { getSolveLogs, getProblems } from '../../services/problems';
import type { SolveLog, Problem } from '../../types';

/** 풀이 기록 + 단원명을 합친 타입 */
interface RecentActivity {
  id: string;
  date: string;
  topic: string;
  isCorrect: boolean;
}

/** 날짜 포맷 변환 (YYYY-MM-DD -> M월 D일) */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/** 학생 프로필 페이지 - 개인 정보 및 최근 활동 표시 */
export default function StudentProfile() {
  const { student, logout } = useStudentContext();
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  /** 최근 풀이 기록 로드 */
  const loadActivities = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    try {
      const [logs, problems] = await Promise.all([
        getSolveLogs(student.id),
        getProblems(student.academyId),
      ]);

      /** 문제 ID -> 단원 매핑 */
      const topicMap = new Map<string, string>();
      problems.forEach((p: Problem) => topicMap.set(p.id, p.topic));

      /** 최근 10개만 표시 */
      const recent = logs.slice(0, 10).map((log: SolveLog) => ({
        id: log.id,
        date: log.solvedAt.toISOString().split('T')[0],
        topic: topicMap.get(log.problemId) ?? '기타',
        isCorrect: log.isCorrect,
      }));
      setActivities(recent);
    } catch {
      /* 활동 로드 실패 시 빈 목록 표시 */
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  /** 로그인 전 */
  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <BookOpen className="mb-3 h-12 w-12 text-gray-300" />
        <p>먼저 홈에서 로그인해주세요.</p>
      </div>
    );
  }

  /** 프로필 정보 항목 */
  const profileFields = [
    { label: '이름', value: student.name },
    { label: '학년', value: student.grade },
    { label: '반', value: student.classId || '-' },
    { label: '출석 PIN', value: '****' },
    { label: '학원 ID', value: student.academyId },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 프로필 카드 */}
      <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-white">
          <User className="h-10 w-10" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">{student.name}</h2>
        <p className="mt-1 text-sm text-gray-500">{student.grade}</p>
        <button
          onClick={logout}
          className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
        >
          로그아웃
        </button>
      </div>

      {/* 상세 정보 */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-bold text-gray-900">내 정보</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {profileFields.map((field) => (
            <div key={field.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-500">{field.label}</span>
              <span className="text-sm font-medium text-gray-900">{field.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 최근 풀이 기록 */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-bold text-gray-900">최근 풀이 기록</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : activities.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            아직 풀이 기록이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  {activity.isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-700">{activity.topic}</p>
                    <p className="text-xs text-gray-400">{formatDate(activity.date)}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold ${activity.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {activity.isCorrect ? '정답' : '오답'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
