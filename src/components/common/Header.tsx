import { LogOut, Menu } from 'lucide-react';
import type { UserRole } from '../../types';

interface HeaderProps {
  title: string;
  role: UserRole;
  userName?: string;
  onMenuToggle?: () => void;
  onLogout?: () => void;
}

/** 상단 헤더 바 */
export default function Header({ title, role, userName, onMenuToggle, onLogout }: HeaderProps) {
  const bgMap: Record<string, string> = {
    owner: 'bg-blue-600',
    student: 'bg-indigo-600',
    parent: 'bg-purple-600',
    admin: 'bg-gray-800',
  };

  return (
    <header className={`${bgMap[role]} sticky top-0 z-20 px-4 py-3 text-white shadow-md`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button onClick={onMenuToggle} className="md:hidden p-1 rounded-lg hover:bg-white/20">
              <Menu className="h-5 w-5" />
            </button>
          )}
          <h1 className="text-lg font-bold truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {userName && <span className="text-sm hidden sm:inline truncate max-w-[120px]">{userName}</span>}
          {onLogout && (
            <button onClick={onLogout} className="p-1.5 rounded-lg hover:bg-white/20" title="로그아웃">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
