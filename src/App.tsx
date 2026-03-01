import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { GraduationCap, User, Users } from 'lucide-react';
import AppLayout from './components/common/AppLayout';
import Dashboard from './components/owner/Dashboard';
import AttendanceManagement from './components/owner/AttendanceManagement';
import ClassManagement from './components/owner/ClassManagement';
import AIGeneration from './components/owner/AIGeneration';
import OwnerSettings from './components/owner/Settings';
import StudentHome from './components/student/StudentHome';
import ProblemSolving from './components/student/ProblemSolving';
import GradeCheck from './components/student/GradeCheck';
import StudentProfile from './components/student/StudentProfile';
import ParentHome from './components/parent/ParentHome';
import ChildGrades from './components/parent/ChildGrades';
import AttendanceCheck from './components/parent/AttendanceCheck';
import NotificationList from './components/parent/NotificationList';
import type { UserRole, NavItem } from './types';

/** 역할 선택 카드 */
function RoleCard({ role, icon, label, description, onClick }: {
  role: UserRole;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    owner: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
    student: 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50',
    parent: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50',
  };

  const iconColorMap: Record<string, string> = {
    owner: 'text-blue-600 bg-blue-100',
    student: 'text-indigo-600 bg-indigo-100',
    parent: 'text-purple-600 bg-purple-100',
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-4 rounded-2xl border-2 bg-white p-8 shadow-sm transition-all hover:shadow-md ${colorMap[role]}`}
    >
      <div className={`rounded-full p-4 ${iconColorMap[role]}`}>
        {icon}
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900">{label}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </button>
  );
}

/** 역할 선택 페이지 */
function RoleSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">마이매쓰</h1>
        <p className="mt-2 text-gray-500">소형 수학학원 관리 시스템</p>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
        <RoleCard
          role="owner"
          icon={<User className="h-8 w-8" />}
          label="원장"
          description="학원 관리 및 운영"
          onClick={() => navigate('/owner')}
        />
        <RoleCard
          role="student"
          icon={<GraduationCap className="h-8 w-8" />}
          label="학생"
          description="문제 풀기 및 성적 확인"
          onClick={() => navigate('/student')}
        />
        <RoleCard
          role="parent"
          icon={<Users className="h-8 w-8" />}
          label="학부모"
          description="자녀 성적 및 출결 확인"
          onClick={() => navigate('/parent')}
        />
      </div>

      <p className="mt-8 text-xs text-gray-400">
        본 서비스는 한국지능정보사회진흥원(NIA)의 AI 학습용 데이터를 활용하여 개발되었습니다.
      </p>
    </div>
  );
}

/** 원장 네비게이션 */
const ownerNavItems: NavItem[] = [
  { label: '대시보드', path: '/owner', icon: 'LayoutDashboard' },
  { label: '출결관리', path: '/owner/attendance', icon: 'ClipboardCheck' },
  { label: '반 관리', path: '/owner/classes', icon: 'UsersRound' },
  { label: 'AI 출제', path: '/owner/ai-generate', icon: 'Sparkles' },
  { label: '설정', path: '/owner/settings', icon: 'Settings' },
];

/** 학생 네비게이션 */
const studentNavItems: NavItem[] = [
  { label: '홈', path: '/student', icon: 'Home' },
  { label: '문제풀기', path: '/student/solve', icon: 'PenTool' },
  { label: '성적확인', path: '/student/grades', icon: 'BarChart3' },
  { label: '내 정보', path: '/student/profile', icon: 'UserCircle' },
];

/** 학부모 네비게이션 */
const parentNavItems: NavItem[] = [
  { label: '홈', path: '/parent', icon: 'Home' },
  { label: '자녀 성적', path: '/parent/grades', icon: 'BarChart3' },
  { label: '출결 확인', path: '/parent/attendance', icon: 'CalendarCheck' },
  { label: '알림', path: '/parent/notifications', icon: 'Bell' },
];

/** 앱 라우터 */
function AppRoutes() {
  return (
    <Routes>
      {/* 역할 선택 */}
      <Route path="/" element={<RoleSelectPage />} />

      {/* 원장 라우트 */}
      <Route
        path="/owner"
        element={
          <AppLayout role="owner" title="마이매쓰 원장" navItems={ownerNavItems} />
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="attendance" element={<AttendanceManagement />} />
        <Route path="classes" element={<ClassManagement />} />
        <Route path="ai-generate" element={<AIGeneration />} />
        <Route path="settings" element={<OwnerSettings />} />
      </Route>

      {/* 학생 라우트 */}
      <Route
        path="/student"
        element={
          <AppLayout role="student" title="마이매쓰 학생" navItems={studentNavItems} />
        }
      >
        <Route index element={<StudentHome />} />
        <Route path="solve" element={<ProblemSolving />} />
        <Route path="grades" element={<GradeCheck />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      {/* 학부모 라우트 */}
      <Route
        path="/parent"
        element={
          <AppLayout role="parent" title="마이매쓰 학부모" navItems={parentNavItems} />
        }
      >
        <Route index element={<ParentHome />} />
        <Route path="grades" element={<ChildGrades />} />
        <Route path="attendance" element={<AttendanceCheck />} />
        <Route path="notifications" element={<NotificationList />} />
      </Route>

      {/* 404 → 홈으로 리다이렉트 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** 최상위 App 컴포넌트 */
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
