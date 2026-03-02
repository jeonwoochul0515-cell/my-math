/**
 * Voyage AI Embeddings API 래퍼
 * Gemini 대신 Voyage AI를 사용하여 텍스트 벡터화
 *
 * - 모델: voyage-3 (최대 1024차원, 768차원으로 설정)
 * - 배치: 최대 128개/요청
 * - 무료 티어: 200M 토큰
 */

/** Voyage AI 임베딩 응답 타입 */
interface VoyageEmbeddingResponse {
  object: string;
  data: { object: string; embedding: number[]; index: number }[];
  model: string;
  usage: { total_tokens: number };
}

/** 지연 함수 (속도 제한 대기용) */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 텍스트 배열을 Voyage AI voyage-3로 벡터화
 * - 최대 128개/요청
 * - 429 응답 시 지수 백오프 재시도 (최대 5회)
 *
 * @param texts - 임베딩할 텍스트 배열
 * @param apiKey - Voyage AI API 키
 * @returns 1024차원 벡터 배열
 */
export async function batchEmbed(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const url = 'https://api.voyageai.com/v1/embeddings';

  const body = JSON.stringify({
    input: texts,
    model: 'voyage-3',
  });

  /** 지수 백오프 재시도 */
  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });

    /** 429 (속도 제한) 시 대기 후 재시도 */
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const waitMs = Math.pow(2, attempt + 1) * 1000; // 2초 → 4초 → 8초 → 16초 → 32초
      console.warn(`  ⏳ 속도 제한 - ${waitMs / 1000}초 후 재시도 (${attempt + 1}/${MAX_RETRIES})`);
      await delay(waitMs);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voyage AI API 오류 (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as VoyageEmbeddingResponse;

    if (!result.data?.length) {
      throw new Error('Voyage AI API 응답에 임베딩이 없습니다.');
    }

    /** index 순으로 정렬하여 입력 순서와 동일하게 반환 */
    const sorted = result.data.sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  }

  throw new Error('Voyage AI API 최대 재시도 횟수 초과');
}
