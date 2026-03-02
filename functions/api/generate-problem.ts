/** AI 문제 생성 API - Claude API 호출 */

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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { ANTHROPIC_API_KEY } = context.env;

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
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
      ? `\n\n참고 문제:\n${referenceProblems.map((p, i) => `${i + 1}. ${p.content}\n정답: ${p.answer}\n풀이: ${p.solution}`).join('\n\n')}`
      : '';

    const curriculumBlock = curriculumContext
      ? `\n\n2022 개정 교육과정 성취기준 (반드시 이 범위 내에서 출제하세요):\n${curriculumContext}`
      : '';

    const prompt = `당신은 한국 수학 교육 전문가입니다.
아래 조건에 맞는 수학 문제를 ${count}개 생성하세요.

조건:
- 학년: ${grade}
- 단원: ${topic}
- 난이도: ${difficultyMap[difficulty] ?? difficulty}
${curriculumBlock}
${refText}

중요 지침:
- 교육과정 성취기준에 명시된 범위를 벗어나지 마세요.
- "다루지 않는다"로 명시된 내용은 절대 포함하지 마세요.
- 성취기준 적용 시 고려 사항에 따라 난이도를 조절하세요.
- 참고 문제와 동일한 문제를 만들지 마세요. 새로운 문제여야 합니다.

수식 표기 규칙:
- 모든 수식은 LaTeX로 작성하되 $...$ 구분자로 감싸세요. (예: $2^3 \\times 3^2$, $\\frac{1}{2}$, $\\sqrt{3}$)
- 보기(choices)에도 수식이 있으면 동일하게 $...$로 감싸세요.
- 정답(answer)은 반드시 보기(choices) 중 하나와 글자 그대로 정확히 동일해야 합니다.

검증 필수:
- 풀이 과정을 끝까지 직접 계산하고, 최종 결과가 정답(answer)과 일치하는지 재확인하세요.
- 정답은 반드시 보기(choices) 배열의 원소 중 하나와 문자열이 완전히 동일해야 합니다.
- 풀이에서 자기모순이 없는지 확인하세요.
- 문제 조건을 만족하는 답이 보기에 있는지 확인하세요.

반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드블록(```)으로 감싸지 마세요:
[
  {
    "content": "문제 내용",
    "choices": ["보기1", "보기2", "보기3", "보기4"],
    "answer": "정답 (보기 중 하나)",
    "solution": "상세 풀이 과정"
  }
]`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: '문제 생성에 실패했습니다.', detail: errorText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = (await response.json()) as { content: { type: string; text: string }[] };
    let text = result.content[0]?.text ?? '[]';

    /** Claude가 ```json 코드블록으로 감쌀 경우 제거 */
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();

    const problems = JSON.parse(text) as { content?: string; answer?: string; choices?: string[]; solution?: string }[];

    /** 서버 검증: 정답이 보기에 포함되어 있는지 확인 */
    const validated = problems.filter((p) => {
      if (!p.content || !p.answer || !Array.isArray(p.choices)) return false;
      if (p.choices.length !== 4) return false;
      if (!p.choices.includes(p.answer)) return false;
      return true;
    });

    if (validated.length === 0) {
      return new Response(JSON.stringify({ error: '생성된 문제가 검증을 통과하지 못했습니다. 다시 시도해주세요.' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ problems: validated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
