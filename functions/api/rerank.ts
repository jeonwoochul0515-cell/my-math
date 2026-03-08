/** Claude 리랭킹 API - 참고 문제 후보 중 최적 문제 선택 */

interface Env {
  ANTHROPIC_API_KEY: string;
}

interface RerankCandidate {
  id: number;
  content: string;
  answer: string;
  difficulty: string;
  rrfScore: number;
}

interface RequestBody {
  candidates: RerankCandidate[];
  grade: string;
  topic: string;
  subTopic?: string;
  difficulty: string;
  topK: number;
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
    const { candidates, grade, topic, difficulty } = body;

    /** topK 입력 검증 및 클램핑 (1~20) */
    const topK = Math.max(1, Math.min(20, Math.floor(Number(body.topK) || 5)));

    /** 필수 필드 검증 */
    if (!grade || typeof grade !== 'string') {
      return new Response(JSON.stringify({ error: '학년(grade)이 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!topic || typeof topic !== 'string') {
      return new Response(JSON.stringify({ error: '단원(topic)이 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!candidates?.length) {
      return new Response(JSON.stringify({ rankedIds: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    /** 후보가 topK 이하면 리랭킹 불필요 */
    if (candidates.length <= topK) {
      return new Response(JSON.stringify({
        rankedIds: candidates.map((c) => c.id),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const difficultyMap: Record<string, string> = {
      easy: '쉬움',
      medium: '보통',
      hard: '어려움',
    };
    const diffKr = difficultyMap[difficulty] ?? difficulty;

    /** 세부 성취기준 정보 (있으면 프롬프트에 추가) */
    const subTopicInfo = body.subTopic
      ? `\n참고: 요청된 세부 성취기준 — ${body.subTopic}\n이 성취기준에 가장 관련 있는 문제를 우선 선택하세요.`
      : '';

    /** Claude에게 최소한의 토큰으로 리랭킹 요청 */
    const candidateList = candidates
      .map((c, i) => `[${i + 1}] ${c.content.substring(0, 200)}`)
      .join('\n');

    const prompt = `당신은 한국 수학 문제 전문가입니다.
아래는 "${grade} ${topic}" 단원의 참고 문제 후보 ${candidates.length}개입니다.
${diffKr} 난이도의 새 문제를 만들기 위한 참고 자료로 가장 적합한 ${topK}개를 선택하세요.

선택 기준:
- 해당 단원의 핵심 개념을 잘 다루는 문제
- 난이도가 요청과 비슷한 문제
- 풀이 과정이 참고할 가치가 있는 문제
- 다양한 유형을 포함 (비슷한 문제 중복 방지)

후보 문제:
${candidateList}
${subTopicInfo}
반드시 선택한 문제의 번호만 JSON 배열로 응답하세요. 예: [1, 3, 5]`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      /** 리랭킹 실패 시 RRF 점수 기준 상위 topK 반환 (M11: 복사 후 정렬) */
      const fallbackIds = [...candidates]
        .sort((a, b) => b.rrfScore - a.rrfScore)
        .slice(0, topK)
        .map((c) => c.id);
      return new Response(JSON.stringify({ rankedIds: fallbackIds, fallback: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = (await response.json()) as { content: { text: string }[] };
    const text = result.content[0]?.text ?? '[]';

    /** JSON 배열 추출 (응답에 추가 텍스트가 있을 수 있음) */
    const jsonMatch = text.match(/\[[\d\s,]+\]/);
    if (!jsonMatch) {
      /** 파싱 실패 시 RRF 폴백 (M11: 복사 후 정렬) */
      const fallbackIds = [...candidates]
        .sort((a, b) => b.rrfScore - a.rrfScore)
        .slice(0, topK)
        .map((c) => c.id);
      return new Response(JSON.stringify({ rankedIds: fallbackIds, fallback: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const selectedIndices = JSON.parse(jsonMatch[0]) as number[];

    /** 선택된 인덱스(1-based)를 ID로 변환 */
    const rankedIds = selectedIndices
      .filter((idx) => idx >= 1 && idx <= candidates.length)
      .map((idx) => candidates[idx - 1].id);

    return new Response(JSON.stringify({ rankedIds }), {
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
