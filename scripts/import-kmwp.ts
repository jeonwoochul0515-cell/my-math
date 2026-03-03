/**
 * Korean-MWP-dataset (MIT 라이선스) 임포트
 * GitHub: https://github.com/JiwooKimAR/Korean-MWP-dataset
 * 25,525개 한국어 수학 서술형 문제를 problem_embeddings에 삽입
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { supabase } from './lib/supabase-client.js';

// ---------------------------------------------------------------------------
// 스택 기반 수식 평가기
// ---------------------------------------------------------------------------

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

function perm(n: number, r: number): number {
  let result = 1;
  for (let i = 0; i < r; i++) result *= (n - i);
  return result;
}

function comb(n: number, r: number): number {
  if (r > n) return 0;
  return perm(n, r) / perm(r, r);
}

type StackValue = number | string | StackValue[];

/** equation_op 문자열을 평가하여 답 반환 */
function evalEquation(eq: string): string | null {
  const tokens = eq.trim().split(/\s+/);
  const stack: StackValue[] = [];
  const listStack: StackValue[][] = [];

  const popNum = (): number => {
    const v = stack.pop();
    if (typeof v === 'number') return v;
    return NaN;
  };

  const popList = (): StackValue[] => {
    const v = stack.pop();
    if (Array.isArray(v)) return v;
    return [];
  };

  const numList = (list: StackValue[]): number[] =>
    list.filter((x): x is number => typeof x === 'number');

  try {
    for (const t of tokens) {
      switch (t) {
        // 산술 연산
        case '[OP_ADD]': { const b = popNum(), a = popNum(); stack.push(a + b); break; }
        case '[OP_SUB]': { const b = popNum(), a = popNum(); stack.push(a - b); break; }
        case '[OP_MUL]': { const b = popNum(), a = popNum(); stack.push(a * b); break; }
        case '[OP_DIV]': { const b = popNum(), a = popNum(); stack.push(b !== 0 ? a / b : 0); break; }
        case '[OP_FDIV]': { const b = popNum(), a = popNum(); stack.push(Math.floor(a / b)); break; }
        case '[OP_MOD]': { const b = popNum(), a = popNum(); stack.push(a % b); break; }
        case '[OP_POW]': { const b = popNum(), a = popNum(); stack.push(Math.pow(a, b)); break; }
        case '[OP_ABS]': stack.push(Math.abs(popNum())); break;
        case '[OP_FLOOR]': stack.push(Math.floor(popNum())); break;
        case '[OP_CEIL]': stack.push(Math.ceil(popNum())); break;
        case '[OP_ROUND]': {
          const d = popNum(), n = popNum();
          const factor = Math.pow(10, d);
          stack.push(Math.round(n * factor) / factor);
          break;
        }
        case '[OP_GCD]': { const b = popNum(), a = popNum(); stack.push(gcd(a, b)); break; }
        case '[OP_LCM]': { const b = popNum(), a = popNum(); stack.push(lcm(a, b)); break; }
        case '[OP_PERM]': { const r = popNum(), n = popNum(); stack.push(perm(n, r)); break; }
        case '[OP_COMB]': { const r = popNum(), n = popNum(); stack.push(comb(n, r)); break; }
        case '[OP_DUP_COMB]': { const r = popNum(), n = popNum(); stack.push(comb(n + r - 1, r)); break; }
        case '[OP_GET_PI]': stack.push(Math.PI); break;
        case '[OP_REVERSE_NUM]': {
          const n = popNum();
          const reversed = Number(String(Math.abs(Math.round(n))).split('').reverse().join(''));
          stack.push(n < 0 ? -reversed : reversed);
          break;
        }

        // 리스트 연산
        case '[OP_LIST_SOL]': listStack.push([]); break;
        case '[OP_LIST_EOL]': stack.push(listStack.pop() ?? []); break;
        case '[OP_LIST_LEN]': { const list = popList(); stack.push(list.length); break; }
        case '[OP_LIST_SUM]': { const list = popList(); stack.push(numList(list).reduce((a, b) => a + b, 0)); break; }
        case '[OP_LIST_MEAN]': {
          const list = popList();
          const nums = numList(list);
          stack.push(nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
          break;
        }
        case '[OP_LIST_MAX]': {
          const idx = popNum();
          const list = popList();
          const nums = numList(list);
          stack.push(nums.length > 0 ? Math.max(...nums) : 0);
          break;
        }
        case '[OP_LIST_MIN]': {
          const idx = popNum();
          const list = popList();
          const nums = numList(list);
          stack.push(nums.length > 0 ? Math.min(...nums) : 0);
          break;
        }
        case '[OP_LIST_INDEX]': break; // 보통 MAX/MIN 뒤에 오는 인덱싱 (결과는 이미 스택에)
        case '[OP_LIST_POP]': break;
        case '[OP_LIST_GET]': {
          // 리스트에서 인덱스로 값 가져오기
          const idx = popNum();
          const list = popList();
          if (Array.isArray(list) && idx >= 0 && idx < list.length) {
            stack.push(list[idx] as StackValue);
          }
          break;
        }
        case '[OP_LIST_EVEN]': {
          const list = popList();
          stack.push(numList(list).filter(n => n % 2 === 0));
          break;
        }
        case '[OP_LIST_ODD]': {
          const list = popList();
          stack.push(numList(list).filter(n => n % 2 !== 0));
          break;
        }
        case '[OP_LIST_PRIME]': {
          const list = popList();
          const isPrime = (n: number) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
          stack.push(numList(list).filter(isPrime));
          break;
        }
        case '[OP_LIST_DIVISIBLE]': {
          const divisor = popNum();
          const list = popList();
          stack.push(numList(list).filter(n => n % divisor === 0));
          break;
        }
        case '[OP_LIST_LESS]': {
          const val = popNum();
          const list = popList();
          stack.push(numList(list).filter(n => n < val));
          break;
        }
        case '[OP_LIST_MORE]': {
          const val = popNum();
          const list = popList();
          stack.push(numList(list).filter(n => n > val));
          break;
        }
        case '[OP_LIST_LESS_EQUAL]': {
          const val = popNum();
          const list = popList();
          stack.push(numList(list).filter(n => n <= val));
          break;
        }
        case '[OP_LIST_MORE_EQUAL]': {
          const val = popNum();
          const list = popList();
          stack.push(numList(list).filter(n => n >= val));
          break;
        }
        case '[OP_LIST_ARANGE]': {
          const step = popNum(), end = popNum(), start = popNum();
          const arr: number[] = [];
          if (step > 0) for (let i = start; i <= end; i += step) arr.push(i);
          else if (step < 0) for (let i = start; i >= end; i += step) arr.push(i);
          stack.push(arr);
          break;
        }
        case '[OP_LIST_GET_PERM]': {
          const r = popNum();
          const list = popList();
          stack.push(perm(list.length, r));
          break;
        }
        case '[OP_LIST_PERM]': {
          const r = popNum();
          const list = popList();
          stack.push(perm(list.length, r));
          break;
        }
        case '[OP_LIST_GET_PRODUCT]': {
          const list = popList();
          stack.push(numList(list).reduce((a, b) => a * b, 1));
          break;
        }
        case '[OP_LIST_GET_DIVISOR]': {
          const n = popNum();
          const divisors: number[] = [];
          for (let i = 1; i <= Math.abs(n); i++) if (n % i === 0) divisors.push(i);
          stack.push(divisors);
          break;
        }
        case '[OP_GET_DIVISOR]': {
          const n = popNum();
          const divisors: number[] = [];
          for (let i = 1; i <= Math.abs(n); i++) if (n % i === 0) divisors.push(i);
          stack.push(divisors);
          break;
        }
        case '[OP_SET_DIFFERENCE]': {
          const b = popList(), a = popList();
          const bSet = new Set(numList(b));
          stack.push(numList(a).filter(x => !bSet.has(x)));
          break;
        }
        case '[OP_SET_INTERSECT]': {
          const b = popList(), a = popList();
          const bSet = new Set(numList(b));
          stack.push(numList(a).filter(x => bSet.has(x)));
          break;
        }
        case '[OP_SET_UNION]': {
          const b = popList(), a = popList();
          stack.push([...new Set([...numList(a), ...numList(b)])]);
          break;
        }
        case '[OP_LIST_INTERSECT]': {
          const b = popList(), a = popList();
          const bSet = new Set(numList(b));
          stack.push(numList(a).filter(x => bSet.has(x)));
          break;
        }
        case '[OP_LIST_DIFFERENCE]': {
          const b = popList(), a = popList();
          const bSet = new Set(numList(b));
          stack.push(numList(a).filter(x => !bSet.has(x)));
          break;
        }
        case '[OP_NUM2LIST]': {
          const n = popNum();
          stack.push(String(Math.abs(Math.round(n))).split('').map(Number));
          break;
        }
        case '[OP_LIST2NUM]': {
          const list = popList();
          stack.push(Number(numList(list).join('')));
          break;
        }
        case '[OP_MEM]': break; // 메모이제이션 — 스킵
        case '[OP_LIST_NUM2SUM]': {
          const list = popList();
          stack.push(numList(list).reduce((s, n) => s + String(Math.abs(Math.round(n))).split('').map(Number).reduce((a, b) => a + b, 0), 0));
          break;
        }
        case '[OP_GET_NTH_DECIMAL]': {
          const pos = popNum(), n = popNum();
          const decStr = n.toString().split('.')[1] || '';
          stack.push(pos > 0 && pos <= decStr.length ? Number(decStr[pos - 1]) : 0);
          break;
        }
        case '[OP_LIST_ADD]': {
          const val = popNum();
          const list = popList();
          stack.push([...list, val]);
          break;
        }
        case '[OP_LIST_MUL]': {
          const val = popNum();
          const list = popList();
          stack.push(numList(list).map(n => n * val));
          break;
        }

        // 복잡한 연산 — 평가 실패 처리
        case '[OP_DIGIT_UNK_SOLVER]':
        case '[OP_NUM_UNK_SOLVER]':
        case '[OP_DIGIT_SOLVER]':
        case '[OP_LIST_FIND_UNK]':
        case '[OP_LIST_FIND_NUM]':
        case '[OP_LIST_FIND_DIVIDEND]':
        case '[OP_GEN_POSSIBLE_LIST]':
        case '[OP_LIST_SEARCH_FIXED_DIGIT]':
        case '[OP_LIST_DIVIDE_AND_REMAIN]':
        case '[OP_LIST_COND_MAX_MIN]':
        case '[OP_LIST_COND_BIG_SMAll]':
        case '[OP_LIST_NUM2LIST]':
        case '[OP_LIST_NU㎡LIST]':
        case '[OP_LIST_GET_DIVISIBLE]':
          return null; // 평가 불가

        default:
          if (!t.startsWith('[')) {
            const num = Number(t);
            if (!isNaN(num)) {
              if (listStack.length > 0) {
                listStack[listStack.length - 1].push(num);
              } else {
                stack.push(num);
              }
            } else {
              // 문자열 값 (변수명 등)
              if (listStack.length > 0) {
                listStack[listStack.length - 1].push(t);
              } else {
                stack.push(t);
              }
            }
          } else {
            return null; // 알 수 없는 연산자
          }
      }
    }

    const result = stack[stack.length - 1];
    if (typeof result === 'number') {
      if (!isFinite(result)) return null;
      /** 소수점 정리 */
      const rounded = Math.round(result * 10000) / 10000;
      return String(rounded);
    }
    if (typeof result === 'string') return result;
    if (Array.isArray(result)) return numList(result).join(', ');
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 학년/단원 분류 (키워드 기반)
// ---------------------------------------------------------------------------

interface Classification {
  grade: string;
  topic: string;
}

function classifyProblem(question: string, qtype: string): Classification {
  const q = question;

  /** qtype 기반 기본 분류 */
  if (qtype === '도형' || qtype === '도형고난이도') {
    if (/원주|원의\s*넓이|반지름|지름|원/.test(q)) return { grade: '초6', topic: '원의 넓이' };
    if (/직육면체|정육면체|부피|겉넓이/.test(q)) return { grade: '초6', topic: '직육면체의 부피와 겉넓이' };
    if (/삼각형|삼각/.test(q)) return { grade: '초4', topic: '삼각형' };
    if (/사각형|직사각형|정사각형|평행사변형|마름모/.test(q)) return { grade: '초4', topic: '사각형' };
    if (/다각형|정오각형|정육각형|둘레|넓이/.test(q)) return { grade: '초5', topic: '다각형의 둘레와 넓이' };
    if (/각도|도°|예각|둔각|직각/.test(q)) return { grade: '초4', topic: '각도' };
    return { grade: '초5', topic: '다각형의 둘레와 넓이' };
  }

  if (qtype === '조합하기') {
    if (/경우의\s*수|가지/.test(q)) return { grade: '공통수학2', topic: '경우의 수' };
    if (/순열|조합|뽑/.test(q)) return { grade: '공통수학2', topic: '경우의 수' };
    return { grade: '중2', topic: '확률' };
  }

  if (qtype === '순서정하기') {
    if (/큰|작은|높은|낮은|무거운|가벼운/.test(q)) return { grade: '초3', topic: '덧셈과 뺄셈' };
    return { grade: '초4', topic: '큰 수' };
  }

  if (qtype === '크기비교') {
    if (/분수/.test(q)) return { grade: '초5', topic: '약분과 통분' };
    if (/소수/.test(q)) return { grade: '초4', topic: '분수와 소수' };
    if (/속도|속력|km\/h|m\/s/.test(q)) return { grade: '초5', topic: '자연수의 혼합 계산' };
    return { grade: '초4', topic: '큰 수' };
  }

  if (qtype.startsWith('수찾기')) {
    if (/약수|배수/.test(q)) return { grade: '초5', topic: '약수와 배수' };
    if (/소인수|소수/.test(q) && /분해/.test(q)) return { grade: '중1', topic: '소인수분해' };
    if (/분수/.test(q)) return { grade: '초5', topic: '분수의 덧셈과 뺄셈' };
    if (/방정식/.test(q)) return { grade: '중1', topic: '일차방정식' };
    return { grade: '초5', topic: '자연수의 혼합 계산' };
  }

  /** 산술연산 — 키워드 기반 세분류 */
  if (/약수|배수|최대공약수|최소공배수/.test(q)) return { grade: '초5', topic: '약수와 배수' };
  if (/분수.*나눗셈|나누[었기]/.test(q) && /분수/.test(q)) return { grade: '초6', topic: '분수의 나눗셈' };
  if (/분수.*곱셈|곱[하한]/.test(q) && /분수/.test(q)) return { grade: '초5', topic: '분수의 곱셈' };
  if (/소수.*나눗셈|나누[었기]/.test(q) && /소수/.test(q)) return { grade: '초6', topic: '소수의 나눗셈' };
  if (/소수.*곱셈|곱[하한]/.test(q) && /소수/.test(q)) return { grade: '초5', topic: '소수의 곱셈' };
  if (/분수/.test(q) && /덧셈|뺄셈|더하|빼/.test(q)) return { grade: '초5', topic: '분수의 덧셈과 뺄셈' };
  if (/비율|백분율|%|비/.test(q) && /비례/.test(q)) return { grade: '초6', topic: '비와 비율' };
  if (/평균/.test(q)) return { grade: '초5', topic: '평균과 가능성' };
  if (/속도|속력|거리|시간|km|m\/min/.test(q)) return { grade: '초5', topic: '자연수의 혼합 계산' };
  if (/곱셈|곱하|곱[한]|×/.test(q)) return { grade: '초3', topic: '곱셈' };
  if (/나눗셈|나누[었기어]|÷/.test(q)) return { grade: '초3', topic: '나눗셈' };
  if (/덧셈|뺄셈|더하|빼/.test(q)) return { grade: '초3', topic: '덧셈과 뺄셈' };

  /** 기본값 */
  return { grade: '초5', topic: '자연수의 혼합 계산' };
}

// ---------------------------------------------------------------------------
// 메인
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const basePath = '/tmp/Korean-MWP-dataset/data';
  const dryRun = process.argv.includes('--dry-run');

  console.log('=== Korean-MWP-dataset 임포트 ===');
  console.log('라이선스: MIT (상업적 이용 가능)\n');

  /** 데이터 로드 (키가 겹치므로 값 기준으로 합침) */
  const trainRaw = await readFile(resolve(basePath, 'questions_train.json'), 'utf-8');
  const validRaw = await readFile(resolve(basePath, 'questions_valid.json'), 'utf-8');
  const testARaw = await readFile(resolve(basePath, 'test_A.json'), 'utf-8');
  const train = JSON.parse(trainRaw) as Record<string, Record<string, unknown>>;
  const valid = JSON.parse(validRaw) as Record<string, Record<string, unknown>>;
  const testA = JSON.parse(testARaw) as Record<string, Record<string, unknown>>;

  /** 질문 텍스트 기준 중복 제거 */
  const seen = new Set<string>();
  const allRecords: Record<string, unknown>[] = [];
  for (const source of [train, valid, testA]) {
    for (const val of Object.values(source)) {
      const q = (val as Record<string, unknown>).question as string;
      if (q && !seen.has(q)) {
        seen.add(q);
        allRecords.push(val as Record<string, unknown>);
      }
    }
  }
  console.log(`레코드 수: ${allRecords.length}건 (중복 제거 후)\n`);

  /** 매핑 */
  interface ProblemRecord {
    content: string;
    answer: string;
    solution: string | null;
    grade: string;
    topic: string;
    difficulty: string;
    source: string;
  }

  const records: ProblemRecord[] = [];
  let evalSuccess = 0;
  let evalFail = 0;

  for (const d of allRecords) {
    const question = d.question as string;
    const equationOp = d.equation_op as string;
    const qtype = (d.qtype as string) || '산술연산';

    if (!question || question.length < 5) continue;

    /** 답 계산 */
    const answer = evalEquation(equationOp);
    if (answer !== null) {
      evalSuccess++;
    } else {
      evalFail++;
    }

    /** 학년/단원 분류 */
    const { grade, topic } = classifyProblem(question, qtype);

    /** 난이도 추정 (qtype 기반) */
    let difficulty = 'medium';
    if (qtype === '도형고난이도' || qtype === '조합하기') difficulty = 'hard';
    else if (qtype === '크기비교' || qtype === '순서정하기') difficulty = 'easy';

    records.push({
      content: question,
      answer: answer ?? '풀이 참조',
      solution: equationOp ? `수식: ${equationOp}` : null,
      grade,
      topic,
      difficulty,
      source: 'kmwp',
    });
  }

  console.log(`매핑 성공: ${records.length}건`);
  console.log(`답 계산 성공: ${evalSuccess}건, 실패: ${evalFail}건\n`);

  /** 학년별 분포 */
  const gradeDist = new Map<string, number>();
  for (const r of records) {
    gradeDist.set(r.grade, (gradeDist.get(r.grade) ?? 0) + 1);
  }
  console.log('학년별 분포:');
  for (const [grade, count] of [...gradeDist.entries()].sort()) {
    console.log(`  ${grade}: ${count}건`);
  }

  /** 단원별 분포 */
  const topicDist = new Map<string, number>();
  for (const r of records) {
    topicDist.set(r.topic, (topicDist.get(r.topic) ?? 0) + 1);
  }
  console.log('\n단원별 분포:');
  for (const [topic, count] of [...topicDist.entries()].sort()) {
    console.log(`  ${topic}: ${count}건`);
  }

  if (dryRun) {
    console.log('\n[DRY RUN] 실제 삽입 없이 종료합니다.');
    return;
  }

  /** DB 삽입 */
  console.log(`\nSupabase에 삽입 중 (배치 500건씩)...`);
  let inserted = 0;
  let failed = 0;
  const batchSize = 500;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from('problem_embeddings').insert(batch);

    if (error) {
      console.warn(`  배치 실패 (${i + 1}~${i + batch.length}): ${error.message}`);
      /** 개별 재시도 */
      for (const rec of batch) {
        const { error: singleErr } = await supabase.from('problem_embeddings').insert(rec);
        if (singleErr) { failed++; } else { inserted++; }
      }
    } else {
      inserted += batch.length;
    }

    const done = Math.min(i + batchSize, records.length);
    const pct = ((done / records.length) * 100).toFixed(1);
    console.log(`  [${done}/${records.length}] ${pct}% 삽입 완료`);
  }

  console.log('\n=== 완료 ===');
  console.log(`삽입 성공: ${inserted}건`);
  console.log(`삽입 실패: ${failed}건`);
  console.log('\n💡 다음: npm run generate:embeddings 로 임베딩 생성');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n오류: ${message}`);
  process.exit(1);
});
