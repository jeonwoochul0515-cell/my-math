import { supabase } from '../../config/supabase';
import type { AIReport, WeaknessReport } from '../../types';

/** 단원별 풀이 데이터 (API 전송용) */
export interface SolveData {
  topic: string;
  total: number;
  correct: number;
  recentErrors: string[];
}

/** 캐시된 AI 리포트를 DB에서 조회 (24시간 유효) */
export async function fetchCachedReport(studentId: string): Promise<AIReport | null> {
  const { data, error } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('student_id', studentId)
    .eq('report_type', 'parent_analysis')
    .gt('valid_until', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string,
    studentId: data.student_id as string,
    reportType: data.report_type as AIReport['reportType'],
    content: data.content as string,
    data: (data.data ?? {}) as Record<string, unknown>,
    validUntil: data.valid_until ? new Date(data.valid_until as string) : null,
    createdAt: new Date(data.created_at as string),
  };
}

/** AI 리포트를 DB에 저장 (유효기간 24시간) */
export async function saveReport(studentId: string, content: string, solveData: SolveData[]): Promise<void> {
  const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await supabase.from('ai_reports').insert({
    student_id: studentId,
    report_type: 'parent_analysis',
    content,
    data: { solveData },
    valid_until: validUntil.toISOString(),
  });
}

/** API를 호출하여 AI 리포트를 생성하고 DB에 캐시 저장 */
export async function requestAIReport(
  studentId: string,
  studentName: string,
  grade: string,
  solveData: SolveData[]
): Promise<string> {
  const res = await fetch('/api/analyze-weakness', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ solveData, reportType: 'parent_analysis', studentName, grade }),
  });
  if (!res.ok) throw new Error('AI 분석 요청에 실패했습니다.');
  const result = (await res.json()) as { report: string };
  await saveReport(studentId, result.report, solveData);
  return result.report;
}

/** WeaknessReport 배열을 SolveData 배열로 변환 */
export function toSolveData(reports: WeaknessReport[]): SolveData[] {
  return reports.map((r) => ({
    topic: r.topic,
    total: r.totalProblems,
    correct: r.correctCount,
    recentErrors: [],
  }));
}

/** 시간 경과 표시 (예: "3시간 전 분석") */
export function formatAge(date: Date): string {
  const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (hours < 1) return '방금 전 분석';
  return `${String(hours)}시간 전 분석`;
}

/** AI 리포트 텍스트를 섹션별로 렌더링하는 서브 컴포넌트 */
export function ReportContent({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-sm leading-relaxed text-gray-700">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;
        /** 섹션 헤더 감지 (이모지 시작) */
        if (/^[📊💪📝🎯📋]/.test(trimmed)) {
          return <h4 key={idx} className="mt-4 text-base font-semibold text-gray-900">{trimmed}</h4>;
        }
        return <p key={idx}>{trimmed}</p>;
      })}
    </div>
  );
}
