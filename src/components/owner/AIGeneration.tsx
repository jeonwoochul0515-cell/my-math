import { useState } from 'react';
import { Sparkles } from 'lucide-react';

/** 학년-단원 매핑 */
const CURRICULUM: Record<string, string[]> = {
  중1: ['자연수와 정수', '유리수', '일차방정식', '좌표와 그래프', '비례와 반비례', '기본 도형', '작도와 합동', '통계'],
  중2: ['유리수와 순환소수', '식의 계산', '일차부등식', '연립방정식', '일차함수', '삼각형과 사각형', '확률'],
  중3: ['제곱근과 실수', '다항식의 곱셈과 인수분해', '이차방정식', '이차함수', '삼각비', '원', '통계'],
  '수학(상)': ['다항식', '방정식과 부등식', '도형의 방정식'],
  '수학(하)': ['집합과 명제', '함수와 그래프', '경우의 수'],
  '수학I': ['지수와 로그', '삼각함수', '수열'],
  '수학II': ['함수의 극한과 연속', '미분', '적분'],
};

/** 난이도 옵션 */
const DIFFICULTIES = [
  { value: 'easy', label: '쉬움' },
  { value: 'medium', label: '보통' },
  { value: 'hard', label: '어려움' },
] as const;

/** 학년 목록 */
const GRADES = Object.keys(CURRICULUM);

/** AI 문제 생성 페이지 - 조건 설정 및 문제 미리보기 */
export default function AIGeneration() {
  const [grade, setGrade] = useState(GRADES[0]);
  const [topic, setTopic] = useState(CURRICULUM[GRADES[0]][0]);
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [count, setCount] = useState(5);

  /** 학년 변경 시 단원을 첫 번째로 초기화 */
  const handleGradeChange = (newGrade: string) => {
    setGrade(newGrade);
    setTopic(CURRICULUM[newGrade][0]);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">AI 문제 생성</h2>

      {/* 조건 입력 폼 */}
      <div className="rounded-xl bg-white p-5 shadow-sm space-y-4">
        {/* 학년 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
          <select
            value={grade}
            onChange={(e) => handleGradeChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* 단원 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">단원</label>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {CURRICULUM[grade].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* 난이도 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
          <div className="flex gap-4">
            {DIFFICULTIES.map((d) => (
              <label key={d.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="difficulty"
                  value={d.value}
                  checked={difficulty === d.value}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{d.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 문제 수 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">문제 수</label>
          <input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 생성 버튼 */}
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Sparkles className="h-4 w-4" />
          문제 생성
        </button>
      </div>

      {/* 생성된 문제 미리보기 (목업) */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          생성된 문제 미리보기
        </h3>
        <SampleProblem />
      </div>
    </div>
  );
}

/** 샘플 문제 미리보기 컴포넌트 */
function SampleProblem() {
  const choices = ['12', '15', '18', '21'];
  const answer = 'C';

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-gray-800">
        어떤 수의 3배에서 6을 뺀 값이 그 수의 2배보다 12 클 때, 어떤 수를 구하시오.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {choices.map((c, i) => {
          const label = String.fromCharCode(65 + i);
          return (
            <div
              key={label}
              className={`rounded-lg border px-3 py-2 text-sm ${
                label === answer
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              {label}. {c}
            </div>
          );
        })}
      </div>
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="text-xs font-medium text-gray-500 mb-1">정답: {answer}</p>
        <p className="text-xs text-gray-600 leading-relaxed">
          풀이: 어떤 수를 x라 하면, 3x - 6 = 2x + 12. x = 18. 따라서 정답은 18입니다.
        </p>
      </div>
    </div>
  );
}
