import AppLayout from '../common/AppLayout';
import { useAuth } from '../../hooks/useAuth';
import { useAcademy } from '../../hooks/useAcademy';
import { useManifest } from '../../hooks/useManifest';
import type { NavItem } from '../../types';

/** 원장 네비게이션 */
const ownerNavItems: NavItem[] = [
  { label: '대시보드', path: '/owner', icon: 'LayoutDashboard' },
  { label: '출결관리', path: '/owner/attendance', icon: 'ClipboardCheck' },
  { label: '반 관리', path: '/owner/classes', icon: 'UsersRound' },
  { label: '학생관리', path: '/owner/students', icon: 'GraduationCap' },
  { label: 'AI 출제', path: '/owner/ai-generate', icon: 'Sparkles' },
  { label: '채점 결과', path: '/owner/results', icon: 'ClipboardList' },
  { label: '설정', path: '/owner/settings', icon: 'Settings' },
];

/** 원장 AppLayout — 학원 로고/이름을 헤더에 반영 */
export default function OwnerAppLayout() {
  const { user } = useAuth();
  const { academy } = useAcademy(user?.uid ?? null);

  /** PWA manifest에 학원 정보 반영 */
  useManifest(academy);

  /** 학원명이 있으면 헤더 타이틀에 반영 */
  const title = academy?.name ?? '마이매쓰 원장';

  return (
    <AppLayout
      role="owner"
      title={title}
      navItems={ownerNavItems}
      userName={user?.displayName ?? user?.email ?? undefined}
      logoUrl={academy?.logoUrl ?? undefined}
      onLogout={undefined}
    />
  );
}
