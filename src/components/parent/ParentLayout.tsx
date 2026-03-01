import { Outlet } from 'react-router-dom';
import { ParentContext } from '../../context/ParentContext';
import { useParent } from '../../hooks/useParent';

/** 학부모 라우트 래퍼 - 컨텍스트 제공 */
export default function ParentLayout() {
  const parentState = useParent();

  return (
    <ParentContext.Provider value={parentState}>
      <Outlet />
    </ParentContext.Provider>
  );
}
