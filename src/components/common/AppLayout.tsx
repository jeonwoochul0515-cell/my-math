import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Header from './Header';
import type { UserRole, NavItem } from '../../types';

interface AppLayoutProps {
  role: UserRole;
  title: string;
  navItems: NavItem[];
  userName?: string;
  onLogout?: () => void;
  /** 네비 항목별 배지 숫자 (path -> count). 0이면 표시하지 않음 */
  badges?: Record<string, number>;
}

/** 메인 앱 레이아웃 - PC: 사이드바 + 콘텐츠 / 모바일: 하단탭 + 콘텐츠 */
export default function AppLayout({ role, title, navItems, userName, onLogout, badges }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bgMap: Record<string, string> = {
    owner: 'bg-blue-600',
    student: 'bg-indigo-600',
    parent: 'bg-purple-600',
    admin: 'bg-gray-800',
  };

  const activeBgMap: Record<string, string> = {
    owner: 'bg-blue-700',
    student: 'bg-indigo-700',
    parent: 'bg-purple-700',
    admin: 'bg-gray-900',
  };

  /** 활성 텍스트 색상 맵 */
  const activeTextMap: Record<string, string> = {
    owner: 'text-blue-600',
    student: 'text-indigo-600',
    parent: 'text-purple-600',
    admin: 'text-gray-800',
  };

  /** 아이콘 이름으로 Lucide 아이콘 컴포넌트 가져오기 */
  const getIcon = (iconName: string) => {
    const icons = LucideIcons as Record<string, unknown>;
    const Icon = icons[iconName] as (React.ComponentType<{ className?: string }>) | undefined;
    return Icon ? <Icon className="h-5 w-5" /> : null;
  };

  /** 배지 숫자를 표시하는 컴포넌트 */
  const renderBadge = (path: string, variant: 'sidebar' | 'tab' = 'sidebar') => {
    const count = badges?.[path];
    if (!count || count <= 0) return null;
    const display = count > 99 ? '99+' : String(count);
    if (variant === 'tab') {
      return (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {display}
        </span>
      );
    }
    return (
      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
        {display}
      </span>
    );
  };

  /** 사이드바 네비게이션 링크 스타일 */
  const navLinkClasses = (isActive: boolean) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? `${activeBgMap[role]} text-white`
        : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <Header
        title={title}
        role={role}
        userName={userName}
        onMenuToggle={() => setSidebarOpen(true)}
        onLogout={onLogout}
      />

      <div className="flex">
        {/* PC 사이드바 (769px 이상) — sticky 헤더 아래 고정 */}
        <aside
          className={`hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:top-[52px] ${bgMap[role]} p-3 overflow-y-auto`}
        >
          <nav className="flex flex-col gap-1 mt-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/owner' || item.path === '/student' || item.path === '/parent' || item.path === '/admin'}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                {getIcon(item.icon)}
                <span>{item.label}</span>
                {renderBadge(item.path, 'sidebar')}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* 모바일 사이드바 오버레이 */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className={`absolute left-0 top-0 bottom-0 w-64 ${bgMap[role]} p-4`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 text-white/80 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/owner' || item.path === '/student' || item.path === '/parent' || item.path === '/admin'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => navLinkClasses(isActive)}
                  >
                    {getIcon(item.icon)}
                    <span>{item.label}</span>
                    {renderBadge(item.path, 'sidebar')}
                  </NavLink>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* 메인 콘텐츠 — 모바일: 하단탭(h-16) 여백 확보, PC: 사이드바 240px 오프셋 */}
        <main className="flex-1 md:ml-60 p-4 pb-20 md:pb-6 mt-0">
          <Outlet />
        </main>
      </div>

      {/* 모바일 하단 탭바 (768px 이하) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-30">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/owner' || item.path === '/student' || item.path === '/parent' || item.path === '/admin'}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 px-2 py-1 text-xs ${
                  isActive
                    ? `${activeTextMap[role]} font-semibold`
                    : 'text-gray-500'
                }`
              }
            >
              {getIcon(item.icon)}
              <span>{item.label}</span>
              {renderBadge(item.path, 'tab')}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
