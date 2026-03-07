/**
 * 일본 수학 문제 통합 임포트 스크립트
 *
 * 2단계 필터링으로 한국 교육과정 범위 내 문제만 선별:
 *   1차: isExcluded() — 일본 카테고리 기준 제외 (벡터, 복소수평면 등)
 *   2차: Claude — 한국 성취기준 매칭 + 현지화 번역
 *
 * 사용법:
 *   npm run import:japan -- --source huggingface --input ./data/japan-raw/huggingface
 *   npm run import:japan -- --source all --input ./data/japan-raw --dry-run
 *   npm run import:japan -- --input ./data/japan-translated --skip-translation
 */

import { readFile, readdir, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { supabase } from './lib/supabase-client.js';
import type { ProblemRecord } from './lib/field-mapper.js';
import type {
  JapanRawProblem,
  TranslatedProblem,
  ImportCliArgs,
  ImportStats,
} from './lib/japan-types.js';
import {
  isExcluded,
  isMath3Calculus,
  findMapping,
  getExclusionReason,
} from './lib/japan-korea-curriculum.js';
import { translateBatch, validateCurriculumMapping } from './lib/claude-translate.js';
import { delay } from './lib/voyage-embed.js';

// ─────────────────────────────────────────────
// CLI 인자 파싱
// ─────────────────────────────────────────────

function parseArgs(argv: string[]): ImportCliArgs {
  const args = argv.slice(2);

  const sourceIdx = args.indexOf('--source');
  const source = (sourceIdx !== -1 ? args[sourceIdx + 1] : 'all') as ImportCliArgs['source'];

  const inputIdx = args.indexOf('--input');
  const inputPath = inputIdx !== -1 ? args[inputIdx + 1] : '';
  if (!inputPath) {
    console.error('사용법: npm run import:japan -- --source <type> --input <경로> [옵션]');
    console.error('  --source: huggingface | ftext | math-aquarium | all');
    console.error('  --input: 원본 JSON 디렉토리 경로');
    console.error('  --output: 번역 결과 저장 경로 (기본: ./data/japan-translated)');
    console.error('  --dry-run: 검증만 (DB 삽입 없음)');
    console.error('  --batch-size N: Claude API 호출당 문제 수 (기본: 5)');
    console.error('  --delay N: API 호출 간 대기 ms (기본: 2000)');
    console.error('  --skip-translation: 이미 번역된 JSON에서 DB 삽입만');
    process.exit(1);
  }

  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : './data/japan-translated';

  const dryRun = args.includes('--dry-run');
  const skipTranslation = args.includes('--skip-translation');

  const batchSizeIdx = args.indexOf('--batch-size');
  const batchSize = batchSizeIdx !== -1 ? Number(args[batchSizeIdx + 1]) : 5;

  const delayIdx = args.indexOf('--delay');
  const delayMs = delayIdx !== -1 ? Number(args[delayIdx + 1]) : 2000;

  return {
    source,
    inputPath: resolve(inputPath),
    outputPath: resolve(outputPath),
    dryRun,
    batchSize,
    delayMs,
    skipTranslation,
  };
}

// ─────────────────────────────────────────────
// 원본 JSON 로드
// ─────────────────────────────────────────────

/** 디렉토리 또는 파일에서 JapanRawProblem[] 로드 */
async function loadRawProblems(inputPath: string): Promise<JapanRawProblem[]> {
  const pathStat = await stat(inputPath);

  if (pathStat.isFile()) {
    const raw = await readFile(inputPath, 'utf-8');
    return JSON.parse(raw) as JapanRawProblem[];
  }

  /** 디렉토리 — 모든 JSON 파일 합치기 */
  const files = await readdir(inputPath);
  const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();

  console.log(`  → JSON 파일 ${jsonFiles.length}개 발견`);

  const all: JapanRawProblem[] = [];
  for (const file of jsonFiles) {
    const raw = await readFile(join(inputPath, file), 'utf-8');
    const problems = JSON.parse(raw) as JapanRawProblem[];
    console.log(`  [${file}] ${problems.length}건`);
    all.push(...problems);
  }

  return all;
}

/** 번역 완료된 JSON 로드 */
async function loadTranslatedProblems(inputPath: string): Promise<TranslatedProblem[]> {
  const pathStat = await stat(inputPath);

  if (pathStat.isFile()) {
    const raw = await readFile(inputPath, 'utf-8');
    return JSON.parse(raw) as TranslatedProblem[];
  }

  const files = await readdir(inputPath);
  const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();

  const all: TranslatedProblem[] = [];
  for (const file of jsonFiles) {
    const raw = await readFile(join(inputPath, file), 'utf-8');
    const problems = JSON.parse(raw) as TranslatedProblem[];
    all.push(...problems);
  }

  return all;
}

// ─────────────────────────────────────────────
// 1차 필터링 (카테고리 기준)
// ─────────────────────────────────────────────

interface FilterResult {
  passed: JapanRawProblem[];
  excluded: { problem: JapanRawProblem; reason: string }[];
}

/** 한국 교육과정 범위 밖 문제 제외 */
function filterByCategory(problems: JapanRawProblem[]): FilterResult {
  const passed: JapanRawProblem[] = [];
  const excluded: { problem: JapanRawProblem; reason: string }[] = [];

  for (const p of problems) {
    if (isExcluded(p.category, p.subcategory)) {
      excluded.push({ problem: p, reason: getExclusionReason(p.category, p.subcategory) });
    } else if (isMath3Calculus(p.category, p.subcategory)) {
      excluded.push({ problem: p, reason: '수학III 초월함수 미적분 — 미적분II(진로선택)' });
    } else {
      passed.push(p);
    }
  }

  return { passed, excluded };
}

// ─────────────────────────────────────────────
// 2차 필터링 + 번역 (Claude)
// ─────────────────────────────────────────────

/** Claude로 번역 + 교육과정 매칭 */
async function translateAndFilter(
  problems: JapanRawProblem[],
  batchSize: number,
  delayMs: number,
  outputPath: string
): Promise<{ translated: TranslatedProblem[]; claudeExcluded: number; failed: number }> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }

  await mkdir(outputPath, { recursive: true });

  const allTranslated: TranslatedProblem[] = [];
  let claudeExcluded = 0;
  let failed = 0;
  const totalBatches = Math.ceil(problems.length / batchSize);
  const startTime = Date.now();

  for (let i = 0; i < problems.length; i += batchSize) {
    const batch = problems.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    /** 정적 매핑 힌트 생성 */
    const hints = batch.map((p) => findMapping(p.category, p.subcategory));

    /** Claude 번역 */
    const result = await translateBatch(batch, hints, apiKey);

    /** fit=true인 문제만 수집 */
    for (const t of result.translated) {
      if (t.fit) {
        /** 교육과정 매핑 유효성 검증 */
        if (validateCurriculumMapping(t)) {
          allTranslated.push(t);
        } else {
          console.warn(`  ⚠ 매핑 검증 실패: ${t.originalId} (${t.grade}/${t.topic})`);
          claudeExcluded++;
        }
      } else {
        claudeExcluded++;
      }
    }
    failed += result.failed;

    /** 진행률 */
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const pct = ((batchNum / totalBatches) * 100).toFixed(1);
    console.log(`  [${batchNum}/${totalBatches}] ${pct}% — 적합 ${allTranslated.length}건, 제외 ${claudeExcluded}건, 실패 ${failed}건 (${elapsed}초)`);

    /** 10배치마다 중간 저장 */
    if (batchNum % 10 === 0 || batchNum === totalBatches) {
      const outFile = join(outputPath, `translated-batch-${batchNum}.json`);
      const recentBatch = allTranslated.slice(-batchSize * 10);
      await writeFile(outFile, JSON.stringify(recentBatch, null, 2), 'utf-8');
    }

    /** API 대기 */
    if (i + batchSize < problems.length) {
      await delay(delayMs);
    }
  }

  /** 최종 전체 저장 */
  const finalFile = join(outputPath, 'all-translated.json');
  await writeFile(finalFile, JSON.stringify(allTranslated, null, 2), 'utf-8');
  console.log(`  ✓ 전체 번역 결과 저장 → ${finalFile}`);

  return { translated: allTranslated, claudeExcluded, failed };
}

// ─────────────────────────────────────────────
// DB 삽입
// ─────────────────────────────────────────────

/** 번역된 문제를 problem_embeddings에 삽입 */
async function insertToDb(
  problems: TranslatedProblem[],
  sourceType: string,
  batchSize: number
): Promise<{ inserted: number; failed: number }> {
  let inserted = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < problems.length; i += batchSize) {
    const batch = problems.slice(i, i + batchSize);

    const records: ProblemRecord[] = batch.map((p) => ({
      content: p.content,
      answer: p.answer,
      solution: p.solution || null,
      grade: p.grade,
      topic: p.topic,
      difficulty: p.difficulty,
      source: `japan-${sourceType}`,
    }));

    const { error } = await supabase
      .from('problem_embeddings')
      .insert(records);

    if (error) {
      console.warn(`  ⚠ 배치 삽입 실패 (${i + 1}~${i + batch.length}): ${error.message}`);
      /** 개별 재시도 */
      for (let j = 0; j < records.length; j++) {
        const { error: singleError } = await supabase
          .from('problem_embeddings')
          .insert(records[j]);

        if (singleError) {
          failed++;
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }

    const done = Math.min(i + batchSize, problems.length);
    const pct = ((done / problems.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  [${done}/${problems.length}] ${pct}% 삽입 완료 (${elapsed}초)`);
  }

  return { inserted, failed };
}

// ─────────────────────────────────────────────
// 통계 출력
// ─────────────────────────────────────────────

function printStats(stats: ImportStats): void {
  console.log('\n=== 임포트 통계 ===');
  console.log(`원본:              ${stats.totalRaw}건`);
  console.log(`1차 제외 (카테고리): ${stats.excludedByCategory}건`);
  console.log(`2차 제외 (Claude):  ${stats.excludedByClaude}건`);
  console.log(`번역 성공:          ${stats.translated}건`);
  console.log(`DB 삽입:           ${stats.inserted}건`);
  console.log(`실패:              ${stats.failed}건`);

  console.log('\n  학년별 분포:');
  for (const [grade, count] of [...stats.gradeDist.entries()].sort()) {
    console.log(`    ${grade}: ${count}건`);
  }

  console.log('\n  단원별 분포:');
  for (const [topic, count] of [...stats.topicDist.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${topic}: ${count}건`);
  }
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  console.log('=== 일본 수학 문제 임포트 ===');
  console.log(`소스: ${args.source}`);
  console.log(`입력: ${args.inputPath}`);
  console.log(`출력: ${args.outputPath}`);
  console.log(`배치 크기: ${args.batchSize}`);
  if (args.dryRun) console.log('모드: DRY RUN (실제 삽입 없음)');
  if (args.skipTranslation) console.log('모드: 번역 건너뜀 (DB 삽입만)');
  console.log('');

  const stats: ImportStats = {
    totalRaw: 0,
    excludedByCategory: 0,
    excludedByClaude: 0,
    translated: 0,
    inserted: 0,
    failed: 0,
    gradeDist: new Map(),
    topicDist: new Map(),
  };

  if (args.skipTranslation) {
    /** 이미 번역된 파일에서 DB 삽입만 */
    console.log('1단계: 번역된 JSON 로드 중...');
    const translated = await loadTranslatedProblems(args.inputPath);
    const fit = translated.filter((p) => p.fit);
    stats.translated = fit.length;

    for (const p of fit) {
      stats.gradeDist.set(p.grade, (stats.gradeDist.get(p.grade) ?? 0) + 1);
      stats.topicDist.set(p.topic, (stats.topicDist.get(p.topic) ?? 0) + 1);
    }

    if (!args.dryRun && fit.length > 0) {
      console.log('\n2단계: DB 삽입 중...');
      const { inserted, failed } = await insertToDb(fit, args.source, 500);
      stats.inserted = inserted;
      stats.failed = failed;
    }

    printStats(stats);
    return;
  }

  /** 1. 원본 로드 */
  console.log('1단계: 원본 JSON 로드 중...');
  const rawProblems = await loadRawProblems(args.inputPath);
  stats.totalRaw = rawProblems.length;
  console.log(`  → ${rawProblems.length}건 로드됨`);

  /** 2. 1차 필터링 */
  console.log('\n2단계: 1차 필터링 (교육과정 범위 검사)...');
  const { passed, excluded } = filterByCategory(rawProblems);
  stats.excludedByCategory = excluded.length;

  /** 제외 사유별 통계 */
  const reasonDist = new Map<string, number>();
  for (const e of excluded) {
    reasonDist.set(e.reason, (reasonDist.get(e.reason) ?? 0) + 1);
  }
  console.log(`  → 통과: ${passed.length}건, 제외: ${excluded.length}건`);
  for (const [reason, count] of [...reasonDist.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ✗ ${reason}: ${count}건`);
  }

  if (args.dryRun) {
    /** Dry-run: 정적 매핑 기반 예상 분포 */
    console.log('\n3단계: [DRY RUN] 정적 매핑 기반 예상 분포...');
    for (const p of passed) {
      const mapping = findMapping(p.category, p.subcategory);
      if (mapping) {
        stats.gradeDist.set(mapping.koreanGrade, (stats.gradeDist.get(mapping.koreanGrade) ?? 0) + 1);
        stats.topicDist.set(mapping.koreanTopic, (stats.topicDist.get(mapping.koreanTopic) ?? 0) + 1);
      }
    }
    stats.translated = passed.length;
    printStats(stats);
    console.log('\n[DRY RUN] 실제 번역/삽입 없이 종료합니다.');
    console.log(`→ 예상 ${passed.length}건 번역 가능 (Claude 2차 필터링 후 약 10% 추가 제외 예상)`);
    return;
  }

  /** 3. Claude 번역 + 2차 필터링 */
  console.log(`\n3단계: Claude 현지화 번역 (${passed.length}건, 배치 ${args.batchSize}개씩)...`);
  const { translated, claudeExcluded, failed } = await translateAndFilter(
    passed,
    args.batchSize,
    args.delayMs,
    args.outputPath
  );
  stats.excludedByClaude = claudeExcluded;
  stats.translated = translated.length;
  stats.failed = failed;

  /** 분포 계산 */
  for (const p of translated) {
    stats.gradeDist.set(p.grade, (stats.gradeDist.get(p.grade) ?? 0) + 1);
    stats.topicDist.set(p.topic, (stats.topicDist.get(p.topic) ?? 0) + 1);
  }

  /** 4. DB 삽입 */
  if (translated.length > 0) {
    console.log(`\n4단계: DB 삽입 (${translated.length}건)...`);
    const { inserted, failed: insertFailed } = await insertToDb(translated, args.source, 500);
    stats.inserted = inserted;
    stats.failed += insertFailed;
  }

  /** 5. 최종 통계 */
  printStats(stats);

  if (stats.inserted > 0) {
    console.log('\n💡 다음 단계: npm run generate:embeddings 로 임베딩을 생성하세요.');
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ 오류: ${message}`);
  process.exit(1);
});
