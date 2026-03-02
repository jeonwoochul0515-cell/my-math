/**
 * 스크립트용 Supabase 클라이언트
 * 브라우저 코드(import.meta.env)와 분리된 Node.js 전용 클라이언트
 *
 * SUPABASE_SERVICE_ROLE_KEY가 있으면 RLS를 우회하는 service_role 클라이언트 사용
 * 없으면 anon 키로 폴백 (RLS 적용됨)
 */
import { createClient } from '@supabase/supabase-js';

/** 필수 환경변수 읽기 (없으면 에러) */
function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`환경변수 ${key}가 설정되지 않았습니다. .env 파일을 확인하세요.`);
  }
  return value;
}

const supabaseUrl = getEnvOrThrow('VITE_SUPABASE_URL');

/** service_role 키가 있으면 RLS 우회, 없으면 anon 키 사용 */
const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
const anonKey = getEnvOrThrow('VITE_SUPABASE_ANON_KEY');

if (serviceRoleKey) {
  console.log('✓ service_role 키 사용 (RLS 우회)');
} else {
  console.warn('⚠ service_role 키 없음 → anon 키 사용 (RLS 적용됨)');
  console.warn('  INSERT/UPDATE 실패 시 SUPABASE_SERVICE_ROLE_KEY를 .env에 추가하세요.');
  console.warn('  Supabase Dashboard → Settings → API → service_role 키 복사');
}

/** Supabase 클라이언트 (service_role 우선, anon 폴백) */
export const supabase = createClient(supabaseUrl, serviceRoleKey ?? anonKey);
