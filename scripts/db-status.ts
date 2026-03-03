/** DB 현황 조회 — 학년별 문제 수 + 임베딩 상태 */
import { supabase } from './lib/supabase-client.js';

const grades = ['초3','초4','초5','초6','중1','중2','중3','공통수학1','공통수학2'];

const { count: total } = await supabase.from('problem_embeddings').select('id', { count: 'exact', head: true });
const { count: embedded } = await supabase.from('problem_embeddings').select('id', { count: 'exact', head: true }).not('embedding', 'is', null);
const { count: unembedded } = await supabase.from('problem_embeddings').select('id', { count: 'exact', head: true }).is('embedding', null);

console.log(`=== problem_embeddings 현황 ===`);
console.log(`전체: ${total}건 | 임베딩 완료: ${embedded}건 | 미완료: ${unembedded}건\n`);

console.log('학년별 분포:');
for (const g of grades) {
  const { count } = await supabase.from('problem_embeddings').select('id', { count: 'exact', head: true }).eq('grade', g);
  if (count && count > 0) console.log(`  ${g}: ${count}건`);
}

const { count: genCount } = await supabase.from('generated_problems').select('id', { count: 'exact', head: true });
console.log(`\ngenerated_problems: ${genCount}건`);
