import { supabase } from '../config/supabase';
import type { Class } from '../types';

/** DB row를 Class 타입으로 변환 */
function toClass(row: Record<string, unknown>): Class {
  return {
    id: row.id as string,
    name: row.name as string,
    grade: row.grade as string,
    schedule:
      (row.schedule as {
        day: string;
        startTime: string;
        endTime: string;
      }[]) ?? [],
    capacity: row.capacity as number,
    academyId: row.academy_id as string,
    coveredTopics: (row.covered_topics as string[]) ?? [],
  };
}

/** 학원의 전체 반 목록 조회 */
export async function getClasses(academyId: string): Promise<Class[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('academy_id', academyId)
    .order('name');
  if (error)
    throw new Error('반 목록을 불러오지 못했습니다: ' + error.message);
  return (data ?? []).map(toClass);
}

/** 반 생성 */
export async function createClass(cls: Omit<Class, 'id'>): Promise<Class> {
  const { data, error } = await supabase
    .from('classes')
    .insert({
      name: cls.name,
      grade: cls.grade,
      schedule: cls.schedule,
      capacity: cls.capacity,
      academy_id: cls.academyId,
    })
    .select()
    .single();
  if (error) throw new Error('반 생성에 실패했습니다: ' + error.message);
  return toClass(data);
}

/** 반 삭제 */
export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) throw new Error('반 삭제에 실패했습니다: ' + error.message);
}

/** 반 진도(배운 단원) 업데이트 */
export async function updateCoveredTopics(
  classId: string,
  coveredTopics: string[]
): Promise<void> {
  const { error } = await supabase
    .from('classes')
    .update({ covered_topics: coveredTopics })
    .eq('id', classId);
  if (error) throw new Error('진도 업데이트에 실패했습니다: ' + error.message);
}

/** 학생의 소속 반 조회 */
export async function getClassById(classId: string): Promise<Class | null> {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single();
  if (error || !data) return null;
  return toClass(data as Record<string, unknown>);
}
