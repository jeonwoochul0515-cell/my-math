/** 약점 분석 및 학부모 리포트 생성 API */

interface Env {
  ANTHROPIC_API_KEY: string;
}

/** 단원별 풀이 데이터 */
interface SolveData {
  topic: string;
  total: number;
  correct: number;
  recentErrors: string[];
}

interface RequestBody {
  solveData: SolveData[];
  reportType: 'weakness' | 'parent_analysis' | 'guidance_plan';
  studentName?: string;
  grade?: string;
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

  return data.content[0]?.text ?? '';
}

/** 단원별 학습 데이터를 텍스트로 변환 */
function formatSolveData(solveData: SolveData[]): string {
  return solveData
    .map((d) => {
      const accuracy = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
      const errorList = d.recentErrors.length > 0
        ? `\n  최근 오답 유형: ${d.recentErrors.join(', ')}`
        : '';
      return `- ${d.topic}: ${String(d.correct)}/${String(d.total)} 정답 (${String(accuracy)}%)${errorList}`;
    })
    .join('\n');
}

/** 리포트 유형별 프롬프트 생성 */
function buildPrompt(body: RequestBody, dataText: string): string {
  const { reportType, studentName, grade } = body;
  const studentInfo = studentName ? `학생 이름: ${studentName}` : '학생';
  const gradeInfo = grade ? `학년: ${grade}` : '';

  switch (reportType) {
    case 'weakness':
      return `당신은 한국 수학 교육 전문가입니다.
아래 학생의 단원별 학습 데이터를 분석하여 약점을 간결하게 정리하세요.

${studentInfo}
${gradeInfo}

학습 데이터:
${dataText}

규칙:
- 간결한 불릿 포인트(bullet point) 형태로 작성하세요.
- 정확도가 낮은 단원부터 우선 분석하세요.
- 최근 오답 유형에서 패턴을 찾으세요.
- 구체적이고 실행 가능한 조언을 포함하세요.
- 한국어로 작성하세요.
- 학생에게 직접 말하는 톤으로 작성하세요 ("~하세요", "~을 연습하면 좋겠어요").

형식 예시:
• **[단원명]** (정확도 XX%): 약점 설명 및 보완 방법
• ...`;

    case 'parent_analysis':
      return `당신은 세심하고 전문적인 수학 학원 원장님입니다.
아래 학생의 학습 데이터를 바탕으로 학부모님께 드리는 학습 분석 리포트를 작성하세요.

${studentInfo}
${gradeInfo}

학습 데이터:
${dataText}

규칙:
- 학부모님을 존댓말로 정중하게 대하세요.
- 따뜻하고 세심한 어조로 작성하되, 전문적인 분석을 포함하세요.
- 아이의 이름을 자연스럽게 사용하세요 (이름이 없으면 "자녀분"으로 표현).
- 부정적인 내용도 건설적으로 표현하세요.

반드시 아래 4개 섹션을 포함하세요:

📊 학습 현황 요약
- 전체적인 학습 상황을 한눈에 파악할 수 있게 요약

💪 강점
- 잘하고 있는 단원과 그 이유

📝 보완 필요 부분
- 추가 학습이 필요한 부분 (구체적으로)

🎯 학습 방향 제안
- 가정에서 도움을 줄 수 있는 방법 포함
- 학원에서의 보충 학습 계획`;

    case 'guidance_plan':
      return `당신은 한국 수학 교육 전문가이자 학습 코칭 전문가입니다.
아래 학생의 학습 데이터를 바탕으로 향후 1개월간의 상세한 학습 지도 계획을 수립하세요.

${studentInfo}
${gradeInfo}

학습 데이터:
${dataText}

규칙:
- 주차별(1~4주차)로 구체적인 학습 계획을 제시하세요.
- 각 주차마다 중점 단원, 학습 목표, 권장 문제 유형을 포함하세요.
- 약점 단원을 우선적으로 배치하되, 강점 단원도 유지 학습에 포함하세요.
- 난이도를 점진적으로 높이는 커리큘럼을 설계하세요.
- 한국어로 작성하세요.

형식:
## 1주차: [주제]
- **중점 단원**: ...
- **학습 목표**: ...
- **권장 활동**: ...
- **주의사항**: ...

(2~4주차도 동일 형식)

## 종합 학습 전략
- 전체 기간 동안의 핵심 전략 요약`;

    default:
      throw new Error(`지원하지 않는 리포트 유형입니다: ${String(reportType)}`);
  }
}

/** 리포트 유형별 최대 토큰 수 */
function getMaxTokens(reportType: string): number {
  switch (reportType) {
    case 'weakness':
      return 1024;
    case 'parent_analysis':
      return 2048;
    case 'guidance_plan':
      return 3072;
    default:
      return 1024;
  }
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
    const { solveData, reportType } = body;

    /** 입력 검증 */
    if (!solveData?.length) {
      return new Response(JSON.stringify({ error: '학습 데이터가 필요합니다.' }), {
        status: 400, headers: HEADERS,
      });
    }

    const validReportTypes = ['weakness', 'parent_analysis', 'guidance_plan'];
    if (!validReportTypes.includes(reportType)) {
      return new Response(JSON.stringify({ error: `유효하지 않은 리포트 유형입니다. 가능한 값: ${validReportTypes.join(', ')}` }), {
        status: 400, headers: HEADERS,
      });
    }

    /** 학습 데이터를 텍스트로 변환 */
    const dataText = formatSolveData(solveData);

    /** 리포트 유형별 프롬프트 구성 */
    const prompt = buildPrompt(body, dataText);
    const maxTokens = getMaxTokens(reportType);

    /** Claude API 호출 */
    const report = await callClaude(ANTHROPIC_API_KEY, prompt, maxTokens);

    return new Response(JSON.stringify({ report }), {
      status: 200, headers: HEADERS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: HEADERS,
    });
  }
};
