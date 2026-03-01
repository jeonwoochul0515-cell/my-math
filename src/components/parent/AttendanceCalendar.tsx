/** 출석 상태 타입 */
export type AttendanceStatus = 'present' | 'absent' | 'early_leave';

/** 요일 헤더 */
const DAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'];

interface AttendanceCalendarProps {
  year: number;
  month: number;
  dayStatusMap: Map<number, AttendanceStatus>;
}

/** 출석 상태별 점 색상 */
const getDotColor = (status: AttendanceStatus): string => {
  if (status === 'present') return 'bg-green-500';
  if (status === 'absent') return 'bg-red-500';
  return 'bg-yellow-500';
};

/** 출결 캘린더 그리드 컴포넌트 */
export default function AttendanceCalendar({ year, month, dayStatusMap }: AttendanceCalendarProps) {
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDate = today.getDate();

  /** 캘린더 셀 배열 */
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="py-2 font-medium text-gray-500">{d}</div>
        ))}
        {calendarCells.map((day, idx) => {
          const status = day ? (dayStatusMap.get(day) ?? null) : null;
          const isFuture = isCurrentMonth && day !== null && day > todayDate;
          const isToday = isCurrentMonth && day === todayDate;
          return (
            <div key={idx} className="flex flex-col items-center justify-center py-2">
              {day !== null ? (
                <>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    isToday ? 'ring-2 ring-blue-500 font-bold text-blue-600' : ''
                  } ${isFuture ? 'text-gray-300' : 'text-gray-700'}`}>
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
  );
}
