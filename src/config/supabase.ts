import { createClient } from '@supabase/supabase-js';

/** Supabase URL */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

/** Supabase 익명 키 */
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** Supabase 클라이언트 인스턴스 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
