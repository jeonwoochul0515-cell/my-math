import type { SolveLog } from '../types';

/** 풀이 기록에서 정답률 계산 (퍼센트) */
export function calculateAccuracy(logs: SolveLog[]): number {
  if (logs.length === 0) return 0;
  const correctCount = logs.filter((log) => log.isCorrect).length;
  return Math.round((correctCount / logs.length) * 100);
}

/** 단원별 정답률 계산 */
export function calculateTopicAccuracy(
  logs: SolveLog[],
  topicMap: Map<string, string>
): Map<string, { total: number; correct: number; accuracy: number }> {
  const result = new Map<string, { total: number; correct: number; accuracy: number }>();

  for (const log of logs) {
    const topic = topicMap.get(log.problemId) ?? '기타';
    const current = result.get(topic) ?? { total: 0, correct: 0, accuracy: 0 };
    current.total += 1;
    if (log.isCorrect) current.correct += 1;
    current.accuracy = Math.round((current.correct / current.total) * 100);
    result.set(topic, current);
  }

  return result;
}

/** 총점 계산 (맞은 문제 수 * 배점) */
export function calculateTotalScore(logs: SolveLog[], pointsPerProblem: number): number {
  const correctCount = logs.filter((log) => log.isCorrect).length;
  return correctCount * pointsPerProblem;
}
