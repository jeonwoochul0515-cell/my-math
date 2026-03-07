import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAcademy } from '../../hooks/useAcademy';
import { supabase } from '../../config/supabase';
import { getClasses } from '../../services/classes';
import Loading from '../common/Loading';
import StudentResultDetail from './StudentResultDetail';
import type { Class } from '../../types';

/** 학생별 채점 요약 데이터 */
interface StudentSummary {
  id: string;
  name: string;
  grade: string;
  classId: string;
  totalAssignments: number;
  gradedCount: number;
  submittedCount: number;
  pendingCount: number;
  correctCount: number;
  accuracy: number;
}

/** 상태 배지 색상/라벨 매핑 */
function getStatusBadge(summary: StudentSummary): { label: string; className: string } {
  if (summary.totalAssignments === 0) {
    return { label: '배부 없음', className: 'bg-gray-100 text-gray-600' };
  }
  if (summary.pendingCount === summary.totalAssignments) {
    return { label: '미제출', className: 'bg-gray-100 text-gray-600' };
  }
  if (summary.gradedCount === summary.totalAssignments) {
    return { label: '채점 완료', className: 'bg-green-100 text-green-700' };
  }
  return { label: '진행 중', className: 'bg-yellow-100 text-yellow-700' };
}

/** 정답률 색상 반환 */
function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return 'text-green-600';
  if (accuracy >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/** 채점 결과 대시보드 — 원장이 전체 학생의 채점 현황을 확인 */
export default function StudentResults() {
  const { user } = useAuth();
  const { academy, loading: academyLoading } = useAcademy(user?.uid ?? null);

  const [classes, setClasses] = useState<Class[]>([]);
  const [summaries, setSummaries] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterClassId, setFilterClassId] = useState('');

  /** 상세보기 대상 학생 */
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

  /** 학생별 요약 데이터 로드 */
  const loadData = useCallback(async (academyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [classesData, studentsRes, assignmentsRes, solveLogsRes] = await Promise.all([
        getClasses(academyId),
        supabase.from('students').select('id, name, grade, class_id').eq('academy_id', academyId).order('name'),
        supabase.from('problem_assignments').select('id, student_id, status').eq('academy_id', academyId),
        supabase.from('solve_logs').select('student_id, is_correct'),
      ]);

      if (studentsRes.error) throw new Error(studentsRes.error.message);
      if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);
      if (solveLogsRes.error) throw new Error(solveLogsRes.error.message);

      setClasses(classesData);

      const students = studentsRes.data ?? [];
      const assignments = assignmentsRes.data ?? [];
      const solveLogs = solveLogsRes.data ?? [];

      /** 학생별 배부 상태 집계 */
      const assignmentMap = new Map<string, { total: number; graded: number; submitted: number; pending: number }>();
      for (const a of assignments) {
        const sid = a.student_id as string;
        const entry = assignmentMap.get(sid) ?? { total: 0, graded: 0, submitted: 0, pending: 0 };
        entry.total += 1;
        if (a.status === 'graded') entry.graded += 1;
        else if (a.status === 'submitted') entry.submitted += 1;
        else entry.pending += 1;
        assignmentMap.set(sid, entry);
      }

      /** 학생별 정답 집계 */
      const correctMap = new Map<string, { correct: number; total: number }>();
      for (const log of solveLogs) {
        const sid = log.student_id as string;
        const entry = correctMap.get(sid) ?? { correct: 0, total: 0 };
        entry.total += 1;
        if (log.is_correct) entry.correct += 1;
        correctMap.set(sid, entry);
      }

      const result: StudentSummary[] = students.map((s) => {
        const agg = assignmentMap.get(s.id as string) ?? { total: 0, graded: 0, submitted: 0, pending: 0 };
        const corr = correctMap.get(s.id as string) ?? { correct: 0, total: 0 };
        const accuracy = corr.total > 0 ? Math.round((corr.correct / corr.total) * 100) : 0;
        return {
          id: s.id as string,
          name: s.name as string,
          grade: s.grade as string,
          classId: (s.class_id as string) ?? '',
          totalAssignments: agg.total,
          gradedCount: agg.graded,
          submittedCount: agg.submitted,
          pendingCount: agg.pending,
          correctCount: corr.correct,
          accuracy,
        };
      });

      setSummaries(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (academy?.id) loadData(academy.id);
  }, [academy?.id, loadData]);

  /** 로딩 */
  if (academyLoading || loading) {
    return <Loading role="owner" message="채점 결과를 불러오는 중..." />;
  }

  if (!academy) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-medium text-gray-700">학원을 먼저 등록해주세요</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">데이터를 불러오지 못했습니다: {error}</p>
      </div>
    );
  }

  /** 상세 보기 화면 */
  if (selectedStudent) {
    return (
      <StudentResultDetail
        studentId={selectedStudent.id}
        studentName={selectedStudent.name}
        onBack={() => setSelectedStudent(null)}
        onGenerateWeakness={() => {}}
      />
    );
  }

  /** 반 필터 적용 */
  const filtered = filterClassId
    ? summaries.filter((s) => s.classId === filterClassId)
    : summaries;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">채점 결과</h2>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {filtered.length}명
          </span>
        </div>
        {/* 반 필터 */}
        <select
          value={filterClassId}
          onChange={(e) => setFilterClassId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">전체 반</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">해당 조건의 학생이 없습니다.</p>
      ) : (
        <>
          {/* 데스크톱 테이블 */}
          <DesktopTable summaries={filtered} onSelect={setSelectedStudent} />
          {/* 모바일 카드 */}
          <MobileCards summaries={filtered} onSelect={setSelectedStudent} />
        </>
      )}
    </div>
  );
}

/** 데스크톱 테이블 (md 이상) */
function DesktopTable({ summaries, onSelect }: {
  summaries: StudentSummary[];
  onSelect: (s: { id: string; name: string }) => void;
}) {
  return (
    <div className="hidden md:block overflow-x-auto rounded-xl bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left">
            <th className="px-4 py-3 font-medium text-gray-600">이름</th>
            <th className="px-4 py-3 font-medium text-gray-600">학년</th>
            <th className="px-4 py-3 font-medium text-gray-600">상태</th>
            <th className="px-4 py-3 font-medium text-gray-600">정답률</th>
            <th className="px-4 py-3 font-medium text-gray-600">배부/채점</th>
            <th className="px-4 py-3 font-medium text-gray-600">관리</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => {
            const badge = getStatusBadge(s);
            return (
              <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {s.grade}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${getAccuracyColor(s.accuracy)}`}>
                    {s.totalAssignments > 0 ? `${String(s.accuracy)}%` : '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {String(s.gradedCount)}/{String(s.totalAssignments)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onSelect({ id: s.id, name: s.name })}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    상세보기 <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 모바일 카드 (md 미만) */
function MobileCards({ summaries, onSelect }: {
  summaries: StudentSummary[];
  onSelect: (s: { id: string; name: string }) => void;
}) {
  return (
    <div className="space-y-3 md:hidden">
      {summaries.map((s) => {
        const badge = getStatusBadge(s);
        return (
          <div key={s.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">{s.name}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {s.grade}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
              <span className={`text-lg font-bold ${getAccuracyColor(s.accuracy)}`}>
                {s.totalAssignments > 0 ? `${String(s.accuracy)}%` : '-'}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                채점 {String(s.gradedCount)}/{String(s.totalAssignments)}
              </span>
              <button
                onClick={() => onSelect({ id: s.id, name: s.name })}
                className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
              >
                상세보기 <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
