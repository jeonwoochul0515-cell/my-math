import { Loader2 } from 'lucide-react';
import type { UserRole } from '../../types';

interface LoadingProps {
  role?: UserRole;
  message?: string;
}

/** 전체화면 로딩 스피너 */
export default function Loading({ role = 'owner', message = '로딩 중...' }: LoadingProps) {
  const colorMap: Record<string, string> = {
    owner: 'text-blue-600',
    student: 'text-indigo-600',
    parent: 'text-purple-600',
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className={`h-10 w-10 animate-spin ${colorMap[role]}`} />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
