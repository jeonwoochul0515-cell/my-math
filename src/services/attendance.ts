import { supabase } from '../config/supabase';
import { createNotification } from './notifications';
import type { AttendanceRecord } from '../types';

/** 출결 통계 타입 */
export interface AttendanceStats {
  /** 출석 수 */
  present: number;
  /** 지각 수 */
  late: number;
  /** 결석 수 */
  absent: number;
  /** 퇴실 완료 수 */
  checkedOut: number;
  /** 총 학생 수 */
  total: number;
  /** 출석률 (%) */
  attendanceRate: number;
}

/** 학생별 출석률 정보 */
export interface StudentAttendanceRate {
  studentId: string;
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  rate: number;
}

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

/** 오늘 날짜를 YYYY-MM-DD로 반환 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/** 시간 포맷 (HH:MM) */
function formatTimeShort(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
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
  const today = getTodayString();

  /** 이미 오늘 체크인했는지 확인 (중복 방지) */
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('student_id', studentId)
    .eq('date', today)
    .maybeSingle();
  if (existing) {
    throw new Error('이미 오늘 출석 체크인이 완료되었습니다.');
  }

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

/**
 * PIN 기반 자동 체크인 - 학생 로그인 시 호출
 * 이미 체크인되어 있으면 기존 기록 반환, 없으면 새로 생성
 */
export async function checkInByPin(
  studentId: string,
  studentName: string,
  parentPhone: string
): Promise<AttendanceRecord> {
  const today = getTodayString();

  /** 오늘 이미 체크인 기록이 있는지 확인 */
  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .eq('date', today)
    .maybeSingle();

  if (existing) {
    return toAttendance(existing);
  }

  /** 새 체크인 기록 생성 */
  const { data, error } = await supabase
    .from('attendance')
    .insert({ student_id: studentId, date: today })
    .select()
    .single();
  if (error)
    throw new Error('자동 체크인에 실패했습니다: ' + error.message);

  const record = toAttendance(data);

  /** 학부모 알림 발송 (비동기 — 실패해도 체크인 결과는 반환) */
  sendAttendanceNotification(
    studentId,
    parentPhone,
    'checkIn',
    studentName,
    record.checkIn
  ).catch(() => {
    /* 알림 발송 실패는 조용히 처리 */
  });

  return record;
}

/** 체크아웃 + 학부모 알림 */
export async function checkOutWithNotification(
  attendanceId: string,
  studentId: string,
  studentName: string,
  parentPhone: string
): Promise<void> {
  await checkOut(attendanceId);

  /** 학부모 알림 발송 (비동기) */
  sendAttendanceNotification(
    studentId,
    parentPhone,
    'checkOut',
    studentName,
    new Date()
  ).catch(() => {
    /* 알림 발송 실패는 조용히 처리 */
  });
}

/** 수동 출결 등록 (원장용 — 과거 날짜도 가능) */
export async function manualCheckIn(
  studentId: string,
  date: string,
  checkInTime?: string
): Promise<AttendanceRecord> {
  /** 해당 날짜에 이미 기록이 있는지 확인 */
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('student_id', studentId)
    .eq('date', date)
    .maybeSingle();
  if (existing) {
    throw new Error('해당 날짜에 이미 출결 기록이 있습니다.');
  }

  /** 체크인 시각 결정 — 지정 시각 또는 해당 날짜 09:00 기본값 */
  const checkInTimestamp = checkInTime
    ? `${date}T${checkInTime}:00`
    : `${date}T09:00:00`;

  const { data, error } = await supabase
    .from('attendance')
    .insert({
      student_id: studentId,
      date,
      check_in: checkInTimestamp,
    })
    .select()
    .single();
  if (error)
    throw new Error('수동 출결 등록에 실패했습니다: ' + error.message);
  return toAttendance(data);
}

/**
 * 날짜별 출결 통계 계산
 * @param records 해당 날짜 출결 기록
 * @param totalStudents 전체 학생 수
 * @param lateThreshold 지각 기준 시각 (HH:MM, 기본 "18:00")
 */
export function calculateAttendanceStats(
  records: AttendanceRecord[],
  totalStudents: number,
  lateThreshold: string = '18:00'
): AttendanceStats {
  const [lateH, lateM] = lateThreshold.split(':').map(Number);
  let present = 0;
  let late = 0;
  let checkedOut = 0;

  for (const r of records) {
    const h = r.checkIn.getHours();
    const m = r.checkIn.getMinutes();
    if (h > lateH || (h === lateH && m > lateM)) {
      late++;
    } else {
      present++;
    }
    if (r.checkOut) checkedOut++;
  }

  const absent = totalStudents - present - late;
  const attendanceRate =
    totalStudents > 0
      ? Math.round(((present + late) / totalStudents) * 100)
      : 0;

  return { present, late, absent, checkedOut, total: totalStudents, attendanceRate };
}

/**
 * 학생별 출석률 조회 (최근 N일)
 * @param academyId 학원 ID
 * @param studentIds 학생 ID 배열
 * @param days 조회 기간 (일)
 */
export async function getStudentAttendanceRates(
  academyId: string,
  studentIds: string[],
  days: number = 30
): Promise<StudentAttendanceRate[]> {
  const endDate = getTodayString();
  const startDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  })();

  /** 기간 내 모든 출결 기록 조회 */
  const { data, error } = await supabase
    .from('attendance')
    .select('*, students!inner(academy_id)')
    .eq('students.academy_id', academyId)
    .gte('date', startDate)
    .lte('date', endDate);
  if (error)
    throw new Error('출석률 데이터를 불러오지 못했습니다: ' + error.message);

  const records = (data ?? []).map(toAttendance);

  /** 고유 수업 날짜 수 (해당 학원에 출결 기록이 있는 날) */
  const uniqueDates = new Set(records.map((r) => r.date));
  const totalDays = uniqueDates.size || 1;

  /** 학생별 집계 */
  const studentMap = new Map<string, { present: number; late: number }>();
  for (const id of studentIds) {
    studentMap.set(id, { present: 0, late: 0 });
  }

  for (const r of records) {
    const entry = studentMap.get(r.studentId);
    if (!entry) continue;
    const h = r.checkIn.getHours();
    if (h >= 18) {
      entry.late++;
    } else {
      entry.present++;
    }
  }

  return studentIds.map((id) => {
    const entry = studentMap.get(id) ?? { present: 0, late: 0 };
    const presentDays = entry.present;
    const lateDays = entry.late;
    const absentDays = Math.max(0, totalDays - presentDays - lateDays);
    const rate = Math.round(((presentDays + lateDays) / totalDays) * 100);
    return { studentId: id, totalDays, presentDays, lateDays, absentDays, rate };
  });
}

/**
 * 출결 알림 생성 (학부모 notifications 테이블에 기록)
 * @param studentId 학생 ID
 * @param parentId 학부모 식별자 (전화번호)
 * @param type 체크인 또는 체크아웃
 * @param studentName 학생 이름
 * @param time 시각
 */
async function sendAttendanceNotification(
  studentId: string,
  parentId: string,
  type: 'checkIn' | 'checkOut',
  studentName: string,
  time: Date
): Promise<void> {
  const timeStr = formatTimeShort(time);
  const message =
    type === 'checkIn'
      ? `${studentName} 학생이 ${timeStr}에 입실했습니다.`
      : `${studentName} 학생이 ${timeStr}에 퇴실했습니다.`;

  await createNotification({
    studentId,
    parentId,
    type: 'attendance',
    message,
  });
}
