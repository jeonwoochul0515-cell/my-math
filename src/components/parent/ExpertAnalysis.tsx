import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, BookOpen, Clock } from 'lucide-react';
import { useParentContext } from '../../context/ParentContext';
import { getSolveLogs, getProblems } from '../../services/problems';
import { analyzeWeakness } from '../../services/analytics';
import type { WeaknessReport } from '../../types';
import {
  fetchCachedReport, requestAIReport, toSolveData, formatAge, ReportContent,
} from './ExpertAnalysisHelpers';

/** 전문가 학습 분석 페이지 — AI 기반 학부모 리포트 */
export default function ExpertAnalysis() {
  const { children, selectedChild, setSelectedChild } = useParentContext();
  const [reports, setReports] = useState<WeaknessReport[]>([]);
  const [aiContent, setAiContent] = useState<string | null>(null);
  const [reportAge, setReportAge] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /** 데이터 로드 + 캐시 확인 + 필요시 AI 생성 */
  const loadAnalysis = useCallback(async (forceRefresh = false) => {
    if (!selectedChild) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [logs, problems] = await Promise.all([
        getSolveLogs(selectedChild.id),
        getProblems(selectedChild.academyId),
      ]);

      /** topicMap 구성: problemId → topic */
      const topicMap = new Map<string, string>();
      for (const p of problems) topicMap.set(p.id, p.topic);

      const topicReports = analyzeWeakness(logs, topicMap);
      setReports(topicReports.slice(0, 5));

      /** 풀이 기록 없으면 빈 상태 표시 */
      if (logs.length === 0) {
        setAiContent(null);
        setReportAge(null);
        setLoading(false);
        return;
      }

      /** 캐시된 리포트 확인 (새로고침이 아닌 경우만) */
      if (!forceRefresh) {
        const cached = await fetchCachedReport(selectedChild.id);
        if (cached) {
          setAiContent(cached.content);
          setReportAge(formatAge(cached.createdAt));
          setLoading(false);
          return;
        }
      }

      /** AI 리포트 생성 */
      setGenerating(true);
      const content = await requestAIReport(
        selectedChild.id, selectedChild.name, selectedChild.grade,
        toSolveData(topicReports),
      );
      setAiContent(content);
      setReportAge('방금 전 분석');
    } catch {
      setErrorMsg('학습 분석 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }, [selectedChild]);

  useEffect(() => { void loadAnalysis(); }, [loadAnalysis]);

  /** 분석 새로고침 */
  const handleRefresh = async () => {
    setGenerating(true);
    await loadAnalysis(true);
  };

  /** 정답률에 따른 막대 색상 */
  const getBarColor = (acc: number): string => {
    if (acc >= 80) return 'bg-green-500';
    if (acc >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!selectedChild) {
    return <p className="py-16 text-center text-gray-400">먼저 홈에서 로그인해주세요.</p>;
  }

  return (
    <div className="space-y-6">
      {/* 헤더 + 자녀 선택 — 모바일에서 세로 배치 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900">전문가 학습 분석</h2>
          <p className="mt-1 text-sm text-gray-500 truncate">{selectedChild.name} 학생의 AI 학습 분석 리포트</p>
        </div>
        {children.length > 1 && (
          <select
            value={selectedChild.id}
            onChange={(e) => {
              const c = children.find((ch) => ch.id === e.target.value);
              if (c) setSelectedChild(c);
            }}
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* AI 분석 카드 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">AI 전문가 분석</h3>
          </div>
          {reportAge && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" /> {reportAge}
            </span>
          )}
        </div>

        {loading || generating ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-sm text-gray-500">AI가 학습 데이터를 분석하고 있습니다...</p>
          </div>
        ) : errorMsg ? (
          <p className="py-8 text-center text-sm text-red-500">{errorMsg}</p>
        ) : !aiContent ? (
          <p className="py-8 text-center text-sm text-gray-400">자녀의 풀이 기록이 아직 없습니다.</p>
        ) : (
          <ReportContent text={aiContent} />
        )}
      </div>

      {/* 단원별 정답률 요약 (최대 5개) */}
      {!loading && reports.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">단원별 정답률</h3>
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.topic} className="flex items-center gap-2 sm:gap-3">
                <div className="w-20 shrink-0 sm:w-32">
                  <span className="block truncate text-sm text-gray-700">{r.topic}</span>
                  {r.subTopic && <div className="truncate text-xs text-gray-400">{r.subTopic}</div>}
                </div>
                <div className="h-2.5 flex-1 rounded-full bg-gray-100">
                  <div
                    className={`h-2.5 rounded-full ${getBarColor(r.accuracy)}`}
                    style={{ width: `${String(r.accuracy)}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm font-medium text-gray-600 sm:w-12">{r.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 분석 새로고침 버튼 */}
      {!loading && aiContent && (
        <button
          onClick={() => { void handleRefresh(); }}
          disabled={generating}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          분석 새로고침
        </button>
      )}
    </div>
  );
}
