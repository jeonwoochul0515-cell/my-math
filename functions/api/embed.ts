/** Voyage AI 임베딩 API - 문제 벡터화 (Cloudflare Pages Function) */

interface Env {
  VOYAGE_API_KEY: string;
}

interface RequestBody {
  texts: string[];
}

interface VoyageEmbeddingResponse {
  data: { embedding: number[]; index: number }[];
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { VOYAGE_API_KEY } = context.env;

  if (!VOYAGE_API_KEY) {
    return new Response(JSON.stringify({ error: 'Voyage AI API 키가 설정되지 않았습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await context.request.json()) as RequestBody;
    const { texts } = body;

    if (!texts?.length) {
      return new Response(JSON.stringify({ error: '텍스트가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        input: texts,
        model: 'voyage-3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: '임베딩 생성에 실패했습니다.', detail: errorText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = (await response.json()) as VoyageEmbeddingResponse;

    /** index 순 정렬 후 기존 응답 형식과 호환되게 반환 */
    const sorted = result.data.sort((a, b) => a.index - b.index);

    return new Response(JSON.stringify({ embeddings: sorted.map((d) => d.embedding) }), {
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
