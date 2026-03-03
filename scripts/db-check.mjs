import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log('DB 접속 정보 없음 (.env 확인 필요)');
  process.exit(0);
}

const sb = createClient(url, key);

const { count: total, error } = await sb.from('problem_embeddings').select('*', { count: 'exact', head: true });
if (error) {
  console.log('에러:', error.message);
  process.exit(1);
}
console.log('=== problem_embeddings (참고 문제) ===');
console.log('총 문제 수:', total);

const grades = ['중1','중2','중3','공통수학1','공통수학2','대수','미적분I','확률과 통계'];
for (const g of grades) {
  const { count: c } = await sb.from('problem_embeddings').select('*', { count: 'exact', head: true }).eq('grade', g);
  if (c > 0) console.log(`  ${g}: ${c}개`);
}

const { count: embCount } = await sb.from('problem_embeddings').select('*', { count: 'exact', head: true }).not('embedding', 'is', null);
console.log(`\n임베딩 완료: ${embCount}개`);
console.log(`임베딩 미완: ${total - embCount}개`);

const { count: genCount } = await sb.from('generated_problems').select('*', { count: 'exact', head: true });
console.log(`\n=== generated_problems (AI 생성) ===`);
console.log(`총: ${genCount}개`);
