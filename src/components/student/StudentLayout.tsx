import { Outlet } from 'react-router-dom';
import { StudentContext } from '../../context/StudentContext';
import { useStudent } from '../../hooks/useStudent';

/** 학생 라우트 래퍼 - 컨텍스트 제공 */
export default function StudentLayout() {
  const studentState = useStudent();

  return (
    <StudentContext.Provider value={studentState}>
      <Outlet />
    </StudentContext.Provider>
  );
}
