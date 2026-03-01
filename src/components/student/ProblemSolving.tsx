import { useState } from 'react';
import { CheckCircle, XCircle, ArrowRight, Lightbulb } from 'lucide-react';
import type { Problem } from '../../types';

/** 목 문제 데이터 */
const MOCK_PROBLEM: Problem = {
  id: 'mock-1',
  content: 'x\u00B2 + 5x + 6 = 0\uC758 \uB450 \uADFC\uC758 \uD569\uC740?',
  choices: ['\u22125', '5', '6', '\u22126'],
  answer: '\u22125',
  solution:
    '\uADFC\uACFC \uACC4\uC218\uC758 \uAD00\uACC4\uC5D0 \uC758\uD574 \uB450 \uADFC\uC758 \uD569\uC740 -b/a = -5/1 = -5\uC785\uB2C8\uB2E4.',
  difficulty: 'medium',
  topic: '\uC774\uCC28\uBC29\uC815\uC2DD',
  grade: '\uC9113',
  source: 'ai-generated',
};

/** 선택지 라벨 배열 */
const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

/** 문제 풀기 페이지 - 수학 문제 표시 및 답안 제출 */
export default function ProblemSolving() {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const problem = MOCK_PROBLEM;

  /** 답안 제출 처리 */
  const handleSubmit = () => {
    if (!selectedAnswer) return;
    setIsCorrect(selectedAnswer === problem.answer);
    setIsSubmitted(true);
  };

  /** 다음 문제로 이동 (현재는 상태 리셋) */
  const handleNext = () => {
    setSelectedAnswer(null);
    setIsSubmitted(false);
    setIsCorrect(false);
  };

  /** 선택지 버튼 스타일 계산 */
  const getChoiceStyle = (choice: string): string => {
    const base =
      'flex items-center gap-3 w-full rounded-xl border-2 p-4 text-left text-base font-medium transition-all';

    if (isSubmitted) {
      if (choice === problem.answer) return `${base} border-green-500 bg-green-50 text-green-800`;
      if (choice === selectedAnswer) return `${base} border-red-500 bg-red-50 text-red-800`;
      return `${base} border-gray-200 bg-gray-50 text-gray-400`;
    }

    if (choice === selectedAnswer) return `${base} border-indigo-600 bg-indigo-50 text-indigo-800`;
    return `${base} border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50`;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 문제 헤더 */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-700">
          {problem.topic}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
          {problem.difficulty === 'easy' ? '쉬움' : problem.difficulty === 'medium' ? '보통' : '어려움'}
        </span>
      </div>

      {/* 문제 내용 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-lg font-semibold text-gray-900 leading-relaxed">{problem.content}</p>
      </div>

      {/* 선택지 */}
      <div className="space-y-3">
        {problem.choices.map((choice, index) => (
          <button
            key={choice}
            onClick={() => !isSubmitted && setSelectedAnswer(choice)}
            disabled={isSubmitted}
            className={getChoiceStyle(choice)}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold">
              {CHOICE_LABELS[index]}
            </span>
            <span>{choice}</span>
          </button>
        ))}
      </div>

      {/* 제출 / 다음 문제 버튼 */}
      {!isSubmitted ? (
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer}
          className="w-full rounded-xl bg-indigo-600 py-4 text-base font-bold text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          제출
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 text-base font-bold text-white transition-colors hover:bg-indigo-700"
        >
          <span>다음 문제</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      )}

      {/* 정오답 피드백 */}
      {isSubmitted && (
        <div className={`rounded-xl p-5 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600" />
            )}
            <span className={`text-lg font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '정답입니다!' : '오답입니다'}
            </span>
          </div>

          {/* 풀이 설명 */}
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-white p-4">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-gray-700">풀이 해설</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{problem.solution}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
