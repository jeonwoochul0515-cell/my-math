import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAcademy } from '../../hooks/useAcademy';
import { useStudents } from '../../hooks/useStudents';
import { getAttendanceByDate, checkIn, checkOut } from '../../services/attendance';
import { AttendanceTableRow, AttendanceMobileCard } from './AttendanceRow';
import Loading from '../common/Loading';
import type { AttendanceRecord, Student } from '../../types';

/** 출결 상태 타입 */
type AttendanceStatus = '출석' | '결석' | '퇴실';

/** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/** 출석 상태 계산 */
function getStatus(record: AttendanceRecord | undefined): AttendanceStatus {
  if (!record) return '결석';
  if (record.checkOut) return '퇴실';
  return '출석';
}

/** 출결 관리 페이지 - 날짜별 학생 출석/퇴실 상태 관리 */
export default function AttendanceManagement() {
  const { user } = useAuth();
  const { academy, loading: academyLoading } = useAcademy(user?.uid ?? null);
  const { students, loading: studentsLoading } = useStudents(academy?.id ?? null);

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  /** 학생별 출결 행 데이터 */
  const rows = students.map((s: Student) => {
    const record = attendanceMap.get(s.id);
    return { student: s, record, status: getStatus(record) };
  });

  const isToday = selectedDate === getTodayString();
  const rowProps = { isToday, actionLoading, onCheckIn: handleCheckIn, onCheckOut: handleCheckOut };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">출결 관리</h2>

      {/* 날짜 선택 */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-blue-600" />
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

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
    </div>
  );
}
