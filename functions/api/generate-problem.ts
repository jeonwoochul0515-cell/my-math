/** AI 문제 생성 API - 2-pass 검증 (생성 → 독립 검증) */

interface Env {
  ANTHROPIC_API_KEY: string;
}

interface RequestBody {
  grade: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
  referenceProblems?: { content: string; answer: string; solution: string }[];
  curriculumContext?: string;
}

interface RawProblem {
  content: string;
  answer: string;
  choices: string[];
  solution: string;
}

interface VerifyResult {
  index: number;
  valid: boolean;
  computed_answer: string;
  correct_choice_index: number;
  reason: string;
}

const HEADERS = { 'Content-Type': 'application/json' };

/** Claude API 호출 헬퍼 */
async function callClaude(
  apiKey: string,
  prompt: string,
  maxTokens: number
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Claude API 오류 (${String(res.status)}): ${detail}`);
  }

  const data = (await res.json()) as { content: { type: string; text: string }[] };
  let text = data.content[0]?.text ?? '';
  /** 코드블록 감싸기 제거 */
  text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  return text;
}

/** 구조 검증: 필수 필드, 보기 4개, 정답이 보기에 포함 */
function structuralValidation(p: Partial<RawProblem>): p is RawProblem {
  if (!p.content || !p.answer || !p.solution || !Array.isArray(p.choices)) return false;
  if (p.choices.length !== 4) return false;
  if (!p.choices.includes(p.answer)) return false;
  return true;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { ANTHROPIC_API_KEY } = context.env;

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }), {
      status: 500, headers: HEADERS,
    });
  }

  try {
    const body = (await context.request.json()) as RequestBody;
    const { grade, topic, difficulty, count, referenceProblems, curriculumContext } = body;

    const difficultyMap: Record<string, string> = {
      easy: '쉬움 (기본 개념 확인)',
      medium: '보통 (응용 문제)',
      hard: '어려움 (심화 문제)',
    };

    const refText = referenceProblems?.length
      ? `\n\n참고 문제:\n${referenceProblems.map((p, i) => `${String(i + 1)}. ${p.content}\n정답: ${p.answer}\n풀이: ${p.solution}`).join('\n\n')}`
      : '';

    const curriculumBlock = curriculumContext
      ? `\n\n2022 개정 교육과정 성취기준 (반드시 이 범위 내에서 출제하세요):\n${curriculumContext}`
      : '';

    /** 여유분 포함하여 생성 (검증 탈락분 보충) */
    const generateCount = Math.min(count + 3, 10);

    // =====================================================================
    // PASS 1: 문제 생성
    // =====================================================================
    const generatePrompt = `당신은 한국 수학 교육 전문가입니다.
아래 조건에 맞는 수학 문제를 ${String(generateCount)}개 생성하세요.

조건:
- 학년: ${grade}
- 단원: ${topic}
- 난이도: ${difficultyMap[difficulty] ?? difficulty}
${curriculumBlock}
${refText}

문제 생성 절차 (반드시 이 순서를 따르세요):
1단계: 문제 상황을 설계하세요 (숫자, 조건 등).
2단계: 직접 풀어서 정답을 구하세요. 계산을 끝까지 하세요.
3단계: 2단계에서 구한 답을 보기 중 하나로 배치하세요.
4단계: 나머지 3개 보기는 흔한 실수를 반영한 그럴듯한 오답으로 만드세요.
5단계: 풀이 과정을 정리하세요. 풀이의 최종 답이 정답 필드와 일치해야 합니다.

수식 표기:
- 모든 수식은 LaTeX로 $...$ 구분자로 감싸세요.
- 보기에도 수식이 있으면 동일하게 $...$로 감싸세요.
- 정답(answer)은 보기(choices) 중 하나와 문자열이 완전히 동일해야 합니다.

중요:
- 교육과정 범위를 벗어나지 마세요.
- 참고 문제와 동일한 문제를 만들지 마세요.
- 풀이(solution)의 최종 계산 결과 = answer 필드 값 = choices 중 하나. 이 세 가지가 반드시 일치해야 합니다.

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이):
[
  {
    "content": "문제 내용",
    "choices": ["보기1", "보기2", "보기3", "보기4"],
    "answer": "정답 (보기 중 하나와 동일)",
    "solution": "상세 풀이 과정"
  }
]`;

    const genText = await callClaude(ANTHROPIC_API_KEY, generatePrompt, 4096);
    const rawProblems = JSON.parse(genText) as Partial<RawProblem>[];

    /** 구조 검증 통과한 문제만 */
    const structValid = rawProblems.filter(structuralValidation);

    if (structValid.length === 0) {
      return new Response(JSON.stringify({ error: '생성된 문제가 구조 검증을 통과하지 못했습니다. 다시 시도해주세요.' }), {
        status: 422, headers: HEADERS,
      });
    }

    // =====================================================================
    // PASS 2: 독립 검증 (각 문제를 처음부터 다시 풀어서 정답 확인)
    // =====================================================================
    const verifyPrompt = `당신은 엄격한 수학 교사입니다.
아래 문제들을 하나씩 처음부터 직접 풀어서 검증하세요.
제시된 정답이나 풀이를 참고하지 말고, 문제와 보기만 보고 독립적으로 풀어보세요.

문제들:
${structValid.map((p, i) => `[문제 ${String(i)}]
${p.content}
보기: ${p.choices.map((c, j) => `${String(j + 1)}) ${c}`).join(' / ')}
제시된 정답: ${p.answer}
제시된 풀이: ${p.solution}`).join('\n\n')}

각 문제에 대해:
1. 문제를 직접 처음부터 풀어보세요 (계산 과정을 보여주세요).
2. 당신이 구한 답과 제시된 정답이 일치하는지 확인하세요.
3. 풀이 과정에 논리적 오류가 없는지 확인하세요.
4. 정답이 보기 중 하나와 정확히 일치하는지 확인하세요.

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이):
[
  {
    "index": 0,
    "valid": true,
    "computed_answer": "직접 계산한 답",
    "correct_choice_index": 0,
    "reason": ""
  }
]
valid가 false인 경우 reason에 불일치 사유를 적으세요.
correct_choice_index는 0부터 시작하는 올바른 보기 번호입니다 (답이 보기에 없으면 -1).`;

    let verified: RawProblem[] = [];

    try {
      const verifyText = await callClaude(ANTHROPIC_API_KEY, verifyPrompt, 2048);
      const verifyResults = JSON.parse(verifyText) as VerifyResult[];

      /** 검증 통과한 문제만 필터링 */
      verified = structValid.filter((_p, i) => {
        const result = verifyResults.find((r) => r.index === i);
        return result?.valid === true;
      });
    } catch {
      /** 검증 API 실패 시 구조 검증만 통과한 문제 반환 (서비스 중단 방지) */
      verified = structValid;
    }

    if (verified.length === 0) {
      return new Response(JSON.stringify({
        error: '생성된 문제가 수학적 검증을 통과하지 못했습니다. 다시 시도해주세요.',
      }), {
        status: 422, headers: HEADERS,
      });
    }

    /** 요청 개수만큼만 반환 */
    const finalProblems = verified.slice(0, count);

    return new Response(JSON.stringify({ problems: finalProblems }), {
      status: 200, headers: HEADERS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: HEADERS,
    });
  }
};
