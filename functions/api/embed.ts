/** Gemini 임베딩 API - 문제 벡터화 */

interface Env {
  GEMINI_API_KEY: string;
}

interface RequestBody {
  texts: string[];
}

interface GeminiEmbeddingResponse {
  embeddings: { values: number[] }[];
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { GEMINI_API_KEY } = context.env;

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'Gemini API 키가 설정되지 않았습니다.' }), {
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: '임베딩 생성에 실패했습니다.', detail: errorText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = (await response.json()) as GeminiEmbeddingResponse;

    return new Response(JSON.stringify({ embeddings: result.embeddings.map((e) => e.values) }), {
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
