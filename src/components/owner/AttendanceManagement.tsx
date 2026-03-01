import { useState } from 'react';
import { CalendarDays } from 'lucide-react';

/** 출결 상태 타입 */
type AttendanceStatus = '출석' | '결석' | '조퇴';

/** 출결 행 데이터 타입 */
interface AttendanceRow {
  id: string;
  name: string;
  grade: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
}

/** 상태별 배지 스타일 */
const STATUS_STYLES: Record<AttendanceStatus, string> = {
  출석: 'bg-green-100 text-green-700',
  결석: 'bg-red-100 text-red-700',
  조퇴: 'bg-yellow-100 text-yellow-700',
};

/** 출결 목업 데이터 */
const MOCK_ATTENDANCE: AttendanceRow[] = [
  { id: '1', name: '김민준', grade: '중2', checkIn: '14:02', checkOut: '16:30', status: '출석' },
  { id: '2', name: '이서연', grade: '중3', checkIn: '14:05', checkOut: '16:25', status: '출석' },
  { id: '3', name: '박지호', grade: '고1', checkIn: '14:10', checkOut: null, status: '출석' },
  { id: '4', name: '최수아', grade: '중1', checkIn: '14:15', checkOut: '15:00', status: '조퇴' },
  { id: '5', name: '정예준', grade: '중2', checkIn: '14:18', checkOut: null, status: '출석' },
  { id: '6', name: '한소율', grade: '중3', checkIn: null, checkOut: null, status: '결석' },
  { id: '7', name: '윤도현', grade: '고1', checkIn: '14:30', checkOut: '16:35', status: '출석' },
  { id: '8', name: '장하은', grade: '중2', checkIn: '14:22', checkOut: null, status: '출석' },
];

/** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/** 출결 관리 페이지 - 날짜별 학생 출석/퇴실 상태 관리 */
export default function AttendanceManagement() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">출결 관리</h2>

      {/* 날짜 선택 */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-blue-600" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* PC: 테이블 레이아웃 */}
      <div className="hidden rounded-xl bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">학년</th>
              <th className="px-4 py-3 font-medium">입실</th>
              <th className="px-4 py-3 font-medium">퇴실</th>
              <th className="px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ATTENDANCE.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                <td className="px-4 py-3 text-gray-600">{row.grade}</td>
                <td className="px-4 py-3 text-gray-600">{row.checkIn ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{row.checkOut ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[row.status]}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드 레이아웃 */}
      <div className="space-y-3 md:hidden">
        {MOCK_ATTENDANCE.map((row) => (
          <div key={row.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900">{row.name}</span>
                <span className="ml-2 text-xs text-gray-500">{row.grade}</span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[row.status]}`}>
                {row.status}
              </span>
            </div>
            <div className="mt-2 flex gap-4 text-sm text-gray-500">
              <span>입실: {row.checkIn ?? '-'}</span>
              <span>퇴실: {row.checkOut ?? '-'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
