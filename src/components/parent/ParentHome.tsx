import { CheckCircle, TrendingUp, Calendar, Bell, Target } from 'lucide-react';

/** 학부모 홈 - 빠른 요약 카드 항목 타입 */
interface StatCard {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

/** 알림 미리보기 항목 타입 */
interface NotificationPreview {
  id: string;
  message: string;
  time: string;
}

/** 학부모 홈 페이지 */
export default function ParentHome() {
  /** 자녀 요약 정보 (목업) */
  const child = {
    name: '김민수',
    grade: '중3',
    className: '중3A반',
    attendanceToday: '출석',
  };

  /** 빠른 통계 카드 데이터 */
  const stats: StatCard[] = [
    {
      label: '이번 주 정답률',
      value: '85%',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: '이번 달 출석률',
      value: '95%',
      icon: <Calendar className="h-6 w-6" />,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: '약점 단원',
      value: '1개',
      icon: <Target className="h-6 w-6" />,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  /** 최근 알림 미리보기 (목업) */
  const recentNotifications: NotificationPreview[] = [
    {
      id: '1',
      message: '김민수 학생이 오늘 16:00에 입실했습니다.',
      time: '오늘 16:00',
    },
    {
      id: '2',
      message: '이번 주 수학 성적이 10% 향상되었습니다.',
      time: '오늘 09:00',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 환영 메시지 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {child.name} 학부모님, 안녕하세요!
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          자녀의 학습 현황을 한눈에 확인하세요.
        </p>
      </div>

      {/* 자녀 요약 카드 */}
      <div className="rounded-xl border border-purple-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <span className="text-lg font-bold text-purple-600">
              {child.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{child.name}</h3>
            <p className="text-sm text-gray-500">
              {child.grade} · {child.className}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              {child.attendanceToday}
            </span>
          </div>
        </div>
      </div>

      {/* 통계 카드 3개 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm"
          >
            <div className={`rounded-lg p-2.5 ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 최근 알림 미리보기 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">최근 알림</h3>
        </div>
        <div className="space-y-3">
          {recentNotifications.map((noti) => (
            <div
              key={noti.id}
              className="flex items-start gap-3 rounded-lg bg-gray-50 p-3"
            >
              <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-purple-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">{noti.message}</p>
                <p className="mt-1 text-xs text-gray-400">{noti.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
