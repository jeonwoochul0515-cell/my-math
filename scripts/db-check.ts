import { supabase } from './lib/supabase-client';

async function main() {
  const { count: total, error } = await supabase
    .from('problem_embeddings')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log('에러:', error.message);
    process.exit(1);
  }
  console.log('=== problem_embeddings (참고 문제) ===');
  console.log('총 문제 수:', total);

  const grades = ['초1','초2','초3','초4','초5','초6','중1','중2','중3','공통수학1','공통수학2','대수','미적분I','확률과 통계'];
  for (const g of grades) {
    const { count: c } = await supabase
      .from('problem_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('grade', g);
    if (c && c > 0) console.log(`  ${g}: ${c}개`);
  }

  const { count: embCount } = await supabase
    .from('problem_embeddings')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);
  console.log(`\n임베딩 완료: ${embCount ?? 0}개`);
  console.log(`임베딩 미완: ${(total ?? 0) - (embCount ?? 0)}개`);

  const { count: genCount } = await supabase
    .from('generated_problems')
    .select('*', { count: 'exact', head: true });
  console.log(`\n=== generated_problems (AI 생성) ===`);
  console.log(`총: ${genCount ?? 0}개`);
}

main();
