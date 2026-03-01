import { supabase } from '../config/supabase';
import type { Academy, Payment, PaymentStatus } from '../types';

/** DB row를 Academy 타입으로 변환 (관리자용 - 연락처, 주소 포함) */
function toAcademy(row: Record<string, unknown>): Academy {
  return {
    id: row.id as string,
    name: row.name as string,
    ownerId: row.owner_id as string,
    ownerPhone: (row.owner_phone as string) ?? '',
    address: (row.address as string) ?? '',
    createdAt: new Date(row.created_at as string),
  };
}

/** DB row를 Payment 타입으로 변환 */
function toPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    academyId: row.academy_id as string,
    amount: row.amount as number,
    status: row.status as PaymentStatus,
    method: (row.method as string) ?? '',
    memo: (row.memo as string) ?? '',
    paidAt: row.paid_at ? new Date(row.paid_at as string) : null,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    createdAt: new Date(row.created_at as string),
  };
}

/** 전체 학원 목록 조회 (관리자용) */
export async function getAllAcademies(): Promise<Academy[]> {
  const { data, error } = await supabase
    .from('academies')
    .select('*')
    .order('created_at', { ascending: false });
  if (error)
    throw new Error('학원 목록을 불러오지 못했습니다: ' + error.message);
  return (data ?? []).map(toAcademy);
}

/** 학원별 학생 수 조회 */
export async function getStudentCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('students')
    .select('academy_id');
  if (error) return {};
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const aid = row.academy_id as string;
    counts[aid] = (counts[aid] ?? 0) + 1;
  }
  return counts;
}

/** 학원 상세 조회 (관리자용) */
export async function getAcademyDetail(
  academyId: string
): Promise<Academy | null> {
  const { data, error } = await supabase
    .from('academies')
    .select('*')
    .eq('id', academyId)
    .maybeSingle();
  if (error || !data) return null;
  return toAcademy(data);
}

/** 학원 정보 수정 (관리자용) */
export async function updateAcademyAdmin(
  id: string,
  updates: { name?: string; owner_phone?: string; address?: string }
): Promise<void> {
  const { error } = await supabase
    .from('academies')
    .update(updates)
    .eq('id', id);
  if (error)
    throw new Error('학원 정보 수정에 실패했습니다: ' + error.message);
}

/** 특정 학원의 결제 내역 조회 */
export async function getPayments(academyId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('academy_id', academyId)
    .order('period_start', { ascending: false });
  if (error)
    throw new Error('결제 내역을 불러오지 못했습니다: ' + error.message);
  return (data ?? []).map(toPayment);
}

/** 전체 결제 내역 조회 (대시보드 통계용) */
export async function getAllPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map(toPayment);
}

/** 결제 내역 추가 */
export async function createPayment(
  payment: Omit<Payment, 'id' | 'createdAt'>
): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      academy_id: payment.academyId,
      amount: payment.amount,
      status: payment.status,
      method: payment.method || null,
      memo: payment.memo || null,
      paid_at: payment.paidAt?.toISOString() ?? null,
      period_start: payment.periodStart,
      period_end: payment.periodEnd,
    })
    .select()
    .single();
  if (error)
    throw new Error('결제 내역 추가에 실패했습니다: ' + error.message);
  return toPayment(data);
}

/** 결제 내역 삭제 */
export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error)
    throw new Error('결제 내역 삭제에 실패했습니다: ' + error.message);
}
