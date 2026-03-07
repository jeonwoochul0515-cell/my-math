import { supabase } from '../config/supabase';
import type { SolveLog, WeaknessReport } from '../types';
import { notifyWeaknessDetected } from './notifications';

/** 단원별 약점 분석 (subTopicMap이 있으면 세부 성취기준도 포함) */
export function analyzeWeakness(
  solveLogs: SolveLog[],
  topicMap: Map<string, string>,
  subTopicMap?: Map<string, string>
): WeaknessReport[] {
  /** 단원별 통계를 누적할 맵 */
  const topicStats = new Map<
    string,
    { total: number; correct: number }
  >();
  /** 단원별 subTopic 빈도 추적 (가장 빈번한 subTopic을 대표값으로 사용) */
  const topicSubTopicCount = new Map<string, Map<string, number>>();

  for (const log of solveLogs) {
    const topic = topicMap.get(log.problemId) ?? '기타';
    const stats = topicStats.get(topic) ?? { total: 0, correct: 0 };
    stats.total += 1;
    if (log.isCorrect) stats.correct += 1;
    topicStats.set(topic, stats);

    /** subTopic 빈도 집계 */
    if (subTopicMap) {
      const st = subTopicMap.get(log.problemId);
      if (st) {
        const countMap = topicSubTopicCount.get(topic) ?? new Map<string, number>();
        countMap.set(st, (countMap.get(st) ?? 0) + 1);
        topicSubTopicCount.set(topic, countMap);
      }
    }
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

    /** 해당 단원에서 가장 빈번한 subTopic을 대표값으로 선택 */
    let subTopic: string | undefined;
    const subTopicCounts = topicSubTopicCount.get(topic);
    if (subTopicCounts && subTopicCounts.size > 0) {
      let maxCount = 0;
      for (const [st, cnt] of subTopicCounts) {
        if (cnt > maxCount) {
          maxCount = cnt;
          subTopic = st;
        }
      }
    }

    reports.push({
      topic,
      subTopic,
      accuracy,
      totalProblems: stats.total,
      correctCount: stats.correct,
      recommendation,
    });
  }

  /** 정확도 낮은 순으로 정렬 (약점 우선) */
  return reports.sort((a, b) => a.accuracy - b.accuracy);
}

/** 상세 약점 분석 (AI 보고서 포함) */
export async function getDetailedWeaknessReport(studentId: string): Promise<{
  reports: WeaknessReport[];
  aiAnalysis: string | null;
}> {
  /** 1. 학생의 풀이 기록 조회 */
  const { data: logData, error: logError } = await supabase
    .from('solve_logs')
    .select('*')
    .eq('student_id', studentId)
    .order('solved_at', { ascending: false });
  if (logError)
    throw new Error('풀이 기록을 불러오지 못했습니다: ' + logError.message);

  const solveLogs: SolveLog[] = (logData ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      studentId: r.student_id as string,
      problemId: r.problem_id as string,
      answer: r.answer as string,
      isCorrect: r.is_correct as boolean,
      solvedAt: new Date(r.solved_at as string),
    };
  });

  if (solveLogs.length === 0) {
    return { reports: [], aiAnalysis: null };
  }

  /** 2. 관련 문제에서 단원 정보 추출 */
  const problemIds = [...new Set(solveLogs.map((l) => l.problemId))];
  const { data: problemData, error: problemError } = await supabase
    .from('generated_problems')
    .select('id, topic, sub_topic')
    .in('id', problemIds);
  if (problemError)
    throw new Error('문제 정보를 불러오지 못했습니다: ' + problemError.message);

  const topicMap = new Map<string, string>();
  /** 세부 성취기준 매핑 (subTopic) */
  const subTopicMap = new Map<string, string>();
  for (const row of problemData ?? []) {
    const r = row as Record<string, unknown>;
    topicMap.set(r.id as string, r.topic as string);
    if (r.sub_topic) {
      subTopicMap.set(r.id as string, r.sub_topic as string);
    }
  }

  /** 3. 기존 analyzeWeakness 호출 (subTopicMap 포함) */
  const reports = analyzeWeakness(solveLogs, topicMap, subTopicMap);

  /** 4. ai_reports 테이블에서 캐시된 보고서 확인 */
  const { data: cachedReport, error: cacheError } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('student_id', studentId)
    .eq('report_type', 'weakness')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cacheError)
    throw new Error('보고서 캐시 조회에 실패했습니다: ' + cacheError.message);

  /** 유효한 캐시가 있으면 반환 */
  if (cachedReport) {
    const cached = cachedReport as Record<string, unknown>;
    const validUntil = cached.valid_until
      ? new Date(cached.valid_until as string)
      : null;

    if (validUntil && validUntil > new Date()) {
      return {
        reports,
        aiAnalysis: cached.content as string,
      };
    }
  }

  /** 5. AI 분석 보고서 생성 요청 */
  try {
    const response = await fetch('/api/analyze-weakness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        reports,
        solveLogs: solveLogs.slice(0, 50),
        reportType: 'weakness',
      }),
    });

    if (!response.ok) {
      return { reports, aiAnalysis: null };
    }

    const aiData: { analysis: string } = await response.json();

    /** 6. 결과를 ai_reports에 캐시 (7일 유효) */
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    await supabase.from('ai_reports').insert({
      student_id: studentId,
      report_type: 'weakness',
      content: aiData.analysis,
      data: { reports },
      valid_until: validUntil.toISOString(),
    });

    return { reports, aiAnalysis: aiData.analysis };
  } catch {
    /** AI 분석 실패 시 기본 보고서만 반환 */
    return { reports, aiAnalysis: null };
  }
}

/**
 * 상세 약점 분석 + 약점 알림 전송
 * getDetailedWeaknessReport를 호출하고, 정확도 60% 미만 단원이 있으면 학부모에게 알림을 보낸다.
 *
 * @param studentId - 학생 UUID
 * @param studentName - 학생 이름 (알림 메시지용)
 * @param parentId - 학부모 Firebase UID
 */
export async function getWeaknessReportWithNotification(
  studentId: string,
  studentName: string,
  parentId: string
): Promise<{ reports: WeaknessReport[]; aiAnalysis: string | null }> {
  const result = await getDetailedWeaknessReport(studentId);

  /** 정확도 60% 미만인 약점 단원 필터 */
  const weakTopics = result.reports.filter((r) => r.accuracy < 60);

  if (weakTopics.length > 0) {
    /** 학부모 약점 알림 (비동기 — 실패해도 결과 반환) */
    notifyWeaknessDetected(studentId, studentName, parentId, weakTopics).catch(
      () => { /* 알림 실패 무시 */ }
    );
  }

  return result;
}

/** 학생 결과 요약 (원장용) — 모든 학생의 요약 */
export async function getStudentResultSummary(academyId: string): Promise<{
  id: string;
  name: string;
  grade: string;
  totalSolved: number;
  accuracy: number;
  weakTopics: string[];
  lastActivity: Date | null;
}[]> {
  /** 학원 소속 학생 목록 조회 */
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, grade')
    .eq('academy_id', academyId);
  if (studentsError)
    throw new Error('학생 목록을 불러오지 못했습니다: ' + studentsError.message);

  if (!students || students.length === 0) return [];

  const studentIds = students.map((s) => (s as Record<string, unknown>).id as string);

  /** 전체 풀이 기록 조회 */
  const { data: logData, error: logError } = await supabase
    .from('solve_logs')
    .select('*')
    .in('student_id', studentIds);
  if (logError)
    throw new Error('풀이 기록을 불러오지 못했습니다: ' + logError.message);

  /** 관련 문제 단원 조회 */
  const problemIds = [...new Set(
    (logData ?? []).map((l) => (l as Record<string, unknown>).problem_id as string)
  )];

  let topicMap = new Map<string, string>();
  if (problemIds.length > 0) {
    const { data: problemData, error: problemError } = await supabase
      .from('generated_problems')
      .select('id, topic')
      .in('id', problemIds);
    if (problemError)
      throw new Error('문제 정보를 불러오지 못했습니다: ' + problemError.message);

    topicMap = new Map<string, string>();
    for (const row of problemData ?? []) {
      const r = row as Record<string, unknown>;
      topicMap.set(r.id as string, r.topic as string);
    }
  }

  /** 학생별 집계 */
  return students.map((s) => {
    const row = s as Record<string, unknown>;
    const sid = row.id as string;

    const studentLogs = (logData ?? []).filter(
      (l) => (l as Record<string, unknown>).student_id === sid
    );
    const correctCount = studentLogs.filter(
      (l) => (l as Record<string, unknown>).is_correct === true
    ).length;
    const totalSolved = studentLogs.length;
    const accuracy =
      totalSolved > 0 ? Math.round((correctCount / totalSolved) * 100) : 0;

    /** 약점 단원 추출 (정확도 70% 미만인 단원) */
    const topicStats = new Map<string, { total: number; correct: number }>();
    for (const log of studentLogs) {
      const r = log as Record<string, unknown>;
      const topic = topicMap.get(r.problem_id as string) ?? '기타';
      const stats = topicStats.get(topic) ?? { total: 0, correct: 0 };
      stats.total += 1;
      if (r.is_correct === true) stats.correct += 1;
      topicStats.set(topic, stats);
    }

    const weakTopics: string[] = [];
    for (const [topic, stats] of topicStats) {
      const topicAccuracy = Math.round((stats.correct / stats.total) * 100);
      if (topicAccuracy < 70) {
        weakTopics.push(topic);
      }
    }

    /** 최근 활동 시간 */
    const solvedDates = studentLogs
      .map((l) => new Date((l as Record<string, unknown>).solved_at as string))
      .sort((a, b) => b.getTime() - a.getTime());
    const lastActivity = solvedDates.length > 0 ? solvedDates[0] : null;

    return {
      id: sid,
      name: row.name as string,
      grade: row.grade as string,
      totalSolved,
      accuracy,
      weakTopics,
      lastActivity,
    };
  });
}
