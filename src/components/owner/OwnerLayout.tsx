import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import OwnerLoginForm from './OwnerLoginForm';
import Loading from '../common/Loading';

/** 원장 라우트 인증 래퍼 */
export default function OwnerLayout() {
  const { user, loading } = useAuth();

  /* 인증 상태 확인 중 */
  if (loading) {
    return <Loading role="owner" message="로그인 확인 중..." />;
  }

  /* 미로그인 상태 → 로그인 폼 표시 */
  if (!user) {
    return <OwnerLoginForm />;
  }

  /* 로그인 완료 → 하위 라우트 렌더링 */
  return <Outlet />;
}
