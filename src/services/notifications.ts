import { supabase } from '../config/supabase';
import type { Notification, WeaknessReport } from '../types';

/** DB row를 Notification 타입으로 변환 */
function toNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    parentId: (row.parent_id as string) ?? '',
    type: row.type as 'attendance' | 'grade' | 'weakness',
    message: row.message as string,
    isRead: row.is_read as boolean,
    createdAt: new Date(row.created_at as string),
  };
}

/** 알림 목록 조회 (학부모용: studentId 기준) */
export async function getNotifications(
  studentId: string
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error)
    throw new Error('알림을 불러오지 못했습니다: ' + error.message);
  return (data ?? []).map(toNotification);
}

/** 읽지 않은 알림 개수 조회 */
export async function getUnreadCount(studentId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('is_read', false);
  if (error)
    throw new Error('읽지 않은 알림 수를 불러오지 못했습니다: ' + error.message);
  return count ?? 0;
}

/** 알림 읽음 처리 */
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error)
    throw new Error('알림 읽음 처리에 실패했습니다: ' + error.message);
}

/** 모든 알림 읽음 처리 */
export async function markAllAsRead(studentId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('student_id', studentId)
    .eq('is_read', false);
  if (error)
    throw new Error('알림 읽음 처리에 실패했습니다: ' + error.message);
}

/** 알림 생성 */
export async function createNotification(
  notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    student_id: notification.studentId,
    parent_id: notification.parentId,
    type: notification.type,
    message: notification.message,
  });
  if (error)
    throw new Error('알림 생성에 실패했습니다: ' + error.message);
}

// ---------------------------------------------------------------------------
// 알림 트리거 함수들 — 출결/성적/약점 이벤트에서 호출
// ---------------------------------------------------------------------------

/**
 * 출결 알림 생성 — 학생 체크인 시 학부모에게 알림
 * @param studentId - 학생 UUID
 * @param studentName - 학생 이름 (알림 메시지용)
 * @param parentId - 학부모 Firebase UID (없으면 빈 문자열)
 */
export async function notifyAttendanceCheckIn(
  studentId: string,
  studentName: string,
  parentId: string
): Promise<void> {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  try {
    await createNotification({
      studentId,
      parentId,
      type: 'attendance',
      message: `${studentName} 학생이 ${timeStr}에 출석했습니다.`,
    });
  } catch (err) {
    console.warn('출석 알림 생성 실패:', err instanceof Error ? err.message : err);
  }
}

/**
 * 퇴실 알림 생성 — 학생 체크아웃 시 학부모에게 알림
 * @param studentId - 학생 UUID
 * @param studentName - 학생 이름 (알림 메시지용)
 * @param parentId - 학부모 Firebase UID (없으면 빈 문자열)
 */
export async function notifyAttendanceCheckOut(
  studentId: string,
  studentName: string,
  parentId: string
): Promise<void> {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  try {
    await createNotification({
      studentId,
      parentId,
      type: 'attendance',
      message: `${studentName} 학생이 ${timeStr}에 퇴실했습니다.`,
    });
  } catch (err) {
    console.warn('퇴실 알림 생성 실패:', err instanceof Error ? err.message : err);
  }
}

/**
 * 성적 알림 생성 — 문제 풀이 완료 시 학부모에게 결과 알림
 * @param studentId - 학생 UUID
 * @param studentName - 학생 이름
 * @param parentId - 학부모 Firebase UID
 * @param totalCount - 총 문제 수
 * @param correctCount - 정답 수
 */
export async function notifyGradeResult(
  studentId: string,
  studentName: string,
  parentId: string,
  totalCount: number,
  correctCount: number
): Promise<void> {
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  try {
    await createNotification({
      studentId,
      parentId,
      type: 'grade',
      message: `${studentName} 학생이 문제 ${totalCount}개를 풀어 정답률 ${accuracy}%를 기록했습니다. (${correctCount}/${totalCount})`,
    });
  } catch (err) {
    console.warn('성적 알림 생성 실패:', err instanceof Error ? err.message : err);
  }
}

/**
 * 약점 알림 생성 — AI 분석 결과 약점 단원 발견 시 학부모에게 알림
 * @param studentId - 학생 UUID
 * @param studentName - 학생 이름
 * @param parentId - 학부모 Firebase UID
 * @param weakReports - 정확도 60% 미만인 약점 리포트 배열
 */
export async function notifyWeaknessDetected(
  studentId: string,
  studentName: string,
  parentId: string,
  weakReports: WeaknessReport[]
): Promise<void> {
  if (weakReports.length === 0) return;

  /** 약점 단원 목록 (최대 3개까지 표시) */
  const topicNames = weakReports
    .slice(0, 3)
    .map((r) => `${r.topic}(${r.accuracy}%)`)
    .join(', ');

  const suffix = weakReports.length > 3
    ? ` 외 ${weakReports.length - 3}개 단원`
    : '';

  try {
    await createNotification({
      studentId,
      parentId,
      type: 'weakness',
      message: `${studentName} 학생의 약점 단원이 발견되었습니다: ${topicNames}${suffix}. 추가 학습이 필요합니다.`,
    });
  } catch (err) {
    console.warn('약점 알림 생성 실패:', err instanceof Error ? err.message : err);
  }
}
