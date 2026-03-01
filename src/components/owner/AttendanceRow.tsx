import { LogIn, LogOut, Loader2 } from 'lucide-react';
import type { AttendanceRecord, Student } from '../../types';

/** 출결 상태 타입 */
type AttendanceStatus = '출석' | '결석' | '퇴실';

/** 상태별 배지 스타일 */
const STATUS_STYLES: Record<AttendanceStatus, string> = {
  출석: 'bg-green-100 text-green-700',
  결석: 'bg-red-100 text-red-700',
  퇴실: 'bg-gray-100 text-gray-700',
};

/** 시간 포맷 (HH:MM) */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** 액션 버튼 props */
interface ActionBtnProps {
  loading: boolean;
  onClick: () => void;
  type: 'checkIn' | 'checkOut';
}

/** 입실/퇴실 버튼 */
function ActionBtn({ loading, onClick, type }: ActionBtnProps) {
  const isIn = type === 'checkIn';
  const color = isIn ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700';
  const Icon = isIn ? LogIn : LogOut;
  const label = isIn ? '입실' : '퇴실';
  return (
    <button onClick={onClick} disabled={loading}
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs text-white disabled:opacity-50 ${color}`}>
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />} {label}
    </button>
  );
}

/** 행 데이터 props */
interface RowProps {
  student: Student;
  record: AttendanceRecord | undefined;
  status: AttendanceStatus;
  isToday: boolean;
  actionLoading: string | null;
  onCheckIn: (studentId: string) => void;
  onCheckOut: (attendanceId: string) => void;
}

/** 모바일 카드 형태 출결 행 */
export function AttendanceMobileCard({ student, record, status, isToday, actionLoading, onCheckIn, onCheckOut }: RowProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-gray-900">{student.name}</span>
          <span className="ml-2 text-xs text-gray-500">{student.grade}</span>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{status}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-4 text-sm text-gray-500">
          <span>입실: {record?.checkIn ? formatTime(record.checkIn) : '-'}</span>
          <span>퇴실: {record?.checkOut ? formatTime(record.checkOut) : '-'}</span>
        </div>
        {isToday && !record && (
          <ActionBtn loading={actionLoading === student.id} onClick={() => onCheckIn(student.id)} type="checkIn" />
        )}
        {isToday && record && !record.checkOut && (
          <ActionBtn loading={actionLoading === record.id} onClick={() => onCheckOut(record.id)} type="checkOut" />
        )}
      </div>
    </div>
  );
}

/** PC 테이블 행 */
export function AttendanceTableRow({ student, record, status, isToday, actionLoading, onCheckIn, onCheckOut }: RowProps) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
      <td className="px-4 py-3 text-gray-600">{student.grade}</td>
      <td className="px-4 py-3 text-gray-600">{record?.checkIn ? formatTime(record.checkIn) : '-'}</td>
      <td className="px-4 py-3 text-gray-600">{record?.checkOut ? formatTime(record.checkOut) : '-'}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{status}</span>
      </td>
      {isToday && (
        <td className="px-4 py-3">
          {!record ? (
            <ActionBtn loading={actionLoading === student.id} onClick={() => onCheckIn(student.id)} type="checkIn" />
          ) : !record.checkOut ? (
            <ActionBtn loading={actionLoading === record.id} onClick={() => onCheckOut(record.id)} type="checkOut" />
          ) : null}
        </td>
      )}
    </tr>
  );
}
