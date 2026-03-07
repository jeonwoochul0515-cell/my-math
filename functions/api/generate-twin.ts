/** 쌍둥이 문제 생성 API — 오답노트 재시도를 위한 유사 문제 생성 */

interface Env {
  ANTHROPIC_API_KEY: string;
}

/** 원본 문제 정보 */
interface OriginalProblem {
  content: string;
  answer: string;
  solution: string;
  topic: string;
  grade: string;
  difficulty: string;
  choices: string[];
}

interface RequestBody {
  originalProblem: OriginalProblem;
  studentError: string;      // 학생이 선택한 오답
  errorAnalysis: string;     // 오답 원인 분석
  count: number;             // 생성할 문제 수 (보통 1-2)
}

/** 생성된 문제 구조 */
interface GeneratedProblem {
  content: string;
  choices: string[];
  answer: string;
  solution: string;
}

/** Claude API 응답 타입 */
interface ClaudeResponse {
  content: { type: string; text: string }[];
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

  const data = (await res.json()) as ClaudeResponse;
  if (!data.content || data.content.length === 0) {
    throw new Error('Claude API가 빈 응답을 반환했습니다.');
  }

  let text = data.content[0]?.text ?? '';
  /** 코드블록 감싸기 제거 */
  text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  return text;
}

/** 구조 검증: 보기 4개, 정답이 보기에 포함, 보기 중복 없음 */
function structuralValidation(p: Partial<GeneratedProblem>): p is GeneratedProblem {
  if (!p.content || !p.answer || !p.solution || !Array.isArray(p.choices)) return false;
  if (p.choices.length !== 4) return false;
  if (!p.choices.includes(p.answer)) return false;
  /** 보기 중복 검사 */
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
    const { originalProblem, studentError, errorAnalysis } = body;

    /** 입력 검증 */
    if (!originalProblem?.content || !originalProblem?.answer) {
      return new Response(JSON.stringify({ error: '원본 문제 정보가 필요합니다.' }), {
        status: 400, headers: HEADERS,
      });
    }

    if (!originalProblem.topic || !originalProblem.grade) {
      return new Response(JSON.stringify({ error: '원본 문제의 학년(grade)과 단원(topic)이 필요합니다.' }), {
        status: 400, headers: HEADERS,
      });
    }

    if (!Array.isArray(originalProblem.choices) || originalProblem.choices.length !== 4) {
      return new Response(JSON.stringify({ error: '원본 문제의 보기(choices)는 4개 배열이어야 합니다.' }), {
        status: 400, headers: HEADERS,
      });
    }

    if (!studentError || typeof studentError !== 'string') {
      return new Response(JSON.stringify({ error: '학생의 오답(studentError)이 필요합니다.' }), {
        status: 400, headers: HEADERS,
      });
    }

    /** count 입력 검증 및 클램핑 (1~3개) */
    const count = Math.max(1, Math.min(3, Math.floor(Number(body.count) || 1)));

    /** 여유분 포함하여 생성 (검증 실패 대비) */
    const generateCount = count + 2;

    const difficultyMap: Record<string, string> = {
      easy: '쉬움 (기본 개념 확인)',
      medium: '보통 (응용 문제)',
      hard: '어려움 (심화 문제)',
    };

    const diffLabel = difficultyMap[originalProblem.difficulty] ?? originalProblem.difficulty;

    /** 쌍둥이 문제 생성 프롬프트 */
    const prompt = `당신은 한국 수학 교육 전문가입니다.
같은 개념을 테스트하되 숫자/맥락을 바꾼 쌍둥이 문제를 만드세요.
학생이 "${errorAnalysis}" 부분에서 틀렸으므로 이를 다시 확인할 수 있는 문제를 만드세요.

원본 문제:
${originalProblem.content}

보기: ${originalProblem.choices.map((c, j) => `${String(j + 1)}) ${c}`).join(' / ')}
정답: ${originalProblem.answer}
풀이: ${originalProblem.solution}

학생의 오답: ${studentError}
오답 원인 분석: ${errorAnalysis}

조건:
- 학년: ${originalProblem.grade}
- 단원: ${originalProblem.topic}
- 난이도: ${diffLabel}
- 생성 개수: ${String(generateCount)}개

문제 생성 절차 (반드시 이 순서를 따르세요):
1단계: 원본 문제와 같은 개념을 사용하되 숫자/상황을 변경한 문제를 설계하세요.
2단계: 학생이 틀린 부분(${errorAnalysis})을 다시 확인할 수 있도록 유사한 함정을 배치하세요.
3단계: 직접 풀어서 정답을 구하세요. 계산을 끝까지 하세요.
4단계: 정답을 보기 중 하나로 배치하고, 나머지 3개는 그럴듯한 오답으로 만드세요.
5단계: 풀이 과정을 정리하세요.

수식 표기:
- 모든 수식은 LaTeX로 $...$ 구분자로 감싸세요.
- 보기에도 수식이 있으면 동일하게 $...$로 감싸세요.
- 정답(answer)은 보기(choices) 중 하나와 문자열이 완전히 동일해야 합니다.

중요:
- 원본 문제와 동일한 문제를 만들지 마세요 (숫자/맥락 변경 필수).
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

    const genText = await callClaude(ANTHROPIC_API_KEY, prompt, 3072);

    /** JSON 파싱 */
    let rawProblems: Partial<GeneratedProblem>[];
    try {
      const parsed = JSON.parse(genText) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error('응답이 배열이 아닙니다.');
      }
      rawProblems = parsed as Partial<GeneratedProblem>[];
    } catch {
      return new Response(JSON.stringify({ error: 'AI 응답 파싱에 실패했습니다. 다시 시도해주세요.' }), {
        status: 422, headers: HEADERS,
      });
    }

    /** 구조 검증 통과한 문제만 필터링 */
    const validProblems = rawProblems.filter(structuralValidation);

    if (validProblems.length === 0) {
      return new Response(JSON.stringify({ error: '생성된 쌍둥이 문제가 구조 검증을 통과하지 못했습니다. 다시 시도해주세요.' }), {
        status: 422, headers: HEADERS,
      });
    }

    /** 요청 개수만큼만 반환 */
    const finalProblems = validProblems.slice(0, count);

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
