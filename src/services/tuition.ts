import { supabase } from '../config/supabase';
import type { TuitionPayment } from '../types';

/** DB row → TuitionPayment 변환 */
function toPayment(row: Record<string, unknown>): TuitionPayment {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    academyId: row.academy_id as string,
    yearMonth: row.year_month as string,
    amount: row.amount as number,
    method: row.method as '현금' | '카드' | '이체',
    paidAt: new Date(row.paid_at as string),
  };
}

/** 해당 월 수납 기록 조회 */
export async function getTuitionPayments(
  academyId: string,
  yearMonth: string
): Promise<TuitionPayment[]> {
  const { data, error } = await supabase
    .from('tuition_payments')
    .select('*')
    .eq('academy_id', academyId)
    .eq('year_month', yearMonth);
  if (error) throw new Error('수납 기록 조회 실패: ' + error.message);
  return (data ?? []).map(toPayment);
}

/** 수납 처리 (해당 월 결제 등록) */
export async function recordPayment(
  studentId: string,
  academyId: string,
  yearMonth: string,
  amount: number,
  method: '현금' | '카드' | '이체'
): Promise<TuitionPayment> {
  const { data, error } = await supabase
    .from('tuition_payments')
    .upsert(
      {
        student_id: studentId,
        academy_id: academyId,
        year_month: yearMonth,
        amount,
        method,
        paid_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,year_month' }
    )
    .select()
    .single();
  if (error) throw new Error('수납 등록 실패: ' + error.message);
  return toPayment(data);
}

/** 수납 취소 (해당 월 결제 삭제) */
export async function cancelPayment(paymentId: string): Promise<void> {
  const { error } = await supabase
    .from('tuition_payments')
    .delete()
    .eq('id', paymentId);
  if (error) throw new Error('수납 취소 실패: ' + error.message);
}
