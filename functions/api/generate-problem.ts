/** AI 문제 생성 API - 2-pass 검증 (생성 → 독립 검증) */

interface Env {
  ANTHROPIC_API_KEY: string;
}

interface RequestBody {
  grade: string;
  topic: string;
  subTopic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
  referenceProblems?: { content: string; answer: string; solution: string }[];
  curriculumContext?: string;
}

interface FigureElement {
  type: string;
  [key: string]: unknown;
}

interface FigureSpec {
  boundingBox: [number, number, number, number];
  elements: FigureElement[];
  axis?: boolean;
  grid?: boolean;
}

interface RawProblem {
  content: string;
  answer: string;
  choices: string[];
  solution: string;
  figure?: FigureSpec;
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
  /** M8: 빈 content 배열 처리 */
  if (!data.content || data.content.length === 0) {
    throw new Error('Claude API가 빈 응답을 반환했습니다.');
  }
  let text = data.content[0]?.text ?? '';
  /** 코드블록 감싸기 제거 */
  text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  return text;
}

/** 구조 검증: 필수 필드, 보기 4개, 정답이 보기에 포함, 보기 중복 없음 */
function structuralValidation(p: Partial<RawProblem>): p is RawProblem {
  if (!p.content || !p.answer || !p.solution || !Array.isArray(p.choices)) return false;
  if (p.choices.length !== 4) return false;
  if (!p.choices.includes(p.answer)) return false;
  /** M10: 보기 중복 검사 */
  const uniqueChoices = new Set(p.choices);
  if (uniqueChoices.size !== p.choices.length) return false;
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
    const { grade, topic, difficulty, referenceProblems, curriculumContext } = body;

    /** 필수 필드 검증 */
    if (!grade || typeof grade !== 'string') {
      return new Response(JSON.stringify({ error: '학년(grade)이 필요합니다.' }), {
        status: 400, headers: HEADERS,
      });
    }
    if (!topic || typeof topic !== 'string') {
      return new Response(JSON.stringify({ error: '단원(topic)이 필요합니다.' }), {
        status: 400, headers: HEADERS,
      });
    }
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!difficulty || !validDifficulties.includes(difficulty)) {
      return new Response(JSON.stringify({ error: `난이도(difficulty)가 유효하지 않습니다. 가능한 값: ${validDifficulties.join(', ')}` }), {
        status: 400, headers: HEADERS,
      });
    }

    /** H3: count 입력 검증 및 클램핑 */
    const count = Math.max(1, Math.min(10, Math.floor(Number(body.count) || 5)));

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

    /** 세부 성취기준 블록 (subTopic이 있으면 추가) */
    const subTopicBlock = body.subTopic
      ? `\n## 세부 성취기준\n이 문제는 다음 성취기준 범위에서 출제합니다:\n${body.subTopic}\n해당 성취기준의 핵심 개념과 학습 목표에 맞는 문제를 생성하세요.\n`
      : '';

    /** 도형/그래프가 필요한 단원인지 판별 */
    const FIGURE_TOPICS = [
      /** 초등 도형/측정 */
      '여러 가지 모양', '평면도형', '평면도형의 이동', '사각형', '다각형',
      '다각형의 둘레와 넓이', '합동과 대칭', '각기둥과 각뿔',
      '직육면체의 부피와 겉넓이', '원의 넓이', '원기둥·원뿔·구',
      /** 중등 도형 */
      '기본 도형', '작도와 합동', '평면도형의 성질', '입체도형의 성질',
      '삼각형의 성질', '사각형의 성질', '도형의 닮음', '삼각비', '원의 성질',
      /** 고등 */
      '도형의 방정식',
      /** 함수/그래프 */
      '좌표평면과 그래프', '정비례와 반비례', '일차함수', '이차함수',
      '삼각함수', '함수의 극한과 연속', '미분', '적분', '함수',
    ];
    const needsFigure = FIGURE_TOPICS.some((t) => topic.includes(t) || t.includes(topic));

    const figureBlock = needsFigure ? `
도형/그래프 생성:
이 단원은 도형이나 그래프가 필요합니다. 각 문제에 "figure" 필드를 추가하세요.
figure는 다음 JSON 형식입니다:
{
  "boundingBox": [xmin, ymax, xmax, ymin],
  "axis": true/false,
  "grid": true/false,
  "elements": [
    { "type": "point", "name": "A", "coords": [x, y], "label": true },
    { "type": "segment", "from": "A", "to": "B" },
    { "type": "line", "from": "A", "to": "B", "dash": false },
    { "type": "circle", "center": "A", "radius": 3 },
    { "type": "circle", "center": "A", "through": "B" },
    { "type": "polygon", "vertices": ["A", "B", "C"] },
    { "type": "angle", "points": ["A", "B", "C"], "label": "60°" },
    { "type": "functiongraph", "fn": "x*x - 2*x + 1", "range": [-3, 5] },
    { "type": "text", "coords": [x, y], "value": "텍스트" }
  ]
}
규칙:
- 좌표평면/함수 문제: axis=true, grid=true, functiongraph 사용
- 도형 문제: axis=false, point + segment/polygon/circle/angle 사용
- point를 먼저 정의하고, 다른 요소에서 name으로 참조
- fn 문자열에서 곱셈은 *, 거듭제곱은 ^, 삼각함수는 sin/cos/tan 사용
- boundingBox는 도형이 잘 보이도록 여유있게 설정
- 도형이 필요 없는 순수 계산 문제에는 figure를 생략하세요
` : '';

    /** H4: 여유분 버퍼 개선 — count 대비 최소 3, 최대 40% 추가 */
    const generateCount = Math.min(count + Math.max(3, Math.ceil(count * 0.4)), 15);

    // =====================================================================
    // PASS 1: 문제 생성
    // =====================================================================
    const generatePrompt = `당신은 한국 수학 교육 전문가입니다.
아래 조건에 맞는 수학 문제를 ${String(generateCount)}개 생성하세요.

조건:
- 학년: ${grade}
- 단원: ${topic}
- 난이도: ${difficultyMap[difficulty] ?? difficulty}
${curriculumBlock}${subTopicBlock}
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
${figureBlock}
반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이):
[
  {
    "content": "문제 내용",
    "choices": ["보기1", "보기2", "보기3", "보기4"],
    "answer": "정답 (보기 중 하나와 동일)",
    "solution": "상세 풀이 과정"${needsFigure ? ',\n    "figure": { "boundingBox": [...], "elements": [...], "axis": false, "grid": false }' : ''}
  }
]`;

    const genText = await callClaude(ANTHROPIC_API_KEY, generatePrompt, 4096);

    /** H8: JSON 파싱 실패 핸들링 */
    let rawProblems: Partial<RawProblem>[];
    try {
      const parsed = JSON.parse(genText) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error('응답이 배열이 아닙니다.');
      }
      rawProblems = parsed as Partial<RawProblem>[];
    } catch {
      return new Response(JSON.stringify({ error: 'AI 응답 파싱에 실패했습니다. 다시 시도해주세요.' }), {
        status: 422, headers: HEADERS,
      });
    }

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
    /** H2: 프롬프트를 1-based 인덱스로 변경 */
    const verifyPrompt = `당신은 엄격한 수학 교사입니다.
아래 문제들을 하나씩 처음부터 직접 풀어서 검증하세요.
제시된 정답이나 풀이를 참고하지 말고, 문제와 보기만 보고 독립적으로 풀어보세요.

문제들:
${structValid.map((p, i) => `[문제 ${String(i + 1)}]
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
    "index": 1,
    "valid": true,
    "computed_answer": "직접 계산한 답",
    "correct_choice_index": 1,
    "reason": ""
  }
]
index는 1부터 시작합니다.
valid가 false인 경우 reason에 불일치 사유를 적으세요.
correct_choice_index는 1부터 시작하는 올바른 보기 번호입니다 (답이 보기에 없으면 -1).`;

    let verified: RawProblem[] = [];
    /** H7: 검증 스킵 여부 추적 */
    let verificationSkipped = false;

    try {
      const verifyText = await callClaude(ANTHROPIC_API_KEY, verifyPrompt, 2048);

      /** H8: 검증 결과 파싱도 try-catch */
      let verifyResults: VerifyResult[];
      try {
        const parsed = JSON.parse(verifyText) as unknown;
        if (!Array.isArray(parsed)) throw new Error('검증 응답이 배열이 아닙니다.');
        verifyResults = parsed as VerifyResult[];
      } catch {
        verificationSkipped = true;
        verified = structValid;
        verifyResults = [];
      }

      if (!verificationSkipped) {
        /** H2: 1-based 인덱스로 매칭 */
        verified = structValid.filter((_p, i) => {
          const result = verifyResults.find((r) => r.index === i + 1);
          return result?.valid === true;
        });

        /** H2: 인덱스 미매칭 시 (검증 결과가 있지만 인덱스가 안 맞는 경우) 구조 검증 통과 문제 반환 */
        if (verified.length === 0 && verifyResults.length > 0) {
          const validCount = verifyResults.filter((r) => r.valid === true).length;
          if (validCount > 0) {
            verified = structValid;
            verificationSkipped = true;
          }
        }
      }
    } catch {
      /** 검증 API 실패 시 구조 검증만 통과한 문제 반환 (서비스 중단 방지) */
      verificationSkipped = true;
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

    /** H7: 검증 스킵 여부를 응답에 포함 */
    return new Response(JSON.stringify({
      problems: finalProblems,
      verified: !verificationSkipped,
    }), {
      status: 200, headers: HEADERS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: HEADERS,
    });
  }
};
