import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useParentContext } from '../../context/ParentContext';
import { getStudentAttendance } from '../../services/attendance';
import AttendanceCalendar from './AttendanceCalendar';
import type { AttendanceStatus } from './AttendanceCalendar';
import type { AttendanceRecord } from '../../types';

/** 출석 상태별 라벨 */
const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: '출석', absent: '결석', early_leave: '조퇴',
};

/** 시간 포맷 */
const formatTime = (date: Date): string => {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

/** 출결 확인 페이지 */
export default function AttendanceCheck() {
  const { selectedChild } = useParentContext();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  /** 월 변경 시 데이터 로드 */
  useEffect(() => {
    if (!selectedChild) return;
    const load = async () => {
      setLoading(true);
      try {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        setRecords(await getStudentAttendance(selectedChild.id, startDate, endDate));
      } catch { setRecords([]); }
      finally { setLoading(false); }
    };
    void load();
  }, [selectedChild, year, month]);

  /** 일별 출석 상태 맵 구성 */
  const dayStatusMap = new Map<number, AttendanceStatus>();
  for (const rec of records) {
    const day = new Date(rec.date).getDate();
    if (rec.checkOut) {
      const diff = rec.checkOut.getTime() - rec.checkIn.getTime();
      dayStatusMap.set(day, diff / 3600000 < 2 ? 'early_leave' : 'present');
    } else {
      dayStatusMap.set(day, 'present');
    }
  }

  /** 월 이동 */
  const goToPrevMonth = () => { if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1); };
  const goToNextMonth = () => { if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1); };

  /** 출석 통계 */
  const statValues = [...dayStatusMap.values()];
  const presentCount = statValues.filter((s) => s === 'present').length;
  const earlyLeaveCount = statValues.filter((s) => s === 'early_leave').length;

  /** 최근 출결 기록 (최근 5건) */
  const recentLogs = records.slice(0, 5);

  if (!selectedChild) {
    return <p className="py-16 text-center text-gray-400">먼저 홈에서 로그인해주세요.</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">출결 확인</h2>

      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <button onClick={goToPrevMonth} className="rounded-lg p-2 hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900">{year}년 {month}월</h3>
        <button onClick={goToNextMonth} className="rounded-lg p-2 hover:bg-gray-100">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* 캘린더 */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <AttendanceCalendar year={year} month={month} dayStatusMap={dayStatusMap} />
        )}
      </div>

      {/* 출석 통계 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-green-50 p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{presentCount}일</p>
          <p className="mt-1 text-sm text-green-600">출석</p>
        </div>
        <div className="rounded-xl bg-red-50 p-4 text-center">
          <p className="text-2xl font-bold text-red-700">0일</p>
          <p className="mt-1 text-sm text-red-600">결석</p>
        </div>
        <div className="rounded-xl bg-yellow-50 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{earlyLeaveCount}일</p>
          <p className="mt-1 text-sm text-yellow-600">조퇴</p>
        </div>
      </div>

      {/* 최근 출결 기록 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-gray-900">최근 출결 기록</h3>
        {recentLogs.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">출결 기록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log) => {
              const status = dayStatusMap.get(new Date(log.date).getDate()) ?? 'present';
              return (
                <div key={log.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
                  <span className="font-medium text-gray-700">{log.date}</span>
                  <span className="text-gray-500">{formatTime(log.checkIn)} ~ {log.checkOut ? formatTime(log.checkOut) : '-'}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    status === 'present' ? 'bg-green-100 text-green-700' :
                    status === 'absent' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{STATUS_LABEL[status]}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
