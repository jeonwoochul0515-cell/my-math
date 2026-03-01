import { Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import AdminLoginForm from './AdminLoginForm';

/** 관리자 라우트 인증 래퍼 */
export default function AdminLayout() {
  const { isAuthenticated, error, login } = useAdminAuth();

  if (!isAuthenticated) {
    return <AdminLoginForm error={error} onLogin={login} />;
  }

  return <Outlet />;
}
