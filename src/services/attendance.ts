import { supabase } from '../config/supabase';
import type { AttendanceRecord } from '../types';

/** DB row를 AttendanceRecord 타입으로 변환 */
function toAttendance(row: Record<string, unknown>): AttendanceRecord {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    checkIn: new Date(row.check_in as string),
    checkOut: row.check_out
      ? new Date(row.check_out as string)
      : undefined,
    date: row.date as string,
  };
}

/** 특정 날짜의 출결 기록 조회 */
export async function getAttendanceByDate(
  academyId: string,
  date: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, students!inner(academy_id)')
    .eq('students.academy_id', academyId)
    .eq('date', date)
    .order('check_in', { ascending: false });
  if (error)
    throw new Error('출결 기록을 불러오지 못했습니다: ' + error.message);
  return (data ?? []).map(toAttendance);
}

/** 학생의 출결 기록 조회 (기간) */
export async function getStudentAttendance(
  studentId: string,
  startDate: string,
  endDate: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });
  if (error)
    throw new Error('출결 기록을 불러오지 못했습니다: ' + error.message);
  return (data ?? []).map(toAttendance);
}

/** 출석 체크인 */
export async function checkIn(
  studentId: string
): Promise<AttendanceRecord> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('attendance')
    .insert({ student_id: studentId, date: today })
    .select()
    .single();
  if (error)
    throw new Error('출석 체크인에 실패했습니다: ' + error.message);
  return toAttendance(data);
}

/** 퇴실 체크아웃 */
export async function checkOut(attendanceId: string): Promise<void> {
  const { error } = await supabase
    .from('attendance')
    .update({ check_out: new Date().toISOString() })
    .eq('id', attendanceId);
  if (error)
    throw new Error('퇴실 처리에 실패했습니다: ' + error.message);
}
