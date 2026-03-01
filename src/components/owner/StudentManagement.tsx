import { useState } from 'react';
import { Plus, Trash2, Loader2, X, Users, Phone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAcademy } from '../../hooks/useAcademy';
import { useStudents } from '../../hooks/useStudents';
import Loading from '../common/Loading';
import type { Student } from '../../types';

/** 학년 선택 옵션 */
const GRADE_OPTIONS = ['중1', '중2', '중3', '고1', '고2', '고3'] as const;

/** 입력 필드 공통 스타일 */
const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

/** 랜덤 4자리 PIN 생성 (학생 로그인용, 자동 부여) */
function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** 학생 관리 페이지 - 학생 목록 조회, 추가, 삭제 */
export default function StudentManagement() {
  const { user } = useAuth();
  const { academy, loading: academyLoading } = useAcademy(user?.uid ?? null);
  const {
    students,
    loading: studentsLoading,
    error,
    add,
    remove,
  } = useStudents(academy?.id ?? null);

  /** 폼 표시 여부 */
  const [showForm, setShowForm] = useState(false);
  /** 폼 로딩 상태 */
  const [formLoading, setFormLoading] = useState(false);
  /** 삭제 중인 학생 ID */
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  /** 폼 입력 상태 */
  const [formName, setFormName] = useState('');
  const [formGrade, setFormGrade] = useState('중1');
  const [formPhone, setFormPhone] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');

  /** 폼 초기화 */
  const resetForm = () => {
    setFormName('');
    setFormGrade('중1');
    setFormPhone('');
    setFormParentPhone('');
  };

  /** 학생 추가 처리 (PIN은 자동 생성) */
  const handleAdd = async () => {
    if (!academy?.id || !formName.trim()) return;
    setFormLoading(true);
    try {
      const newStudent: Omit<Student, 'id' | 'createdAt'> = {
        name: formName.trim(),
        grade: formGrade,
        phone: formPhone.trim(),
        parentPhone: formParentPhone.trim(),
        pin: generatePin(),
        classId: '',
        academyId: academy.id,
      };
      await add(newStudent);
      resetForm();
      setShowForm(false);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '학생 추가에 실패했습니다.'
      );
    } finally {
      setFormLoading(false);
    }
  };

  /** 학생 삭제 처리 */
  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 학생을 삭제하시겠습니까?')) return;
    setDeleteLoading(id);
    try {
      await remove(id);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '학생 삭제에 실패했습니다.'
      );
    } finally {
      setDeleteLoading(null);
    }
  };

  /** 로딩 상태 */
  if (academyLoading || studentsLoading) {
    return <Loading role="owner" message="학생 목록을 불러오는 중..." />;
  }

  /** 학원 미등록 상태 */
  if (!academy) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-medium text-gray-700">
          학원을 먼저 등록해주세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">학생 관리</h2>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {students.length}명
          </span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> 학생 추가
        </button>
      </div>

      {/* 학생 추가 폼 */}
      {showForm && (
        <div className="rounded-xl bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              새 학생 추가
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="예: 김수학"
                className={INPUT_CLASS}
              />
            </div>

            {/* 학년 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                학년
              </label>
              <select
                value={formGrade}
                onChange={(e) => setFormGrade(e.target.value)}
                className={INPUT_CLASS}
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                연락처
              </label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="010-0000-0000"
                className={INPUT_CLASS}
              />
            </div>

            {/* 학부모 연락처 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                학부모 연락처
              </label>
              <input
                type="tel"
                value={formParentPhone}
                onChange={(e) => setFormParentPhone(e.target.value)}
                placeholder="010-0000-0000"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={formLoading || !formName.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {formLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            추가하기
          </button>
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 학생 목록 */}
      {students.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          등록된 학생이 없습니다. 학생을 추가해보세요.
        </p>
      ) : (
        <>
          {/* 데스크톱 테이블 */}
          <div className="hidden md:block overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">이름</th>
                  <th className="px-4 py-3 font-medium text-gray-600">학년</th>
                  <th className="px-4 py-3 font-medium text-gray-600">연락처</th>
                  <th className="px-4 py-3 font-medium text-gray-600">학부모 연락처</th>
                  <th className="px-4 py-3 font-medium text-gray-600">관리</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {student.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {student.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {student.parentPhone || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(student.id)}
                        disabled={deleteLoading === student.id}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="학생 삭제"
                      >
                        {deleteLoading === student.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 리스트 */}
          <div className="space-y-3 md:hidden">
            {students.map((student) => (
              <div
                key={student.id}
                className="rounded-xl bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      {student.name}
                    </h3>
                    <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {student.grade}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(student.id)}
                    disabled={deleteLoading === student.id}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="학생 삭제"
                  >
                    {deleteLoading === student.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="mt-3 space-y-1.5 text-sm text-gray-600">
                  {student.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                  {student.parentPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-400">학부모</span>
                      <span>{student.parentPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
