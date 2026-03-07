/**
 * 일본 수학 문제 6분할 병렬 임포트
 *
 * 전체 JSON을 6개 청크로 나눠 6개 프로세스로 동시 번역+삽입
 *
 * 사용법:
 *   npx tsx --env-file=.env scripts/split-and-import.ts --input ./data/japan-raw/huggingface-full --output ./data/japan-translated/full --workers 6
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import type { JapanRawProblem } from './lib/japan-types.js';

// ─────────────────────────────────────────────
// CLI 인자
// ─────────────────────────────────────────────

interface CliArgs {
  inputPath: string;
  outputPath: string;
  workers: number;
  batchSize: number;
  delayMs: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const get = (flag: string, def: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : def;
  };

  return {
    inputPath: resolve(get('--input', './data/japan-raw/huggingface-full')),
    outputPath: resolve(get('--output', './data/japan-translated/full')),
    workers: Number(get('--workers', '6')),
    batchSize: Number(get('--batch-size', '5')),
    delayMs: Number(get('--delay', '500')),
    dryRun: args.includes('--dry-run'),
  };
}

// ─────────────────────────────────────────────
// JSON 로드 + 분할
// ─────────────────────────────────────────────

async function loadAllProblems(inputPath: string): Promise<JapanRawProblem[]> {
  const files = (await readdir(inputPath)).filter((f) => f.endsWith('.json'));
  const all: JapanRawProblem[] = [];

  for (const file of files) {
    const data = JSON.parse(await readFile(join(inputPath, file), 'utf-8')) as JapanRawProblem[];
    all.push(...data);
    console.log(`  [${file}] ${data.length}건`);
  }

  return all;
}

function splitArray<T>(arr: T[], chunks: number): T[][] {
  const result: T[][] = [];
  const chunkSize = Math.ceil(arr.length / chunks);
  for (let i = 0; i < chunks; i++) {
    result.push(arr.slice(i * chunkSize, (i + 1) * chunkSize));
  }
  return result.filter((c) => c.length > 0);
}

// ─────────────────────────────────────────────
// 워커 프로세스 실행
// ─────────────────────────────────────────────

function runWorker(
  workerIdx: number,
  inputFile: string,
  outputDir: string,
  batchSize: number,
  delayMs: number,
  dryRun: boolean
): Promise<{ workerIdx: number; exitCode: number }> {
  return new Promise((resolvePromise) => {
    const args = [
      '--env-file=.env',
      'scripts/import-japan-problems.ts',
      '--source', 'huggingface',
      '--input', inputFile,
      '--output', outputDir,
      '--batch-size', String(batchSize),
      '--delay', String(delayMs),
    ];
    if (dryRun) args.push('--dry-run');

    const child = spawn('npx', ['tsx', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd(),
    });

    const prefix = `[W${workerIdx + 1}]`;
    let lastPercent = '';

    child.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter((l) => l.trim());
      for (const line of lines) {
        /** 진행률 라인만 간략 출력 */
        const pctMatch = line.match(/(\d+\.\d+%)/);
        if (pctMatch && pctMatch[1] !== lastPercent) {
          lastPercent = pctMatch[1];
          const statsMatch = line.match(/적합 (\d+)건.*제외 (\d+)건.*실패 (\d+)건/);
          if (statsMatch) {
            console.log(`${prefix} ${lastPercent} — 적합 ${statsMatch[1]}, 제외 ${statsMatch[2]}, 실패 ${statsMatch[3]}`);
          } else {
            console.log(`${prefix} ${lastPercent}`);
          }
        } else if (line.includes('통계') || line.includes('완료') || line.includes('삽입') || line.includes('로드')) {
          console.log(`${prefix} ${line.trim()}`);
        }
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString().trim();
      if (text) console.error(`${prefix} ⚠ ${text}`);
    });

    child.on('close', (code) => {
      console.log(`${prefix} 완료 (exit: ${code})`);
      resolvePromise({ workerIdx, exitCode: code ?? 1 });
    });
  });
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  console.log('=== 6분할 병렬 임포트 ===');
  console.log(`입력: ${opts.inputPath}`);
  console.log(`출력: ${opts.outputPath}`);
  console.log(`워커 수: ${opts.workers}`);
  console.log(`배치 크기: ${opts.batchSize}`);
  console.log(`딜레이: ${opts.delayMs}ms`);
  if (opts.dryRun) console.log('모드: DRY RUN');
  console.log('');

  /** 1. 전체 로드 */
  console.log('1단계: 전체 문제 로드...');
  const all = await loadAllProblems(opts.inputPath);
  console.log(`  → 총 ${all.length}건 로드\n`);

  /** 2. N분할 */
  const chunks = splitArray(all, opts.workers);
  console.log(`2단계: ${chunks.length}개 청크로 분할`);
  for (let i = 0; i < chunks.length; i++) {
    console.log(`  [W${i + 1}] ${chunks[i].length}건`);
  }
  console.log('');

  /** 3. 청크별 JSON 저장 */
  const chunkDir = join(opts.outputPath, '_chunks');
  await mkdir(chunkDir, { recursive: true });

  const chunkFiles: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    /** import-japan-problems.ts는 디렉토리를 읽으므로 각 청크를 별도 디렉토리에 저장 */
    const workerDir = join(chunkDir, `worker-${i + 1}`);
    await mkdir(workerDir, { recursive: true });
    const file = join(workerDir, `chunk-${i + 1}.json`);
    await writeFile(file, JSON.stringify(chunks[i]), 'utf-8');
    chunkFiles.push(workerDir);
  }
  console.log(`  → 청크 파일 저장 완료\n`);

  /** 4. 시차를 두고 병렬 실행 (워커 간 5초 간격으로 시작) */
  const staggerMs = 5000;
  console.log(`3단계: ${chunks.length}개 워커 병렬 실행 (${staggerMs / 1000}초 간격 시작)...\n`);
  const startTime = Date.now();

  const workerPromises: Promise<{ workerIdx: number; exitCode: number }>[] = [];
  for (let i = 0; i < chunkFiles.length; i++) {
    if (i > 0) {
      console.log(`  → W${i + 1} 시작까지 ${staggerMs / 1000}초 대기...`);
      await new Promise((r) => setTimeout(r, staggerMs));
    }
    const workerOutput = join(opts.outputPath, `worker-${i + 1}`);
    workerPromises.push(
      runWorker(i, chunkFiles[i], workerOutput, opts.batchSize, opts.delayMs, opts.dryRun)
    );
  }

  const results = await Promise.all(workerPromises);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

  /** 5. 결과 요약 */
  console.log('\n=== 전체 결과 ===');
  console.log(`총 소요 시간: ${elapsed}초`);
  console.log(`전체 문제: ${all.length}건`);

  const failed = results.filter((r) => r.exitCode !== 0);
  if (failed.length > 0) {
    console.log(`⚠ 실패 워커: ${failed.map((f) => `W${f.workerIdx + 1}`).join(', ')}`);
  } else {
    console.log('✓ 모든 워커 성공');
  }

  console.log('\n💡 다음 단계: npm run generate:embeddings');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ 오류: ${message}`);
  process.exit(1);
});
