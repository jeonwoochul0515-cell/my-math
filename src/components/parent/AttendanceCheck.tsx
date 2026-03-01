import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** 출석 상태 타입 */
type AttendanceStatus = 'present' | 'absent' | 'early_leave';

/** 일별 출석 데이터 */
interface DayAttendance { day: number; status: AttendanceStatus }

/** 최근 출결 기록 항목 */
interface AttendanceLogItem { date: string; checkIn: string; checkOut: string; status: AttendanceStatus }

/** 출석 상태별 라벨 */
const STATUS_LABEL: Record<AttendanceStatus, string> = { present: '출석', absent: '결석', early_leave: '조퇴' };

/** 요일 헤더 */
const DAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'];

/** 출결 확인 페이지 */
export default function AttendanceCheck() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(3);

  /** 목업 출석 데이터 (3월 기준) */
  const attendanceData: DayAttendance[] = [
    { day: 2, status: 'present' }, { day: 3, status: 'present' },
    { day: 4, status: 'present' }, { day: 5, status: 'present' },
    { day: 6, status: 'present' }, { day: 9, status: 'present' },
    { day: 10, status: 'absent' }, { day: 11, status: 'present' },
    { day: 12, status: 'present' }, { day: 13, status: 'present' },
    { day: 16, status: 'present' }, { day: 17, status: 'present' },
    { day: 18, status: 'early_leave' }, { day: 19, status: 'present' },
    { day: 20, status: 'present' }, { day: 23, status: 'present' },
    { day: 24, status: 'present' }, { day: 25, status: 'present' },
    { day: 26, status: 'present' }, { day: 27, status: 'present' },
  ];

  /** 최근 출결 기록 (목업) */
  const recentLogs: AttendanceLogItem[] = [
    { date: '2026-03-27', checkIn: '15:50', checkOut: '18:00', status: 'present' },
    { date: '2026-03-26', checkIn: '16:00', checkOut: '18:10', status: 'present' },
    { date: '2026-03-25', checkIn: '15:55', checkOut: '18:05', status: 'present' },
    { date: '2026-03-24', checkIn: '16:05', checkOut: '18:00', status: 'present' },
    { date: '2026-03-18', checkIn: '16:00', checkOut: '17:00', status: 'early_leave' },
  ];

  /** 해당 월의 첫째 날 요일 (0=일요일) */
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  /** 해당 월의 총 일수 */
  const daysInMonth = new Date(year, month, 0).getDate();

  /** 오늘 날짜 */
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDate = today.getDate();

  /** 특정 날짜의 출석 상태 조회 */
  const getStatus = (day: number): AttendanceStatus | null => {
    const record = attendanceData.find((d) => d.day === day);
    return record ? record.status : null;
  };

  /** 출석 상태별 점 색상 */
  const getDotColor = (status: AttendanceStatus): string => {
    if (status === 'present') return 'bg-green-500';
    if (status === 'absent') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  /** 이전 달로 이동 */
  const goToPrevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else { setMonth(month - 1); }
  };

  /** 다음 달로 이동 */
  const goToNextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else { setMonth(month + 1); }
  };

  /** 출석 통계 계산 */
  const presentCount = attendanceData.filter((d) => d.status === 'present').length;
  const absentCount = attendanceData.filter((d) => d.status === 'absent').length;
  const earlyLeaveCount = attendanceData.filter((d) => d.status === 'early_leave').length;

  /** 캘린더 셀 배열 생성 */
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">출결 확인</h2>

      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <button onClick={goToPrevMonth} className="rounded-lg p-2 hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          {year}년 {month}월
        </h3>
        <button onClick={goToNextMonth} className="rounded-lg p-2 hover:bg-gray-100">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* 캘린더 그리드 */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="py-2 font-medium text-gray-500">{d}</div>
          ))}
          {calendarCells.map((day, idx) => {
            const status = day ? getStatus(day) : null;
            const isFuture = isCurrentMonth && day !== null && day > todayDate;
            const isToday = isCurrentMonth && day === todayDate;
            return (
              <div
                key={idx}
                className="flex flex-col items-center justify-center py-2"
              >
                {day !== null ? (
                  <>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                        isToday ? 'ring-2 ring-blue-500 font-bold text-blue-600' : ''
                      } ${isFuture ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      {day}
                    </span>
                    {status && !isFuture && (
                      <span className={`mt-1 h-2 w-2 rounded-full ${getDotColor(status)}`} />
                    )}
                  </>
                ) : (
                  <span className="h-8 w-8" />
                )}
              </div>
            );
          })}
        </div>
        {/* 범례 */}
        <div className="mt-3 flex items-center justify-center gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />출석</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />결석</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" />조퇴</span>
        </div>
      </div>

      {/* 출석 통계 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-green-50 p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{presentCount}일</p>
          <p className="mt-1 text-sm text-green-600">출석</p>
        </div>
        <div className="rounded-xl bg-red-50 p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{absentCount}일</p>
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
        <div className="space-y-2">
          {recentLogs.map((log) => (
            <div key={log.date} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
              <span className="font-medium text-gray-700">{log.date}</span>
              <span className="text-gray-500">{log.checkIn} ~ {log.checkOut}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                log.status === 'present' ? 'bg-green-100 text-green-700' :
                log.status === 'absent' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {STATUS_LABEL[log.status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
