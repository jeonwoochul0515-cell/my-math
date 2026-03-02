/**
 * AIHub 수학 문제 데이터를 Supabase problem_embeddings 테이블에 임포트
 *
 * 두 가지 입력 형식 지원:
 *   1) 디렉토리 경로 → 개별 AIHub JSON 파일들 (파일 1개 = 문제 1개)
 *   2) 단일 JSON 파일 → 배열 형태의 문제 데이터
 *
 * 사용법:
 *   npm run import:aihub -- ./data/aihub-label               # 디렉토리 (AIHub 형식)
 *   npm run import:aihub -- ./data/aihub-math-sample.json     # 단일 파일
 *   npm run import:aihub -- ./data/aihub-label --dry-run      # 검증만
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { supabase } from './lib/supabase-client.js';
import { mapRecord, extractRecords, type ProblemRecord } from './lib/field-mapper.js';
import { parseAihubJson } from './lib/aihub-parser.js';
import { is71718Format, parse71718Json } from './lib/aihub-71718-parser.js';

// ---------------------------------------------------------------------------
// CLI 인자 파싱
// ---------------------------------------------------------------------------

interface CliArgs {
  inputPath: string;
  dryRun: boolean;
  batchSize: number;
}

/** CLI 인자 파싱 */
function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);

  const inputPath = args.find((a) => !a.startsWith('--'));
  if (!inputPath) {
    console.error('사용법: npm run import:aihub -- <경로> [--dry-run] [--batch-size N]');
    console.error('  경로: AIHub JSON 디렉토리 또는 단일 JSON 파일');
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');

  const batchSizeIdx = args.indexOf('--batch-size');
  const batchSize = batchSizeIdx !== -1 ? Number(args[batchSizeIdx + 1]) : 500;

  if (isNaN(batchSize) || batchSize < 1) {
    console.error('--batch-size는 1 이상의 숫자여야 합니다.');
    process.exit(1);
  }

  return { inputPath: resolve(inputPath), dryRun, batchSize };
}

// ---------------------------------------------------------------------------
// AIHub 디렉토리 모드 (파일 1개 = 문제 1개)
// ---------------------------------------------------------------------------

/** AIHub 개별 JSON 파일 디렉토리를 읽어서 ProblemRecord 배열로 변환 */
async function loadAihubDirectory(dirPath: string): Promise<{ mapped: ProblemRecord[]; total: number; skipped: number }> {
  const files = await readdir(dirPath);
  const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();

  console.log(`  → JSON 파일 ${jsonFiles.length}개 발견`);

  const mapped: ProblemRecord[] = [];
  let skipped = 0;

  for (let i = 0; i < jsonFiles.length; i++) {
    const filePath = join(dirPath, jsonFiles[i]);

    try {
      const raw = await readFile(filePath, 'utf-8');
      const json: unknown = JSON.parse(raw);

      /** 71718 형식과 기존 형식 자동 감지 */
      const record = is71718Format(json)
        ? parse71718Json(json)
        : parseAihubJson(json);

      if (record) {
        mapped.push(record);
      } else {
        skipped++;
        if (skipped <= 5) {
          console.warn(`  ⚠ [${jsonFiles[i]}] 파싱 실패 - 필수 필드 누락`);
        }
      }
    } catch {
      skipped++;
      if (skipped <= 5) {
        console.warn(`  ⚠ [${jsonFiles[i]}] JSON 읽기/파싱 오류`);
      }
    }

    /** 100개마다 진행률 표시 */
    if ((i + 1) % 100 === 0 || i === jsonFiles.length - 1) {
      process.stdout.write(`\r  파싱 중... ${i + 1}/${jsonFiles.length}`);
    }
  }
  console.log(''); // 줄바꿈

  return { mapped, total: jsonFiles.length, skipped };
}

// ---------------------------------------------------------------------------
// 단일 파일 모드 (기존 배열 JSON)
// ---------------------------------------------------------------------------

/** AIHub 형식인지 자동 감지 (raw_data_info + learning_data_info 존재 여부) */
function isAihubFormat(record: Record<string, unknown>): boolean {
  return 'raw_data_info' in record && 'learning_data_info' in record;
}

/** 단일 JSON 파일을 읽어서 ProblemRecord 배열로 변환 */
async function loadSingleFile(filePath: string): Promise<{ mapped: ProblemRecord[]; total: number; skipped: number }> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch {
    throw new Error(`파일을 읽을 수 없습니다: ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`JSON 파싱에 실패했습니다: ${filePath}`);
  }

  const rawRecords = extractRecords(parsed);
  console.log(`  → ${rawRecords.length}건의 레코드 발견`);

  /** 형식 자동 감지: 71718 → AIHub 기존 → 범용 매퍼 */
  const use71718Parser = rawRecords.length > 0 && is71718Format(rawRecords[0]);
  const useAihubParser = !use71718Parser && rawRecords.length > 0 && isAihubFormat(rawRecords[0]);
  if (use71718Parser) {
    console.log('  → 71718 형식 감지 (aihub-71718-parser 사용)');
  } else if (useAihubParser) {
    console.log('  → AIHub 형식 감지 (aihub-parser 사용)');
  }

  const mapped: ProblemRecord[] = [];
  let skipped = 0;

  for (let i = 0; i < rawRecords.length; i++) {
    const result = use71718Parser
      ? parse71718Json(rawRecords[i])
      : useAihubParser
        ? parseAihubJson(rawRecords[i])
        : mapRecord(rawRecords[i]);

    if (result) {
      mapped.push(result);
    } else {
      skipped++;
      if (skipped <= 10) {
        console.warn(`  ⚠ [${i + 1}] 매핑 실패 - 필수 필드 누락`);
      }
    }
  }

  return { mapped, total: rawRecords.length, skipped };
}

// ---------------------------------------------------------------------------
// 배치 삽입
// ---------------------------------------------------------------------------

interface InsertResult {
  inserted: number;
  failed: number;
}

/** 레코드 배열을 배치로 나눠서 Supabase에 삽입 */
async function insertBatches(
  records: ProblemRecord[],
  batchSize: number
): Promise<InsertResult> {
  let inserted = 0;
  let failed = 0;
  const total = records.length;
  const startTime = Date.now();

  for (let i = 0; i < total; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const { error } = await supabase
      .from('problem_embeddings')
      .insert(batch);

    if (error) {
      console.warn(`  ⚠ 배치 삽입 실패 (${i + 1}~${i + batch.length}): ${error.message}`);
      console.warn('  → 개별 레코드로 재시도 중...');

      for (let j = 0; j < batch.length; j++) {
        const { error: singleError } = await supabase
          .from('problem_embeddings')
          .insert(batch[j]);

        if (singleError) {
          failed++;
          console.warn(`    ✗ [${i + j + 1}] ${singleError.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }

    const done = Math.min(i + batchSize, total);
    const pct = ((done / total) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  [${done}/${total}] ${pct}% 삽입 완료 (경과: ${elapsed}초)`);
  }

  return { inserted, failed };
}

// ---------------------------------------------------------------------------
// 메인
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { inputPath, dryRun, batchSize } = parseArgs(process.argv);

  console.log('=== AIHub 데이터 임포트 ===');
  console.log(`경로: ${inputPath}`);
  console.log(`배치 크기: ${batchSize}`);
  if (dryRun) console.log('모드: DRY RUN (실제 삽입 없음)');
  console.log('');

  /** 경로가 디렉토리인지 파일인지 판별 */
  const pathStat = await stat(inputPath);
  const isDirectory = pathStat.isDirectory();

  console.log(`1단계: ${isDirectory ? 'AIHub 디렉토리' : '단일 JSON 파일'} 로드 중...`);

  const { mapped, total, skipped } = isDirectory
    ? await loadAihubDirectory(inputPath)
    : await loadSingleFile(inputPath);

  if (skipped > 5) {
    console.warn(`  ... 총 ${skipped}건 파싱/매핑 실패`);
  }

  console.log(`\n2단계: 매핑 결과 확인`);
  console.log(`  매핑 성공: ${mapped.length}건, 건너뜀: ${skipped}건`);

  /** 학년별 분포 */
  const gradeDist = new Map<string, number>();
  for (const r of mapped) {
    gradeDist.set(r.grade, (gradeDist.get(r.grade) ?? 0) + 1);
  }
  console.log('  학년별 분포:');
  for (const [grade, count] of [...gradeDist.entries()].sort()) {
    console.log(`    ${grade}: ${count}건`);
  }

  /** 단원별 분포 */
  const topicDist = new Map<string, number>();
  for (const r of mapped) {
    topicDist.set(r.topic, (topicDist.get(r.topic) ?? 0) + 1);
  }
  console.log('  단원별 분포:');
  for (const [topic, count] of [...topicDist.entries()].sort()) {
    console.log(`    ${topic}: ${count}건`);
  }

  /** Dry-run이면 여기서 종료 */
  if (dryRun) {
    console.log('\n[DRY RUN] 실제 삽입 없이 종료합니다.');
    console.log(`→ ${mapped.length}건을 삽입할 수 있습니다.`);
    return;
  }

  if (mapped.length === 0) {
    console.log('\n삽입할 데이터가 없습니다.');
    return;
  }

  /** 3. DB 삽입 */
  console.log(`\n3단계: Supabase에 삽입 중 (배치 ${batchSize}건씩)...`);
  const { inserted, failed } = await insertBatches(mapped, batchSize);

  /** 4. 최종 요약 */
  console.log('\n=== 완료 ===');
  console.log(`총 파일/레코드: ${total}건`);
  console.log(`매핑 성공:      ${mapped.length}건`);
  console.log(`삽입 성공:      ${inserted}건`);
  console.log(`삽입 실패:      ${failed}건`);
  console.log(`매핑 건너뜀:    ${skipped}건`);

  if (inserted > 0) {
    console.log('\n💡 다음 단계: npm run generate:embeddings 로 임베딩을 생성하세요.');
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ 오류: ${message}`);
  process.exit(1);
});
