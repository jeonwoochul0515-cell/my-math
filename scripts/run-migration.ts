/** Supabase REST API를 통해 마이그레이션 SQL 문을 개별 실행 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env['VITE_SUPABASE_URL'];
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceKey) {
  console.error('VITE_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  db: { schema: 'public' },
});

async function main(): Promise<void> {
  console.log('=== 마이그레이션 008 실행 ===\n');

  /** 테이블 생성 — 개별 Supabase 쿼리로 테이블 존재 확인 후 생성 */
  const tables = [
    'problem_assignments',
    'ocr_results',
    'wrong_answer_notes',
    'ai_reports',
  ];

  /** 먼저 테이블 존재 여부 확인 */
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (!error) {
      console.log(`✓ ${table} 테이블 이미 존재`);
    } else if (error.message.includes('does not exist') || error.code === '42P01') {
      console.log(`✗ ${table} 테이블 없음 → Supabase Dashboard에서 SQL 실행 필요`);
    } else {
      console.log(`? ${table}: ${error.message}`);
    }
  }

  /** solve_logs 컬럼 확인 */
  const { data: testLog } = await supabase
    .from('solve_logs')
    .select('assignment_id')
    .limit(1);

  if (testLog !== null) {
    console.log('✓ solve_logs.assignment_id 컬럼 존재');
  } else {
    console.log('✗ solve_logs.assignment_id 컬럼 없음 → SQL 실행 필요');
  }

  console.log('\n마이그레이션 SQL 파일: supabase/migrations/008_features_v2.sql');
  console.log('Supabase Dashboard → SQL Editor에 붙여넣기하여 실행하세요:');
  console.log(`https://supabase.com/dashboard/project/${supabaseUrl!.replace('https://', '').replace('.supabase.co', '')}/sql/new`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
