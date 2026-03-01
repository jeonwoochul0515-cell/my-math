import { useState } from 'react';
import { CalendarCheck, BarChart3, AlertTriangle } from 'lucide-react';

/** 알림 항목 타입 */
interface NotificationItem {
  id: string;
  type: 'attendance' | 'grade' | 'weakness';
  message: string;
  createdAt: string;
  isRead: boolean;
}

/** 알림 타입별 아이콘 매핑 */
const NOTIFICATION_ICON: Record<string, React.ReactNode> = {
  attendance: <CalendarCheck className="h-5 w-5 text-purple-500" />,
  grade: <BarChart3 className="h-5 w-5 text-purple-500" />,
  weakness: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
};

/** 알림 타입별 라벨 */
const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  attendance: '출결',
  grade: '성적',
  weakness: '약점',
};

/** 알림 목록 페이지 */
export default function NotificationList() {
  /** 알림 목록 상태 (목업 데이터) */
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      type: 'attendance',
      message: '김민수 학생이 오늘 16:00에 입실했습니다.',
      createdAt: '2026-03-01 16:00',
      isRead: false,
    },
    {
      id: '2',
      type: 'grade',
      message: '이번 주 수학 성적이 10% 향상되었습니다.',
      createdAt: '2026-03-01 09:00',
      isRead: false,
    },
    {
      id: '3',
      type: 'weakness',
      message: '제곱근 단원 정답률이 65%로 낮습니다. 추가 연습을 권장합니다.',
      createdAt: '2026-02-28 18:00',
      isRead: false,
    },
    {
      id: '4',
      type: 'attendance',
      message: '김민수 학생이 17:00에 조퇴했습니다.',
      createdAt: '2026-02-27 17:00',
      isRead: true,
    },
    {
      id: '5',
      type: 'grade',
      message: '인수분해 단원 테스트 결과: 90점 (상위 20%)',
      createdAt: '2026-02-26 10:00',
      isRead: true,
    },
    {
      id: '6',
      type: 'attendance',
      message: '김민수 학생이 결석했습니다. 사유를 확인해주세요.',
      createdAt: '2026-02-25 20:00',
      isRead: true,
    },
  ]);

  /** 모두 읽음 처리 */
  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true }))
    );
  };

  /** 읽지 않은 알림 수 */
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">알림</h2>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              읽지 않은 알림 {unreadCount}개
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="rounded-lg bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
          >
            모두 읽음 처리
          </button>
        )}
      </div>

      {/* 알림 목록 */}
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-start gap-3 rounded-xl p-4 transition-colors ${
              notification.isRead
                ? 'bg-gray-50'
                : 'border-l-4 border-purple-500 bg-white shadow-sm'
            }`}
          >
            {/* 아이콘 */}
            <div className="mt-0.5 flex-shrink-0">
              {NOTIFICATION_ICON[notification.type]}
            </div>

            {/* 내용 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  {NOTIFICATION_TYPE_LABEL[notification.type]}
                </span>
                {!notification.isRead && (
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                )}
              </div>
              <p className={`mt-1.5 text-sm ${
                notification.isRead ? 'text-gray-500' : 'text-gray-800'
              }`}>
                {notification.message}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {notification.createdAt}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 알림이 없을 때 */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <CalendarCheck className="h-12 w-12 mb-3" />
          <p className="text-sm">알림이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
