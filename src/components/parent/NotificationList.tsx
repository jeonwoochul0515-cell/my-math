import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, BarChart3, AlertTriangle, Loader2 } from 'lucide-react';
import { useParentContext } from '../../context/ParentContext';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../../services/notifications';
import type { Notification as AppNotification } from '../../types';

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
  const { selectedChild } = useParentContext();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /** 알림 목록 로드 */
  const loadNotifications = useCallback(async () => {
    if (!selectedChild) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getNotifications(selectedChild.id);
      setNotifications(data);
    } catch {
      setErrorMsg('알림을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  /** 모두 읽음 처리 */
  const handleMarkAllAsRead = async () => {
    if (!selectedChild) return;
    try {
      await markAllAsRead(selectedChild.id);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch {
      setErrorMsg('읽음 처리에 실패했습니다.');
    }
  };

  /** 개별 읽음 처리 */
  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      /* 에러 무시 */
    }
  };

  /** 시간 포맷팅 */
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  /** 읽지 않은 알림 수 */
  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            onClick={handleMarkAllAsRead}
            className="rounded-lg bg-purple-100 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
          >
            모두 읽음 처리
          </button>
        )}
      </div>

      {/* 알림 목록 */}
      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => {
                if (!notification.isRead) void handleMarkAsRead(notification.id);
              }}
              className={`flex w-full items-start gap-3 rounded-xl p-4 text-left transition-colors ${
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
                  {formatTime(notification.createdAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <CalendarCheck className="h-12 w-12 mb-3" />
          <p className="text-sm">알림이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
