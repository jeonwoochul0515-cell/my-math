import { useState, useEffect } from 'react';
import { X, Loader2, CheckSquare, Square, Send } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAcademy } from '../../hooks/useAcademy';
import { supabase } from '../../config/supabase';
import { getClasses } from '../../services/classes';
import MathText from '../common/MathText';
import type { Problem, Student, Class } from '../../types';

/** 난이도 한글 라벨 */
const DIFFICULTY_LABEL: Record<string, string> = { easy: '쉬움', medium: '보통', hard: '어려움' };

/** 컴포넌트 Props */
interface Props {
  problems: Problem[];
  onClose: () => void;
}

/** 문제 배부 UI — 선택한 문제를 학생들에게 배부 */
export default function ProblemDistribution({ problems, onClose }: Props) {
  const { user } = useAuth();
  const { academy } = useAcademy(user?.uid ?? null);

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 선택된 학생 ID 집합 */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /** 반 필터 */
  const [filterClassId, setFilterClassId] = useState('');

  /** 학생 + 반 목록 로드 */
  useEffect(() => {
    if (!academy?.id) return;
    setLoading(true);
    Promise.all([
      supabase.from('students').select('*').eq('academy_id', academy.id).order('name'),
      getClasses(academy.id),
    ])
      .then(([studentsRes, classesData]) => {
        if (studentsRes.error) throw new Error(studentsRes.error.message);
        const mapped: Student[] = (studentsRes.data ?? []).map((row) => ({
          id: row.id as string,
          name: row.name as string,
          grade: row.grade as string,
          phone: (row.phone as string) ?? '',
          parentPhone: (row.parent_phone as string) ?? '',
          pin: row.pin as string,
          classId: (row.class_id as string) ?? '',
          academyId: row.academy_id as string,
          createdAt: new Date(row.created_at as string),
        }));
        setStudents(mapped);
        setClasses(classesData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [academy?.id]);

  /** 필터링된 학생 */
  const filtered = filterClassId
    ? students.filter((s) => s.classId === filterClassId)
    : students;

  /** 전체 선택 토글 */
  const handleToggleAll = () => {
    const allFiltered = new Set(filtered.map((s) => s.id));
    const allSelected = filtered.every((s) => selectedIds.has(s.id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of allFiltered) next.delete(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...allFiltered]));
    }
  };

  /** 개별 선택 토글 */
  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** 배부 실행 */
  const handleDistribute = async () => {
    if (!academy?.id || !user?.uid || selectedIds.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      /** 학생-문제 조합 row 생성 */
      const rows = Array.from(selectedIds).flatMap((studentId) =>
        problems.map((p) => ({
          student_id: studentId,
          problem_id: p.id,
          assigned_by: user.uid,
          academy_id: academy.id,
          status: 'pending',
        }))
      );

      const { error: insertErr } = await supabase
        .from('problem_assignments')
        .insert(rows);
      if (insertErr) throw new Error(insertErr.message);

      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '배부에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-lg font-bold text-gray-900">문제 배부</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
            {/* 왼쪽: 문제 목록 */}
            <div className="border-b border-gray-200 p-4 md:border-b-0 md:border-r">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">
                배부할 문제 ({String(problems.length)}개)
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {problems.map((p, i) => (
                  <ProblemRow key={p.id} problem={p} index={i + 1} />
                ))}
              </div>
            </div>

            {/* 오른쪽: 학생 선택 */}
            <div className="p-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">대상 학생 선택</h4>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {/* 반 필터 */}
                  <select
                    value={filterClassId}
                    onChange={(e) => setFilterClassId(e.target.value)}
                    className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">전체 반</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  {/* 전체 선택 */}
                  <button
                    onClick={handleToggleAll}
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600"
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    전체 선택
                  </button>

                  {/* 학생 목록 */}
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {filtered.map((s) => (
                      <StudentCheckbox
                        key={s.id}
                        student={s}
                        checked={selectedIds.has(s.id)}
                        onToggle={() => handleToggle(s.id)}
                      />
                    ))}
                    {filtered.length === 0 && (
                      <p className="py-4 text-center text-xs text-gray-400">학생이 없습니다.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 하단: 에러/성공/배부 버튼 */}
        <div className="border-t border-gray-200 px-5 py-4">
          {error && (
            <p className="mb-2 text-sm text-red-600">{error}</p>
          )}
          {success ? (
            <p className="text-center text-sm font-medium text-green-600">배부가 완료되었습니다!</p>
          ) : (
            <button
              onClick={handleDistribute}
              disabled={submitting || selectedIds.size === 0 || problems.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting
                ? '배부 중...'
                : `${String(problems.length)}문제를 ${String(selectedIds.size)}명에게 배부`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** 문제 미리보기 행 */
function ProblemRow({ problem, index }: { problem: Problem; index: number }) {
  const preview = problem.content.length > 40 ? problem.content.slice(0, 40) + '...' : problem.content;

  return (
    <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
        {String(index)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-gray-800">
          <MathText text={preview} />
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">{problem.topic}</span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
            {DIFFICULTY_LABEL[problem.difficulty] ?? problem.difficulty}
          </span>
        </div>
      </div>
    </div>
  );
}

/** 학생 체크박스 행 */
function StudentCheckbox({ student, checked, onToggle }: {
  student: Student;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-50 transition-colors"
    >
      {checked ? (
        <CheckSquare className="h-4 w-4 shrink-0 text-blue-600" />
      ) : (
        <Square className="h-4 w-4 shrink-0 text-gray-400" />
      )}
      <span className="font-medium text-gray-900">{student.name}</span>
      <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">{student.grade}</span>
    </button>
  );
}
