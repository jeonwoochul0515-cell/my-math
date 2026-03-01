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
    const { grade, topic, difficulty, count, referenceProblems } = body;

    const difficultyMap: Record<string, string> = {
      easy: '쉬움 (기본 개념 확인)',
      medium: '보통 (응용 문제)',
      hard: '어려움 (심화 문제)',
    };

    const refText = referenceProblems?.length
      ? `\n\n참고 문제:\n${referenceProblems.map((p, i) => `${i + 1}. ${p.content}\n정답: ${p.answer}\n풀이: ${p.solution}`).join('\n\n')}`
      : '';

    const prompt = `당신은 한국 수학 교육 전문가입니다.
아래 조건에 맞는 수학 문제를 ${count}개 생성하세요.

조건:
- 학년: ${grade}
- 단원: ${topic}
- 난이도: ${difficultyMap[difficulty] ?? difficulty}
${refText}

반드시 아래 JSON 형식으로만 응답하세요:
[
  {
    "content": "문제 내용",
    "choices": ["보기1", "보기2", "보기3", "보기4"],
    "answer": "정답 (보기 중 하나)",
    "solution": "상세 풀이 과정"
  }
]

참고 문제와 동일한 문제를 만들지 마세요. 새로운 문제여야 합니다.`;

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
    const text = result.content[0]?.text ?? '[]';

    return new Response(JSON.stringify({ problems: JSON.parse(text) }), {
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
