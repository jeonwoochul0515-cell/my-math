import { supabase } from '../config/supabase';
import type { Notification } from '../types';

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
