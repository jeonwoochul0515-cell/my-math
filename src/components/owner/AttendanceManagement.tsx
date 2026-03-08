import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Loader2, UserPlus, Users, UserCheck, Clock, XCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAcademy } from '../../hooks/useAcademy';
import { useStudents } from '../../hooks/useStudents';
import {
  getAttendanceByDate,
  checkIn,
  checkOut,
  manualCheckIn,
  calculateAttendanceStats,
  getStudentAttendanceRates,
} from '../../services/attendance';
import { getClasses } from '../../services/classes';
import type { AttendanceStats, StudentAttendanceRate } from '../../services/attendance';
import { AttendanceTableRow, AttendanceMobileCard } from './AttendanceRow';
import Loading from '../common/Loading';
import type { AttendanceRecord, Student, Class } from '../../types';

/** 날짜 문자열(YYYY-MM-DD)에서 한국어 요일 반환 */
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;
function getDayName(dateStr: string): string {
  return DAY_NAMES[new Date(dateStr + 'T00:00:00').getDay()];
}

/** 출결 상태 타입 */
type AttendanceStatus = '출석' | '지각' | '결석' | '퇴실';

/** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/** 출석 상태 계산 (지각 기준: 18:00 이후 입실) */
function getStatus(record: AttendanceRecord | undefined): AttendanceStatus {
  if (!record) return '결석';
  if (record.checkOut) return '퇴실';
  const h = record.checkIn.getHours();
  if (h >= 18) return '지각';
  return '출석';
}

/** 수동 출결 등록 모달 */
function ManualCheckInModal({
  students,
  date,
  existingStudentIds,
  onClose,
  onSubmit,
}: {
  students: Student[];
  date: string;
  existingStudentIds: Set<string>;
  onClose: () => void;
  onSubmit: (studentId: string, date: string, time: string) => Promise<void>;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /** 미출석 학생만 필터 */
  const absentStudents = students.filter((s) => !existingStudentIds.has(s.id));

  const handleSubmit = async () => {
    if (!selectedStudentId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(selectedStudentId, date, checkInTime);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">수동 출결 등록</h3>
        <p className="mt-1 text-sm text-gray-500">{date} 날짜의 출결을 등록합니다.</p>

        <div className="mt-5 space-y-4">
          {/* 학생 선택 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">학생 선택</label>
            {absentStudents.length === 0 ? (
              <p className="text-sm text-gray-400">모든 학생이 이미 출석 처리되었습니다.</p>
            ) : (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- 학생을 선택하세요 --</option>
                {absentStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.grade})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 입실 시각 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">입실 시각</label>
            <input
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedStudentId || submitting || absentStudents.length === 0}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            등록
          </button>
        </div>
      </div>
    </div>
  );
}

/** 출결 통계 카드 */
function StatsCards({ stats }: { stats: AttendanceStats }) {
  const items = [
    { label: '출석', value: stats.present, icon: UserCheck, bgColor: 'bg-green-50', textColor: 'text-green-700', iconColor: 'text-green-600' },
    { label: '지각', value: stats.late, icon: Clock, bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', iconColor: 'text-yellow-600' },
    { label: '결석', value: stats.absent, icon: XCircle, bgColor: 'bg-red-50', textColor: 'text-red-700', iconColor: 'text-red-600' },
    { label: '출석률', value: `${stats.attendanceRate}%`, icon: BarChart3, bgColor: 'bg-blue-50', textColor: 'text-blue-700', iconColor: 'text-blue-600' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={`flex items-center gap-3 rounded-xl p-4 ${item.bgColor}`}>
          <item.icon className={`h-6 w-6 ${item.iconColor}`} />
          <div>
            <p className={`text-xl font-bold ${item.textColor}`}>{item.value}</p>
            <p className={`text-xs ${item.iconColor}`}>{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 학생별 출석률 패널 */
function AttendanceRatePanel({
  rates,
  students,
}: {
  rates: StudentAttendanceRate[];
  students: Student[];
}) {
  const studentMap = new Map(students.map((s) => [s.id, s]));

  /** 출석률 순 정렬 (낮은 출석률 먼저) */
  const sorted = [...rates].sort((a, b) => a.rate - b.rate);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
        <Users className="h-5 w-5 text-blue-600" />
        학생별 출석률 (최근 30일)
      </h3>
      {sorted.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">학생 데이터가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((r) => {
            const s = studentMap.get(r.studentId);
            const barColor =
              r.rate >= 90 ? 'bg-green-500' :
              r.rate >= 70 ? 'bg-yellow-500' :
              'bg-red-500';
            return (
              <div key={r.studentId} className="flex items-center gap-3">
                <span className="w-20 truncate text-sm font-medium text-gray-700">
                  {s?.name ?? '알 수 없음'}
                </span>
                <span className="w-10 text-xs text-gray-500">{s?.grade ?? '-'}</span>
                <div className="flex-1">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${r.rate}%` }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right text-sm font-semibold text-gray-700">{r.rate}%</span>
                <span className="hidden w-24 text-right text-xs text-gray-400 md:inline">
                  {r.presentDays}출석 / {r.lateDays}지각 / {r.absentDays}결석
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 출결 관리 페이지 - 날짜별 학생 출석/퇴실 상태 관리 + 통계 */
export default function AttendanceManagement() {
  const { user } = useAuth();
  const { academy, loading: academyLoading } = useAcademy(user?.uid ?? null);
  const { students, loading: studentsLoading } = useStudents(academy?.id ?? null);

  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [attendanceRates, setAttendanceRates] = useState<StudentAttendanceRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [showRatesPanel, setShowRatesPanel] = useState(false);

  /** 반 목록 로드 */
  const loadClasses = useCallback(async () => {
    if (!academy?.id) return;
    try {
      const data = await getClasses(academy.id);
      setClasses(data);
    } catch {
      /* 반 로드 실패는 조용히 처리 — 전체 학생 표시 */
    }
  }, [academy?.id]);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  /** 선택된 날짜의 출결 데이터 로드 */
  const loadAttendance = useCallback(async () => {
    if (!academy?.id) return;
    setDataLoading(true);
    try {
      const records = await getAttendanceByDate(academy.id, selectedDate);
      setAttendance(records);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '출결 데이터를 불러오지 못했습니다.');
    } finally {
      setDataLoading(false);
    }
  }, [academy?.id, selectedDate]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  /** 학생별 출석률 로드 */
  const loadRates = useCallback(async () => {
    if (!academy?.id || students.length === 0) return;
    setRatesLoading(true);
    try {
      const ids = students.map((s: Student) => s.id);
      const rates = await getStudentAttendanceRates(academy.id, ids, 30);
      setAttendanceRates(rates);
    } catch {
      /* 출석률 로드 실패는 조용히 처리 */
    } finally {
      setRatesLoading(false);
    }
  }, [academy?.id, students]);

  /** 출석률 패널 토글 시 데이터 로드 */
  useEffect(() => {
    if (showRatesPanel && attendanceRates.length === 0) {
      loadRates();
    }
  }, [showRatesPanel, attendanceRates.length, loadRates]);

  /** 출석 체크인 처리 */
  const handleCheckIn = async (studentId: string) => {
    setActionLoading(studentId);
    try {
      const record = await checkIn(studentId);
      setAttendance((prev) => [record, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : '체크인에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  /** 퇴실 체크아웃 처리 */
  const handleCheckOut = async (attendanceId: string) => {
    setActionLoading(attendanceId);
    try {
      await checkOut(attendanceId);
      setAttendance((prev) =>
        prev.map((r) => r.id === attendanceId ? { ...r, checkOut: new Date() } : r)
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '퇴실 처리에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  /** 수동 출결 등록 처리 */
  const handleManualCheckIn = async (studentId: string, date: string, time: string) => {
    const record = await manualCheckIn(studentId, date, time);
    setAttendance((prev) => [record, ...prev]);
  };

  if (academyLoading || studentsLoading) {
    return <Loading role="owner" message="출결 데이터를 불러오는 중..." />;
  }

  if (!academy) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-medium text-gray-700">학원을 먼저 등록해주세요</p>
      </div>
    );
  }

  /** 출결 맵 (studentId -> AttendanceRecord) */
  const attendanceMap = new Map<string, AttendanceRecord>(
    attendance.map((r) => [r.studentId, r])
  );

  /** 선택 날짜의 요일 */
  const selectedDay = getDayName(selectedDate);

  /** 해당 요일에 수업이 있는 반 ID Set */
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const scheduledClassIds = new Set(
    classes
      .filter((c) => c.schedule.some((s) => s.day === selectedDay))
      .map((c) => c.id)
  );

  /** 오늘 출결 대상 학생: 해당 요일에 수업이 있는 반 학생만 (시간표 없는 반은 모두 포함) */
  const hasAnySchedule = classes.some((c) => c.schedule.length > 0);
  const targetStudents = hasAnySchedule
    ? students.filter((s: Student) => {
        const cls = classMap.get(s.classId);
        // 반 미지정 또는 시간표 미설정 반 → 항상 표시
        if (!cls || cls.schedule.length === 0) return true;
        return scheduledClassIds.has(s.classId);
      })
    : students;

  /** 학생별 출결 행 데이터 */
  const rows = targetStudents.map((s: Student) => {
    const record = attendanceMap.get(s.id);
    return { student: s, record, status: getStatus(record) };
  });

  const isToday = selectedDate === getTodayString();
  const rowProps = { isToday, actionLoading, onCheckIn: handleCheckIn, onCheckOut: handleCheckOut };

  /** 출결 통계 계산 (대상 학생 수 기준) */
  const stats = calculateAttendanceStats(attendance, targetStudents.length);

  /** 이미 출석한 학생 ID 집합 */
  const existingStudentIds = new Set(attendance.map((r) => r.studentId));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">출결 관리</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRatesPanel((prev) => !prev)}
            className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            <BarChart3 className="h-4 w-4" />
            출석률
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" />
            수동 등록
          </button>
        </div>
      </div>

      {/* 날짜 선택 */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-blue-600" />
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
          max={getTodayString()}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        {!isToday && (
          <button
            onClick={() => setSelectedDate(getTodayString())}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            오늘
          </button>
        )}
        <span className="text-sm text-gray-500">
          {selectedDay}요일 · 대상 {targetStudents.length}명
        </span>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {/* 출결 통계 카드 */}
      {!dataLoading && students.length > 0 && (
        <StatsCards stats={stats} />
      )}

      {/* 학생별 출석률 패널 (토글) */}
      {showRatesPanel && (
        ratesLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <AttendanceRatePanel rates={attendanceRates} students={students} />
        )
      )}

      {dataLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">등록된 학생이 없습니다.</p>
      ) : (
        <>
          {/* PC: 테이블 */}
          <div className="hidden rounded-xl bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="px-4 py-3 font-medium">이름</th>
                  <th className="px-4 py-3 font-medium">학년</th>
                  <th className="px-4 py-3 font-medium">입실</th>
                  <th className="px-4 py-3 font-medium">퇴실</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  {isToday && <th className="px-4 py-3 font-medium">액션</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <AttendanceTableRow key={row.student.id} {...row} {...rowProps} />
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일: 카드 */}
          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <AttendanceMobileCard key={row.student.id} {...row} {...rowProps} />
            ))}
          </div>
        </>
      )}

      {/* 수동 출결 등록 모달 */}
      {showManualModal && (
        <ManualCheckInModal
          students={students}
          date={selectedDate}
          existingStudentIds={existingStudentIds}
          onClose={() => setShowManualModal(false)}
          onSubmit={handleManualCheckIn}
        />
      )}
    </div>
  );
}
