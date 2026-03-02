/**
 * AIHub 데이터를 LoRA 학습용 인스트럭션 데이터로 변환
 *
 * 두 가지 태스크로 변환:
 *   1) 문제 생성: 조건 → 문제+정답+풀이
 *   2) 문제 풀이: 문제 → 정답+풀이
 *
 * 사용법: npx tsx scripts/prepare-lora-data.ts
 * 출력: data/lora-train.jsonl, data/lora-eval.jsonl
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { parseAihubJson } from './lib/aihub-parser.js';

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

interface TrainingSample {
  instruction: string;
  input: string;
  output: string;
}

interface ParsedProblem {
  content: string;
  answer: string;
  solution: string | null;
  grade: string;
  topic: string;
  difficulty: string;
}

// ---------------------------------------------------------------------------
// 난이도 한글 변환
// ---------------------------------------------------------------------------

const DIFFICULTY_KR: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

// ---------------------------------------------------------------------------
// 인스트럭션 데이터 생성
// ---------------------------------------------------------------------------

/** 문제 생성 태스크 인스트럭션 */
function makeGenerationSample(p: ParsedProblem): TrainingSample {
  const diffKr = DIFFICULTY_KR[p.difficulty] ?? p.difficulty;

  return {
    instruction: '주어진 조건에 맞는 수학 문제를 만들어주세요.',
    input: `학년: ${p.grade}\n단원: ${p.topic}\n난이도: ${diffKr}`,
    output: `문제: ${p.content}\n정답: ${p.answer}${p.solution ? `\n풀이: ${p.solution}` : ''}`,
  };
}

/** 문제 풀이 태스크 인스트럭션 */
function makeSolvingSample(p: ParsedProblem): TrainingSample {
  return {
    instruction: '다음 수학 문제를 풀어주세요. 풀이 과정과 정답을 제시하세요.',
    input: `[${p.grade} / ${p.topic}]\n${p.content}`,
    output: `정답: ${p.answer}${p.solution ? `\n풀이: ${p.solution}` : ''}`,
  };
}

// ---------------------------------------------------------------------------
// 메인
// ---------------------------------------------------------------------------

function main() {
  const inputPath = resolve('data/aihub-all.json');
  console.log('=== LoRA 학습 데이터 준비 ===\n');
  console.log(`입력: ${inputPath}`);

  /** AIHub JSON 로드 및 파싱 */
  const rawData: unknown[] = JSON.parse(readFileSync(inputPath, 'utf-8'));
  console.log(`원본 레코드: ${rawData.length}건`);

  const problems: ParsedProblem[] = [];
  for (const raw of rawData) {
    const parsed = parseAihubJson(raw);
    if (parsed) problems.push(parsed);
  }
  console.log(`파싱 성공: ${problems.length}건\n`);

  /** 셔플 */
  for (let i = problems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [problems[i], problems[j]] = [problems[j], problems[i]];
  }

  /** Train/Eval 분할 (95% / 5%) */
  const evalSize = Math.max(100, Math.floor(problems.length * 0.05));
  const evalProblems = problems.slice(0, evalSize);
  const trainProblems = problems.slice(evalSize);

  console.log(`학습 데이터: ${trainProblems.length}건`);
  console.log(`평가 데이터: ${evalProblems.length}건\n`);

  /** 인스트럭션 샘플 생성 (각 문제에서 생성 + 풀이 2개씩) */
  const trainSamples: TrainingSample[] = [];
  const evalSamples: TrainingSample[] = [];

  for (const p of trainProblems) {
    trainSamples.push(makeGenerationSample(p));
    trainSamples.push(makeSolvingSample(p));
  }

  for (const p of evalProblems) {
    evalSamples.push(makeGenerationSample(p));
    evalSamples.push(makeSolvingSample(p));
  }

  /** 학습 데이터 셔플 */
  for (let i = trainSamples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [trainSamples[i], trainSamples[j]] = [trainSamples[j], trainSamples[i]];
  }

  /** JSONL 저장 */
  const trainPath = resolve('data/lora-train.jsonl');
  const evalPath = resolve('data/lora-eval.jsonl');

  writeFileSync(trainPath, trainSamples.map((s) => JSON.stringify(s)).join('\n'));
  writeFileSync(evalPath, evalSamples.map((s) => JSON.stringify(s)).join('\n'));

  const trainSizeMB = (Buffer.byteLength(trainSamples.map((s) => JSON.stringify(s)).join('\n')) / 1024 / 1024).toFixed(1);
  const evalSizeMB = (Buffer.byteLength(evalSamples.map((s) => JSON.stringify(s)).join('\n')) / 1024 / 1024).toFixed(1);

  console.log(`저장 완료:`);
  console.log(`  ${trainPath} (${trainSamples.length}건, ${trainSizeMB}MB)`);
  console.log(`  ${evalPath} (${evalSamples.length}건, ${evalSizeMB}MB)`);

  /** 샘플 미리보기 */
  console.log('\n=== 샘플 미리보기 ===');
  console.log('\n[문제 생성 태스크]');
  const genSample = trainSamples.find((s) => s.instruction.includes('만들어'));
  if (genSample) {
    console.log(`  instruction: ${genSample.instruction}`);
    console.log(`  input: ${genSample.input}`);
    console.log(`  output: ${genSample.output.substring(0, 200)}...`);
  }

  console.log('\n[문제 풀이 태스크]');
  const solveSample = trainSamples.find((s) => s.instruction.includes('풀어'));
  if (solveSample) {
    console.log(`  instruction: ${solveSample.instruction}`);
    console.log(`  input: ${solveSample.input.substring(0, 150)}...`);
    console.log(`  output: ${solveSample.output.substring(0, 200)}...`);
  }
}

main();
