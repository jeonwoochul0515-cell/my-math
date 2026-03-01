import { User, CheckCircle, XCircle } from 'lucide-react';

/** 학생 프로필 목 데이터 */
const STUDENT_INFO = {
  name: '김민수',
  grade: '중3',
  className: '중3A반',
  pin: '****',
  academy: '이룸수학',
};

/** 최근 풀이 기록 타입 */
interface RecentActivity {
  date: string;
  topic: string;
  isCorrect: boolean;
}

/** 최근 풀이 기록 목 데이터 */
const RECENT_ACTIVITIES: RecentActivity[] = [
  { date: '2026-02-28', topic: '이차방정식', isCorrect: true },
  { date: '2026-02-28', topic: '인수분해', isCorrect: true },
  { date: '2026-02-27', topic: '제곱근', isCorrect: false },
  { date: '2026-02-27', topic: '일차함수', isCorrect: true },
  { date: '2026-02-26', topic: '이차방정식', isCorrect: false },
];

/** 프로필 정보 항목 */
const PROFILE_FIELDS = [
  { label: '이름', value: STUDENT_INFO.name },
  { label: '학년', value: STUDENT_INFO.grade },
  { label: '반', value: STUDENT_INFO.className },
  { label: '출석 PIN', value: STUDENT_INFO.pin },
  { label: '학원명', value: STUDENT_INFO.academy },
];

/** 날짜 포맷 변환 (YYYY-MM-DD → M월 D일) */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/** 학생 프로필 페이지 - 개인 정보 및 최근 활동 표시 */
export default function StudentProfile() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 프로필 카드 */}
      <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* 아바타 */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-white">
          <User className="h-10 w-10" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">{STUDENT_INFO.name}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {STUDENT_INFO.grade} | {STUDENT_INFO.className}
        </p>
      </div>

      {/* 상세 정보 */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-bold text-gray-900">내 정보</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {PROFILE_FIELDS.map((field) => (
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
        <div className="divide-y divide-gray-100">
          {RECENT_ACTIVITIES.map((activity, index) => (
            <div key={index} className="flex items-center justify-between px-5 py-3">
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
      </div>
    </div>
  );
}
