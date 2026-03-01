import type { SolveLog, WeaknessReport } from '../types';

/** 단원별 약점 분석 */
export function analyzeWeakness(
  solveLogs: SolveLog[],
  topicMap: Map<string, string>
): WeaknessReport[] {
  /** 단원별 통계를 누적할 맵 */
  const topicStats = new Map<
    string,
    { total: number; correct: number }
  >();

  for (const log of solveLogs) {
    const topic = topicMap.get(log.problemId) ?? '기타';
    const stats = topicStats.get(topic) ?? { total: 0, correct: 0 };
    stats.total += 1;
    if (log.isCorrect) stats.correct += 1;
    topicStats.set(topic, stats);
  }

  /** 분석 결과 배열 생성 */
  const reports: WeaknessReport[] = [];
  for (const [topic, stats] of topicStats) {
    const accuracy = Math.round((stats.correct / stats.total) * 100);
    let recommendation = '';
    if (accuracy < 60) {
      recommendation = '기초 개념부터 다시 학습이 필요합니다.';
    } else if (accuracy < 80) {
      recommendation = '추가 연습 문제를 풀어보세요.';
    } else {
      recommendation = '잘하고 있습니다! 심화 문제에 도전해보세요.';
    }

    reports.push({
      topic,
      accuracy,
      totalProblems: stats.total,
      correctCount: stats.correct,
      recommendation,
    });
  }

  /** 정확도 낮은 순으로 정렬 (약점 우선) */
  return reports.sort((a, b) => a.accuracy - b.accuracy);
}
