import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../common/AppLayout';
import { ParentContext } from '../../context/ParentContext';
import { useParent } from '../../hooks/useParent';
import { getUnreadCount } from '../../services/notifications';
import type { NavItem } from '../../types';

/** 학부모 네비게이션 항목 */
const parentNavItems: NavItem[] = [
  { label: '홈', path: '/parent', icon: 'Home' },
  { label: '자녀 성적', path: '/parent/grades', icon: 'BarChart3' },
  { label: '전문가 분석', path: '/parent/analysis', icon: 'BrainCircuit' },
  { label: '출결 확인', path: '/parent/attendance', icon: 'CalendarCheck' },
  { label: '알림', path: '/parent/notifications', icon: 'Bell' },
];

/**
 * 학부모 전용 앱 레이아웃
 * ParentContext를 포함하여 알림 배지를 AppLayout에 전달한다.
 * AppLayout 바깥에서 ParentContext를 사용할 수 없는 구조를 해결한다.
 */
export default function ParentAppLayout() {
  const parentState = useParent();
  const [unreadCount, setUnreadCount] = useState(0);

  /** 읽지 않은 알림 수 조회 */
  const fetchUnreadCount = useCallback(async () => {
    if (!parentState.selectedChild) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await getUnreadCount(parentState.selectedChild.id);
      setUnreadCount(count);
    } catch {
      /* 카운트 조회 실패 무시 */
    }
  }, [parentState.selectedChild]);

  /** 선택된 자녀가 바뀌면 카운트 갱신 */
  useEffect(() => {
    void fetchUnreadCount();
  }, [fetchUnreadCount]);

  /** 30초마다 폴링으로 배지 갱신 */
  useEffect(() => {
    if (!parentState.selectedChild) return;
    const interval = setInterval(() => {
      void fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [parentState.selectedChild, fetchUnreadCount]);

  /** 알림 경로에 배지 표시 */
  const badges: Record<string, number> = unreadCount > 0
    ? { '/parent/notifications': unreadCount }
    : {};

  return (
    <ParentContext.Provider value={parentState}>
      <AppLayout
        role="parent"
        title="마이매쓰 학부모"
        navItems={parentNavItems}
        badges={badges}
      />
    </ParentContext.Provider>
  );
}
