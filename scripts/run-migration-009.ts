/**
 * 009_curriculum_subtopics.sql 마이그레이션 실행 스크립트
 *
 * 사용법:
 *   SUPABASE_DB_PASSWORD=<비밀번호> npx tsx --env-file=.env scripts/run-migration-009.ts
 *
 * 또는 Supabase Dashboard → SQL Editor에서 직접 실행:
 *   supabase/migrations/009_curriculum_subtopics.sql
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SQL_PATH = resolve(__dirname, '../supabase/migrations/009_curriculum_subtopics.sql');
const sql = readFileSync(SQL_PATH, 'utf-8');

const supabaseUrl = process.env['VITE_SUPABASE_URL'];
if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL 환경변수가 없습니다.');
  process.exit(1);
}

// Supabase URL에서 프로젝트 ref 추출
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

// DB 비밀번호 (Supabase Dashboard → Settings → Database → Database password)
const dbPassword = process.env['SUPABASE_DB_PASSWORD'];

if (!dbPassword) {
  console.error('=== SUPABASE_DB_PASSWORD 환경변수가 필요합니다 ===\n');
  console.error('Supabase Dashboard → Project Settings → Database → Database password에서');
  console.error('비밀번호를 확인한 후 다음 명령으로 실행하세요:\n');
  console.error('  SUPABASE_DB_PASSWORD=<비밀번호> npx tsx --env-file=.env scripts/run-migration-009.ts\n');
  console.error('또는 Supabase Dashboard → SQL Editor에서 직접 SQL을 실행하세요:');
  console.error(`  파일: supabase/migrations/009_curriculum_subtopics.sql`);
  process.exit(1);
}

/** postgres 라이브러리로 직접 연결 후 마이그레이션 실행 */
async function runMigration(): Promise<void> {
  // 직접 연결 (db.{ref}.supabase.co:5432)
  const host = `db.${projectRef}.supabase.co`;
  const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword as string)}@${host}:5432/postgres`;

  console.log('=== 마이그레이션 009_curriculum_subtopics.sql ===\n');
  console.log(`프로젝트: ${projectRef}`);
  console.log(`호스트: ${host}\n`);

  const db = postgres(connectionString, {
    ssl: 'require',
    connect_timeout: 15,
    connection: {
      application_name: 'mymath-migration-009',
    },
  });

  try {
    // 연결 테스트
    const testResult = await db`SELECT current_database() as db, current_user as usr`;
    console.log(`DB 연결 성공: ${testResult[0].db} (${testResult[0].usr})\n`);

    // 마이그레이션 실행
    console.log('마이그레이션 SQL 실행 중...\n');
    await db.unsafe(sql);
    console.log('마이그레이션 실행 완료!\n');

    // 검증: generated_problems에 sub_topic 컬럼 추가 확인
    const gpColumns = await db`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'generated_problems'
        AND column_name = 'sub_topic'
    `;
    console.log('generated_problems 추가 컬럼:');
    for (const c of gpColumns) {
      console.log(`  - ${c.column_name} (${c.data_type})`);
    }

    // 검증: problem_embeddings에 sub_topic 컬럼 추가 확인
    const peColumns = await db`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'problem_embeddings'
        AND column_name = 'sub_topic'
    `;
    console.log('\nproblem_embeddings 추가 컬럼:');
    for (const c of peColumns) {
      console.log(`  - ${c.column_name} (${c.data_type})`);
    }

    // 검증: academies에 textbook_publisher 컬럼 추가 확인
    const acadColumns = await db`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'academies'
        AND column_name = 'textbook_publisher'
    `;
    console.log('\nacademies 추가 컬럼:');
    for (const c of acadColumns) {
      console.log(`  - ${c.column_name} (${c.data_type})`);
    }

    // 검증: 인덱스 생성 확인
    const indexes = await db`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN ('idx_generated_problems_sub_topic', 'idx_problem_embeddings_sub_topic')
      ORDER BY indexname
    `;
    console.log('\n성능 인덱스:');
    for (const idx of indexes) {
      console.log(`  - ${idx.indexname}`);
    }

    console.log('\n마이그레이션 성공!');
  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n마이그레이션 실패:', err.message);

    if ('detail' in err) {
      console.error('상세:', (err as Record<string, unknown>).detail);
    }
    if ('hint' in err) {
      console.error('힌트:', (err as Record<string, unknown>).hint);
    }

    process.exit(1);
  } finally {
    await db.end();
    console.log('\nDB 연결 종료');
  }
}

runMigration().catch(console.error);
