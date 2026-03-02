/**
 * problem_embeddings 테이블에서 embedding이 없는 레코드에 Voyage AI 벡터 임베딩 생성
 *
 * 사용법:
 *   npm run generate:embeddings
 *   npm run generate:embeddings -- --batch-size 30 --limit 1000
 *   npm run generate:embeddings -- --delay 2000
 */

import { supabase } from './lib/supabase-client.js';
import { batchEmbed, delay } from './lib/voyage-embed.js';

// ---------------------------------------------------------------------------
// CLI 인자 파싱
// ---------------------------------------------------------------------------

interface CliArgs {
  batchSize: number;
  limit: number;
  delayMs: number;
}

/** CLI 인자 파싱 */
function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);

  const batchIdx = args.indexOf('--batch-size');
  const batchSize = batchIdx !== -1 ? Number(args[batchIdx + 1]) : 50;

  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) : 0; // 0 = 전체

  const delayIdx = args.indexOf('--delay');
  const delayMs = delayIdx !== -1 ? Number(args[delayIdx + 1]) : 1000;

  if (isNaN(batchSize) || batchSize < 1 || batchSize > 100) {
    console.error('--batch-size는 1~100 사이여야 합니다.');
    process.exit(1);
  }

  return { batchSize, limit, delayMs };
}

// ---------------------------------------------------------------------------
// DB 조회
// ---------------------------------------------------------------------------

/** 임베딩이 없는 레코드 타입 */
interface UnembeddedRow {
  id: number;
  content: string;
  answer: string;
  topic: string;
}

/** embedding IS NULL인 레코드 수 조회 */
async function countUnembedded(): Promise<number> {
  const { count, error } = await supabase
    .from('problem_embeddings')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null);

  if (error) throw new Error(`카운트 조회 실패: ${error.message}`);
  return count ?? 0;
}

/** embedding IS NULL인 레코드 조회 (페이지) */
async function fetchUnembedded(pageSize: number): Promise<UnembeddedRow[]> {
  const { data, error } = await supabase
    .from('problem_embeddings')
    .select('id, content, answer, topic')
    .is('embedding', null)
    .order('id', { ascending: true })
    .limit(pageSize);

  if (error) throw new Error(`레코드 조회 실패: ${error.message}`);
  if (!data) return [];

  return data.map((row) => ({
    id: row.id as number,
    content: row.content as string,
    answer: (row.answer as string) ?? '',
    topic: (row.topic as string) ?? '',
  }));
}

// ---------------------------------------------------------------------------
// 임베딩 텍스트 조합
// ---------------------------------------------------------------------------

/**
 * 문제 레코드를 임베딩용 텍스트로 조합
 * 단원, 문제, 정답을 포함하여 벡터 검색 시 컨텍스트가 반영되도록 함
 */
function buildEmbeddingText(row: UnembeddedRow): string {
  return `[단원] ${row.topic}\n[문제] ${row.content}\n[정답] ${row.answer}`;
}

// ---------------------------------------------------------------------------
// 배치 처리
// ---------------------------------------------------------------------------

interface BatchResult {
  updated: number;
  failed: number;
}

/** 단일 배치 처리: 임베딩 생성 + DB 업데이트 */
async function processBatch(
  rows: UnembeddedRow[],
  apiKey: string
): Promise<BatchResult> {
  let updated = 0;
  let failed = 0;

  /** 텍스트 배열 생성 */
  const texts = rows.map(buildEmbeddingText);

  /** Voyage AI API로 임베딩 생성 */
  const embeddings = await batchEmbed(texts, apiKey);

  /** 각 레코드 업데이트 */
  for (let i = 0; i < rows.length; i++) {
    /** pgvector는 "[0.1, 0.2, ...]" 문자열 형태로 저장 */
    const vectorString = `[${embeddings[i].join(',')}]`;

    const { error } = await supabase
      .from('problem_embeddings')
      .update({ embedding: vectorString })
      .eq('id', rows[i].id);

    if (error) {
      failed++;
      console.warn(`    ✗ ID ${rows[i].id}: ${error.message}`);
    } else {
      updated++;
    }
  }

  return { updated, failed };
}

// ---------------------------------------------------------------------------
// 메인
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { batchSize, limit, delayMs } = parseArgs(process.argv);

  /** Voyage AI API 키 확인 */
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    console.error('환경변수 VOYAGE_API_KEY가 설정되지 않았습니다.');
    process.exit(1);
  }

  console.log('=== 임베딩 생성 ===');
  console.log(`배치 크기: ${batchSize}`);
  console.log(`배치 간 대기: ${delayMs}ms`);
  if (limit > 0) console.log(`최대 처리 수: ${limit}`);
  console.log('');

  /** 미처리 레코드 수 확인 */
  const totalUnembedded = await countUnembedded();
  if (totalUnembedded === 0) {
    console.log('모든 레코드에 임베딩이 생성되어 있습니다.');
    return;
  }

  const target = limit > 0 ? Math.min(limit, totalUnembedded) : totalUnembedded;
  console.log(`미처리 레코드: ${totalUnembedded}건`);
  console.log(`처리 대상: ${target}건\n`);

  let totalUpdated = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  /** 배치 루프 */
  while (totalUpdated + totalFailed < target) {
    const remaining = target - totalUpdated - totalFailed;
    const fetchSize = Math.min(batchSize, remaining);

    /** 미처리 레코드 조회 */
    const rows = await fetchUnembedded(fetchSize);
    if (rows.length === 0) break;

    /** 배치 처리 */
    const { updated, failed } = await processBatch(rows, apiKey);
    totalUpdated += updated;
    totalFailed += failed;

    /** 진행률 표시 */
    const done = totalUpdated + totalFailed;
    const pct = ((done / target) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  [${done}/${target}] ${pct}% (성공: ${totalUpdated}, 실패: ${totalFailed}, 경과: ${elapsed}초)`);

    /** 다음 배치 전 대기 (속도 제한 준수) */
    if (totalUpdated + totalFailed < target && rows.length === fetchSize) {
      await delay(delayMs);
    }
  }

  /** 최종 요약 */
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== 완료 ===');
  console.log(`처리 대상:   ${target}건`);
  console.log(`임베딩 성공: ${totalUpdated}건`);
  console.log(`임베딩 실패: ${totalFailed}건`);
  console.log(`총 소요 시간: ${totalElapsed}초`);

  if (totalFailed > 0) {
    console.log('\n💡 실패한 레코드는 다시 실행하면 자동으로 재처리됩니다.');
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ 오류: ${message}`);
  process.exit(1);
});
