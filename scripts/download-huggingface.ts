/**
 * HuggingFace 일본 수학 문제 데이터셋 다운로드 + JSON 변환
 *
 * 대상 데이터셋:
 *   1) Kendamarron/magpie-japanese-math-instruction-17k (Apache 2.0)
 *   2) Kendamarron/magpie-math-japanese-instruction-evolved (Apache 2.0)
 *
 * HuggingFace Datasets API를 사용하여 Parquet/JSONL 형식 다운로드 후
 * JapanRawProblem[] 형식의 JSON으로 변환
 *
 * 사용법:
 *   npm run download:huggingface -- --output ./data/japan-raw/huggingface
 *   npm run download:huggingface -- --output ./data/japan-raw/huggingface --limit 1000
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import type { JapanRawProblem } from './lib/japan-types.js';

// ─────────────────────────────────────────────
// CLI 인자
// ─────────────────────────────────────────────

interface CliArgs {
  outputPath: string;
  limit: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);

  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : './data/japan-raw/huggingface';

  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) : 0;

  return { outputPath: resolve(outputPath), limit };
}

// ─────────────────────────────────────────────
// HuggingFace API
// ─────────────────────────────────────────────

/** HuggingFace Datasets API에서 데이터 행 가져오기 (429 재시도 포함) */
async function fetchDatasetRows(
  datasetId: string,
  split: string,
  offset: number,
  length: number
): Promise<{ rows: Record<string, unknown>[]; num_rows_total: number }> {
  const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(datasetId)}&config=default&split=${split}&offset=${offset}&length=${length}`;
  const MAX_RETRIES = 8;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url);

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const waitMs = Math.pow(2, attempt + 1) * 1000;
      process.stdout.write(`\n  ⏳ 속도 제한 — ${waitMs / 1000}초 대기 (${attempt + 1}/${MAX_RETRIES})...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HuggingFace API 오류 (${res.status}): ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      rows: { row: Record<string, unknown> }[];
      num_rows_total: number;
    };

    return {
      rows: data.rows.map((r) => r.row),
      num_rows_total: data.num_rows_total,
    };
  }

  throw new Error('HuggingFace API 최대 재시도 초과');
}

// ─────────────────────────────────────────────
// 데이터 변환
// ─────────────────────────────────────────────

/** HuggingFace 수학 문제 레코드에서 문제/답/풀이 추출 */
function extractProblem(
  row: Record<string, unknown>,
  index: number,
  datasetId: string
): JapanRawProblem | null {
  /** 다양한 필드명 시도 */
  const content = findStringField(row, ['instruction', 'question', 'problem', 'input', 'prompt']);
  const solution = findStringField(row, ['output', 'response', 'solution', 'answer_detail', 'reasoning']);
  const answer = findStringField(row, ['answer', 'final_answer', 'correct_answer']) ?? '';

  if (!content || content.trim().length < 10) {
    return null;
  }

  /** 카테고리 추출 시도 */
  const category = findStringField(row, ['category', 'topic', 'subject', 'type']) ?? '';
  const subcategory = findStringField(row, ['subcategory', 'subtopic', 'level']) ?? '';
  const difficulty = findStringField(row, ['difficulty', 'level', 'hard_level']) ?? 'medium';

  /** 답이 없으면 풀이의 마지막 부분에서 추출 시도 */
  let finalAnswer = answer;
  if (!finalAnswer && solution) {
    const answerMatch = solution.match(/答[えは]?\s*[:：]\s*(.+?)(?:\n|$)/);
    if (answerMatch) {
      finalAnswer = answerMatch[1].trim();
    }
  }

  return {
    id: `hf-${datasetId.split('/').pop()}-${index}`,
    content,
    answer: finalAnswer || '(풀이 참조)',
    solution: solution ?? '',
    category,
    subcategory,
    difficulty,
    sourceType: 'huggingface',
    sourceUrl: `https://huggingface.co/datasets/${datasetId}`,
  };
}

/** 객체에서 문자열 필드 찾기 */
function findStringField(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim()) {
      return val.trim();
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────

/** 데이터셋 목록 */
const DATASETS = [
  {
    id: 'Kendamarron/magpie-japanese-math-instruction-17k-qwen2.5-bakeneko-32b-instruct',
    shortName: 'kendamarron-17k',
    split: 'train',
  },
  {
    id: 'Kendamarron/magpie-math-japanese-instruction-evolved',
    shortName: 'kendamarron-10k',
    split: 'train',
  },
];

async function main(): Promise<void> {
  const { outputPath, limit } = parseArgs(process.argv);

  console.log('=== HuggingFace 일본 수학 데이터셋 다운로드 ===');
  console.log(`출력 경로: ${outputPath}`);
  if (limit > 0) console.log(`제한: ${limit}건/데이터셋`);
  console.log('');

  await mkdir(outputPath, { recursive: true });

  let totalProblems = 0;

  for (const dataset of DATASETS) {
    console.log(`\n📦 ${dataset.shortName} 다운로드 중...`);
    console.log(`  → ${dataset.id}`);

    const problems: JapanRawProblem[] = [];
    const pageSize = 100;
    let offset = 0;
    let totalRows = 0;

    try {
      /** 첫 페이지로 전체 행 수 확인 */
      const first = await fetchDatasetRows(dataset.id, dataset.split, 0, pageSize);
      totalRows = first.num_rows_total;
      const maxRows = limit > 0 ? Math.min(limit, totalRows) : totalRows;
      console.log(`  → 전체 ${totalRows}건, 다운로드 대상: ${maxRows}건`);

      /** 첫 페이지 처리 */
      for (let i = 0; i < first.rows.length && problems.length < maxRows; i++) {
        const p = extractProblem(first.rows[i], offset + i, dataset.id);
        if (p) problems.push(p);
      }
      offset += pageSize;

      /** 나머지 페이지 */
      while (offset < maxRows) {
        const batchSize = Math.min(pageSize, maxRows - offset);
        const page = await fetchDatasetRows(dataset.id, dataset.split, offset, batchSize);

        for (let i = 0; i < page.rows.length && problems.length < maxRows; i++) {
          const p = extractProblem(page.rows[i], offset + i, dataset.id);
          if (p) problems.push(p);
        }

        offset += batchSize;
        process.stdout.write(`\r  다운로드 중... ${Math.min(offset, maxRows)}/${maxRows}`);

        /** 속도 제한 방지 (500ms 간격) */
        await new Promise((r) => setTimeout(r, 500));
      }
      console.log('');

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n  ✗ 다운로드 중단: ${message}`);
      if (problems.length > 0) {
        console.log(`  → 이미 받은 ${problems.length}건은 저장합니다.`);
      } else {
        console.log('  → 건너뜁니다.');
        continue;
      }
    }

    /** JSON 저장 (부분 결과 포함) */
    const outFile = join(outputPath, `${dataset.shortName}.json`);
    await writeFile(outFile, JSON.stringify(problems, null, 2), 'utf-8');
    console.log(`  ✓ ${problems.length}건 저장 → ${outFile}`);
    totalProblems += problems.length;
  }

  console.log('\n=== 완료 ===');
  console.log(`총 다운로드: ${totalProblems}건`);
  console.log(`\n💡 다음 단계: npm run import:japan -- --source huggingface --input ${outputPath}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ 오류: ${message}`);
  process.exit(1);
});
