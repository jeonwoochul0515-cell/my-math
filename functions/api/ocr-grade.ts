/** OCR 채점 API — Claude Vision으로 손글씨 답안 인식 및 오답 분석 */

interface Env {
  ANTHROPIC_API_KEY: string;
}

/** 채점 대상 문제 */
interface ProblemInput {
  id: string;
  content: string;
  answer: string;
  choices: string[];
  topic: string;
}

interface RequestBody {
  image: string;       // base64 인코딩된 이미지 (jpeg/png)
  problems: ProblemInput[];
  studentId: string;
}

/** 개별 문제 채점 결과 */
interface GradeResult {
  problemId: string;
  recognizedAnswer: string;
  isCorrect: boolean;
  errorAnalysis: string | null;
  weakTopics: string[];
  confidence: number;
}

/** Claude API 응답 타입 */
interface ClaudeResponse {
  content: { type: string; text: string }[];
}

/** OCR 인식 결과 (Claude Vision 응답 파싱용) */
interface OcrRecognition {
  problemId: string;
  recognizedAnswer: string;
  confidence: number;
}

/** 오답 분석 Claude 응답 파싱용 */
interface ErrorAnalysisResponse {
  cause: string;
  detail: string;
  weakTopics: string[];
}

const HEADERS = { 'Content-Type': 'application/json' };

/** Claude Vision API 호출 — 이미지 + 텍스트 프롬프트 전송 */
async function callClaudeVision(
  apiKey: string,
  imageBase64: string,
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
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Claude Vision API 오류 (${String(res.status)}): ${detail}`);
  }

  const data = (await res.json()) as ClaudeResponse;
  if (!data.content || data.content.length === 0) {
    throw new Error('Claude Vision API가 빈 응답을 반환했습니다.');
  }

  let text = data.content[0]?.text ?? '';
  /** 코드블록 감싸기 제거 */
  text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  return text;
}

/** Claude API 호출 헬퍼 (텍스트 전용 — 오답 분석용) */
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
  text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  return text;
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
    const { image, problems, studentId } = body;

    /** 입력 검증 */
    if (!image || !problems?.length || !studentId) {
      return new Response(JSON.stringify({ error: '이미지, 문제 목록, 학생 ID가 필요합니다.' }), {
        status: 400, headers: HEADERS,
      });
    }

    // =================================================================
    // STEP 1: Claude Vision으로 손글씨 답안 인식
    // =================================================================
    const problemListText = problems
      .map((p, i) => `[문제 ${String(i + 1)}] (ID: ${p.id})\n${p.content}\n보기: ${p.choices.map((c, j) => `${String(j + 1)}) ${c}`).join(' / ')}`)
      .join('\n\n');

    const ocrPrompt = `당신은 한국 학생의 수학 시험 답안지를 인식하는 전문가입니다.

아래 이미지는 학생이 손으로 작성한 수학 시험 답안지입니다.
각 문제에 대한 학생의 답을 인식하세요.

문제 목록:
${problemListText}

규칙:
- 학생이 작성한 답을 보기 번호(1,2,3,4) 또는 보기 내용으로 인식하세요.
- 답이 보기 번호인 경우, 해당하는 보기 내용으로 변환하세요.
- 인식이 불확실한 경우 confidence를 낮추세요 (0.0~1.0).
- 답을 작성하지 않은 문제는 recognizedAnswer를 빈 문자열로 하세요.

반드시 아래 JSON 형식으로만 응답하세요:
[
  {
    "problemId": "문제 ID",
    "recognizedAnswer": "인식된 답 (보기 내용과 동일하게)",
    "confidence": 0.95
  }
]`;

    const ocrText = await callClaudeVision(ANTHROPIC_API_KEY, image, ocrPrompt, 2048);

    /** OCR 결과 파싱 */
    let ocrResults: OcrRecognition[];
    try {
      const parsed = JSON.parse(ocrText) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error('OCR 응답이 배열이 아닙니다.');
      }
      ocrResults = parsed as OcrRecognition[];
    } catch {
      return new Response(JSON.stringify({ error: 'OCR 결과 파싱에 실패했습니다. 이미지를 다시 촬영해주세요.' }), {
        status: 422, headers: HEADERS,
      });
    }

    // =================================================================
    // STEP 2: 정오답 판정 및 오답 문제 수집
    // =================================================================
    /** 문제 ID → 문제 데이터 매핑 */
    const problemMap = new Map<string, ProblemInput>();
    for (const p of problems) {
      problemMap.set(p.id, p);
    }

    /** 오답 문제 목록 (2차 분석 대상) */
    interface WrongAnswer {
      problemId: string;
      problem: ProblemInput;
      recognizedAnswer: string;
      confidence: number;
    }

    const wrongAnswers: WrongAnswer[] = [];
    const resultsMap = new Map<string, GradeResult>();

    for (const ocr of ocrResults) {
      const problem = problemMap.get(ocr.problemId);
      if (!problem) continue;

      const isCorrect = ocr.recognizedAnswer === problem.answer;

      resultsMap.set(ocr.problemId, {
        problemId: ocr.problemId,
        recognizedAnswer: ocr.recognizedAnswer,
        isCorrect,
        errorAnalysis: null,
        weakTopics: [],
        confidence: ocr.confidence,
      });

      if (!isCorrect && ocr.recognizedAnswer !== '') {
        wrongAnswers.push({
          problemId: ocr.problemId,
          problem,
          recognizedAnswer: ocr.recognizedAnswer,
          confidence: ocr.confidence,
        });
      }
    }

    // =================================================================
    // STEP 3: 오답에 대한 오류 분석 (2차 Claude 호출)
    // =================================================================
    if (wrongAnswers.length > 0) {
      /** 오답 분석을 병렬로 처리 */
      const analysisPromises = wrongAnswers.map(async (wa) => {
        const analysisPrompt = `당신은 한국 수학 교육 전문가입니다.
학생의 오답을 분석하여 틀린 원인과 취약한 단원을 파악하세요.

문제: ${wa.problem.content}
보기: ${wa.problem.choices.map((c, j) => `${String(j + 1)}) ${c}`).join(' / ')}
정답: ${wa.problem.answer}
학생의 답: ${wa.recognizedAnswer}
단원: ${wa.problem.topic}

분석 항목:
1. 학생이 왜 이 답을 선택했는지 원인을 추론하세요.
2. 이 실수가 드러내는 취약한 개념/단원을 나열하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "cause": "오답 원인 (한 문장)",
  "detail": "상세 분석 (2-3문장)",
  "weakTopics": ["취약 단원1", "취약 단원2"]
}`;

        try {
          const analysisText = await callClaude(ANTHROPIC_API_KEY, analysisPrompt, 1024);
          const analysis = JSON.parse(analysisText) as ErrorAnalysisResponse;

          const result = resultsMap.get(wa.problemId);
          if (result) {
            result.errorAnalysis = `${analysis.cause} — ${analysis.detail}`;
            result.weakTopics = analysis.weakTopics;
          }
        } catch {
          /** 개별 오답 분석 실패 시 해당 문제만 분석 없이 반환 */
          const result = resultsMap.get(wa.problemId);
          if (result) {
            result.errorAnalysis = '오답 분석을 수행할 수 없었습니다.';
            result.weakTopics = [wa.problem.topic];
          }
        }
      });

      await Promise.all(analysisPromises);
    }

    // =================================================================
    // STEP 4: 결과 조합 및 반환
    // =================================================================
    /** 원래 문제 순서대로 결과 정렬 */
    const results: GradeResult[] = problems
      .map((p) => resultsMap.get(p.id))
      .filter((r): r is GradeResult => r !== undefined);

    return new Response(JSON.stringify({ results }), {
      status: 200, headers: HEADERS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: HEADERS,
    });
  }
};
