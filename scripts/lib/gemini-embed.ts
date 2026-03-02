/**
 * Gemini gemini-embedding-001 API 래퍼
 * functions/api/embed.ts와 동일한 API를 Node.js에서 직접 호출
 */

/** Gemini batchEmbedContents 응답 타입 */
interface GeminiEmbeddingResponse {
  embeddings: { values: number[] }[];
}

/** 지연 함수 (속도 제한 대기용) */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 텍스트 배열을 Gemini gemini-embedding-001로 벡터화
 * - batchEmbedContents API 사용 (최대 100개/요청)
 * - 429 응답 시 지수 백오프 재시도 (최대 3회)
 *
 * @param texts - 임베딩할 텍스트 배열
 * @param apiKey - Gemini API 키
 * @returns 768차원 벡터 배열
 */
export async function batchEmbed(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;

  const body = JSON.stringify({
    requests: texts.map((text) => ({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    })),
  });

  /** 지수 백오프 재시도 (무료 티어 분당 100회 제한 대응) */
  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    /** 429 (속도 제한) 시 대기 후 재시도 */
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const waitMs = Math.max(15000, Math.pow(2, attempt + 1) * 1000); // 최소 15초
      console.warn(`  ⏳ 속도 제한 - ${waitMs / 1000}초 후 재시도 (${attempt + 1}/${MAX_RETRIES})`);
      await delay(waitMs);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API 오류 (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as GeminiEmbeddingResponse;

    if (!result.embeddings?.length) {
      throw new Error('Gemini API 응답에 임베딩이 없습니다.');
    }

    return result.embeddings.map((e) => e.values);
  }

  throw new Error('Gemini API 최대 재시도 횟수 초과');
}
