import { supabase } from '../config/supabase';

/** 학원 로고를 Supabase Storage에 업로드하고 공개 URL 반환 */
export async function uploadLogo(ownerId: string, file: File): Promise<string> {
  /** 파일 확장자 추출 */
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `${ownerId}/logo.${ext}`;

  /** 기존 파일 덮어쓰기 (upsert) */
  const { error } = await supabase.storage
    .from('academy-logos')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error('로고 업로드에 실패했습니다: ' + error.message);

  /** 공개 URL 생성 */
  const { data } = supabase.storage
    .from('academy-logos')
    .getPublicUrl(path);

  return data.publicUrl;
}

/** 학원 로고 삭제 */
export async function deleteLogo(ownerId: string): Promise<void> {
  /** 해당 폴더의 모든 파일 나열 후 삭제 */
  const { data: files } = await supabase.storage
    .from('academy-logos')
    .list(ownerId);

  if (files && files.length > 0) {
    const paths = files.map(f => `${ownerId}/${f.name}`);
    const { error } = await supabase.storage
      .from('academy-logos')
      .remove(paths);

    if (error) throw new Error('로고 삭제에 실패했습니다: ' + error.message);
  }
}
