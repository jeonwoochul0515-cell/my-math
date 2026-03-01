import { supabase } from '../config/supabase';
import type { Student } from '../types';

/** DB row를 Student 타입으로 변환 */
function toStudent(row: Record<string, unknown>): Student {
  return {
    id: row.id as string,
    name: row.name as string,
    grade: row.grade as string,
    phone: (row.phone as string) ?? '',
    parentPhone: (row.parent_phone as string) ?? '',
    pin: row.pin as string,
    classId: (row.class_id as string) ?? '',
    academyId: row.academy_id as string,
    createdAt: new Date(row.created_at as string),
  };
}

/** 학원의 전체 학생 목록 조회 */
export async function getStudents(academyId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('academy_id', academyId)
    .order('name');
  if (error)
    throw new Error('학생 목록을 불러오지 못했습니다: ' + error.message);
  return (data ?? []).map(toStudent);
}

/** 학생 1명 조회 */
export async function getStudent(id: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return toStudent(data);
}

/** PIN으로 학생 조회 (학생 로그인용, 학원 구분 없이 PIN만으로 검색) */
export async function getStudentByPin(
  pin: string
): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('pin', pin)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return toStudent(data);
}

/** 학생 등록 */
export async function createStudent(
  student: Omit<Student, 'id' | 'createdAt'>
): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .insert({
      name: student.name,
      grade: student.grade,
      phone: student.phone,
      parent_phone: student.parentPhone,
      pin: student.pin,
      class_id: student.classId || null,
      academy_id: student.academyId,
    })
    .select()
    .single();
  if (error)
    throw new Error('학생 등록에 실패했습니다: ' + error.message);
  return toStudent(data);
}

/** 학생 삭제 */
export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error)
    throw new Error('학생 삭제에 실패했습니다: ' + error.message);
}
