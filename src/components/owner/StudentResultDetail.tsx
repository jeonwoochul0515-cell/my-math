import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { supabase } from '../../config/supabase';
import Loading from '../common/Loading';
import MathText from '../common/MathText';

/** 컴포넌트 Props */
interface Props {
  studentId: string;
  studentName: string;
  onBack: () => void;
  onGenerateWeakness: (topics: string[]) => void;
}

/** 문제별 결과 데이터 */
interface ProblemResult {
  problemId: string;
  content: string;
  topic: string;
  correctAnswer: string;
  studentAnswer: string;
  isCorrect: boolean;
  errorAnalysis: string | null;
}

/** 단원별 정답률 데이터 (차트용) */
interface TopicAccuracy {
  topic: string;
  정답률: number;
  total: number;
  correct: number;
}

/** 학생 채점 상세 보기 — 문제별 결과, 단원별 정답률 차트 */
export default function StudentResultDetail({ studentId, studentName, onBack, onGenerateWeakness }: Props) {
  const [results, setResults] = useState<ProblemResult[]>([]);
  const [topicData, setTopicData] = useState<TopicAccuracy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /** 데이터 로드 */
  useEffect(() => {
    loadResults();
  }, [studentId]);

  /** 풀이 기록 + 문제 정보 로드 */
  async function loadResults() {
    setLoading(true);
    setError(null);
    try {
      /** solve_logs에서 학생 풀이 기록 가져오기 */
      const { data: logs, error: logErr } = await supabase
        .from('solve_logs')
        .select('problem_id, answer, is_correct')
        .eq('student_id', studentId)
        .order('solved_at', { ascending: false });
      if (logErr) throw new Error(logErr.message);

      if (!logs || logs.length === 0) {
        setResults([]);
        setTopicData([]);
        setLoading(false);
        return;
      }

      /** 문제 ID 목록으로 generated_problems에서 문제 정보 가져오기 */
      const problemIds = [...new Set(logs.map((l) => l.problem_id as string))];
      const { data: problems, error: probErr } = await supabase
        .from('generated_problems')
        .select('id, content, answer, topic')
        .in('id', problemIds);
      if (probErr) throw new Error(probErr.message);

      const probMap = new Map(
        (problems ?? []).map((p) => [p.id as string, p])
      );

      /** OCR 결과에서 오류 분석 가져오기 */
      const { data: ocrData } = await supabase
        .from('ocr_results')
        .select('problem_id, error_analysis')
        .eq('student_id', studentId);
      const ocrMap = new Map(
        (ocrData ?? []).map((o) => [o.problem_id as string, o.error_analysis as string | null])
      );

      /** 결과 조합 */
      const combined: ProblemResult[] = logs.map((log) => {
        const prob = probMap.get(log.problem_id as string);
        return {
          problemId: log.problem_id as string,
          content: (prob?.content as string) ?? '',
          topic: (prob?.topic as string) ?? '기타',
          correctAnswer: (prob?.answer as string) ?? '',
          studentAnswer: (log.answer as string) ?? '',
          isCorrect: log.is_correct as boolean,
          errorAnalysis: ocrMap.get(log.problem_id as string) ?? null,
        };
      });

      setResults(combined);

      /** 단원별 정답률 계산 */
      const topicAcc = new Map<string, { correct: number; total: number }>();
      for (const r of combined) {
        const entry = topicAcc.get(r.topic) ?? { correct: 0, total: 0 };
        entry.total += 1;
        if (r.isCorrect) entry.correct += 1;
        topicAcc.set(r.topic, entry);
      }

      const chartData: TopicAccuracy[] = Array.from(topicAcc.entries())
        .map(([topic, { correct, total }]) => ({
          topic,
          정답률: Math.round((correct / total) * 100),
          total,
          correct,
        }))
        .sort((a, b) => a.정답률 - b.정답률);

      setTopicData(chartData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Loading role="owner" message="채점 상세 결과를 불러오는 중..." />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> 뒤로
        </button>
        <div className="rounded-xl bg-red-50 p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const totalCount = results.length;
  const correctCount = results.filter((r) => r.isCorrect).length;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const weakTopics = topicData.filter((t) => t.정답률 < 60).map((t) => t.topic);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">{studentName} 채점 결과</h2>
      </div>

      {/* 요약 카드 */}
      <SummaryCards totalCount={totalCount} accuracy={accuracy} weakTopicCount={weakTopics.length} />

      {/* 단원별 정답률 차트 */}
      {topicData.length > 0 && <TopicChart data={topicData} />}

      {/* 문제별 결과 목록 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">문제별 결과</h3>
        {results.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">풀이 기록이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {results.map((r, i) => (
              <ProblemResultRow
                key={r.problemId + String(i)}
                index={i + 1}
                result={r}
                expanded={expandedId === r.problemId + String(i)}
                onToggle={() =>
                  setExpandedId(expandedId === r.problemId + String(i) ? null : r.problemId + String(i))
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* 약점 집중 문제 생성 버튼 */}
      {weakTopics.length > 0 && (
        <button
          onClick={() => onGenerateWeakness(weakTopics)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          약점 집중 문제 생성 ({weakTopics.join(', ')})
        </button>
      )}
    </div>
  );
}

/** 요약 카드 3개 */
function SummaryCards({ totalCount, accuracy, weakTopicCount }: {
  totalCount: number;
  accuracy: number;
  weakTopicCount: number;
}) {
  const accuracyColor = accuracy >= 80 ? 'text-green-600' : accuracy >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-xl bg-white p-4 shadow-sm text-center">
        <p className="text-2xl font-bold text-gray-900">{String(totalCount)}</p>
        <p className="text-xs text-gray-500">총 문제</p>
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm text-center">
        <p className={`text-2xl font-bold ${accuracyColor}`}>{String(accuracy)}%</p>
        <p className="text-xs text-gray-500">정답률</p>
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm text-center">
        <p className="text-2xl font-bold text-red-600">{String(weakTopicCount)}</p>
        <p className="text-xs text-gray-500">취약 단원</p>
      </div>
    </div>
  );
}

/** 단원별 정답률 가로 막대 차트 */
function TopicChart({ data }: { data: TopicAccuracy[] }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-base font-semibold text-gray-900">단원별 정답률</h3>
      <div style={{ height: Math.max(200, data.length * 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} unit="%" />
            <YAxis type="category" dataKey="topic" width={100} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${String(value)}%`, '정답률']} />
            <Bar dataKey="정답률" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.topic}
                  fill={entry.정답률 >= 80 ? '#16a34a' : entry.정답률 >= 60 ? '#ca8a04' : '#dc2626'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** 문제별 결과 행 */
function ProblemResultRow({ index, result, expanded, onToggle }: {
  index: number;
  result: ProblemResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const preview = result.content.length > 50 ? result.content.slice(0, 50) + '...' : result.content;

  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
          {String(index)}
        </span>
        {result.isCorrect ? (
          <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 shrink-0 text-red-500" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-gray-800">
            <MathText text={preview} />
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">{result.topic}</span>
            {!result.isCorrect && (
              <span className="text-xs text-gray-500">
                학생: {result.studentAnswer} / 정답: {result.correctAnswer}
              </span>
            )}
          </div>
        </div>
        {!result.isCorrect && result.errorAnalysis && (
          <button onClick={onToggle} className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>
      {expanded && result.errorAnalysis && (
        <div className="mt-3 ml-9 rounded-lg bg-red-50 p-3 text-xs text-red-700 leading-relaxed">
          {result.errorAnalysis}
        </div>
      )}
    </div>
  );
}
