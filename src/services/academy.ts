import { supabase } from '../config/supabase';
import type { Academy } from '../types';

/** 현재 사용자의 학원 정보 조회 */
export async function getAcademy(ownerId: string): Promise<Academy | null> {
  const { data, error } = await supabase
    .from('academies')
    .select('*')
    .eq('owner_id', ownerId)
    .single();
  if (error) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    ownerId: data.owner_id as string,
    createdAt: new Date(data.created_at as string),
  };
}

/** 학원 생성 */
export async function createAcademy(
  name: string,
  ownerId: string
): Promise<Academy | null> {
  const { data, error } = await supabase
    .from('academies')
    .insert({ name, owner_id: ownerId })
    .select()
    .single();
  if (error) throw new Error('학원 생성에 실패했습니다: ' + error.message);
  return {
    id: data.id as string,
    name: data.name as string,
    ownerId: data.owner_id as string,
    createdAt: new Date(data.created_at as string),
  };
}

/** 학원 정보 수정 */
export async function updateAcademy(
  id: string,
  updates: { name?: string }
): Promise<void> {
  const { error } = await supabase
    .from('academies')
    .update(updates)
    .eq('id', id);
  if (error)
    throw new Error('학원 정보 수정에 실패했습니다: ' + error.message);
}
