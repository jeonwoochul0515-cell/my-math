import { supabase } from '../config/supabase';
import type { OCRResult } from '../types';

/** DB row를 OCRResult 타입으로 변환 */
function toOCRResult(row: Record<string, unknown>): OCRResult {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    problemId: row.problem_id as string,
    assignmentId: (row.assignment_id as string) ?? null,
    recognizedAnswer: row.recognized_answer as string,
    correctAnswer: row.correct_answer as string,
    isCorrect: row.is_correct as boolean,
    errorAnalysis: (row.error_analysis as string) ?? null,
    weakTopics: (row.weak_topics as string[]) ?? [],
    confidence: row.confidence as number,
    createdAt: new Date(row.created_at as string),
  };
}

/** 이미지를 base64로 변환 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** OCR 채점 요청 — /api/ocr-grade 엔드포인트 호출 */
export async function gradeWithOCR(
  image: string,
  problems: { id: string; content: string; answer: string; choices: string[]; topic: string }[],
  studentId: string
): Promise<OCRResult[]> {
  const response = await fetch('/api/ocr-grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, problems, studentId }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error('OCR 채점 요청에 실패했습니다: ' + errorBody);
  }

  const data: { results: OCRResult[] } = await response.json();
  return data.results;
}

/** OCR 결과를 DB에 저장 + 오답노트 자동 수집 */
export async function saveOCRResults(
  studentId: string,
  results: OCRResult[],
  assignmentId?: string
): Promise<void> {
  /** 1. ocr_results 테이블에 저장 */
  const ocrRows = results.map((r) => ({
    student_id: studentId,
    problem_id: r.problemId,
    assignment_id: assignmentId ?? null,
    recognized_answer: r.recognizedAnswer,
    correct_answer: r.correctAnswer,
    is_correct: r.isCorrect,
    error_analysis: r.errorAnalysis,
    weak_topics: r.weakTopics,
    confidence: r.confidence,
  }));

  const { error: ocrError } = await supabase
    .from('ocr_results')
    .insert(ocrRows);
  if (ocrError)
    throw new Error('OCR 결과 저장에 실패했습니다: ' + ocrError.message);

  /** 2. 오답인 경우 wrong_answer_notes에 자동 수집 (중복 무시) */
  const wrongRows = results
    .filter((r) => !r.isCorrect)
    .map((r) => ({
      student_id: studentId,
      problem_id: r.problemId,
      original_answer: r.recognizedAnswer,
      correct_answer: r.correctAnswer,
      error_analysis: r.errorAnalysis,
      retry_count: 0,
      is_resolved: false,
    }));

  if (wrongRows.length > 0) {
    const { error: wrongError } = await supabase
      .from('wrong_answer_notes')
      .upsert(wrongRows, { onConflict: 'student_id,problem_id', ignoreDuplicates: true });
    if (wrongError)
      throw new Error('오답노트 자동 수집에 실패했습니다: ' + wrongError.message);
  }

  /** 3. 배부 과제가 있으면 상태를 'graded'로 업데이트 */
  if (assignmentId) {
    const { error: assignError } = await supabase
      .from('problem_assignments')
      .update({ status: 'graded' })
      .eq('id', assignmentId);
    if (assignError)
      throw new Error('과제 상태 업데이트에 실패했습니다: ' + assignError.message);
  }

  /** 4. solve_logs에 풀이 기록 생성 */
  const solveRows = results.map((r) => ({
    student_id: studentId,
    problem_id: r.problemId,
    answer: r.recognizedAnswer,
    is_correct: r.isCorrect,
  }));

  const { error: solveError } = await supabase
    .from('solve_logs')
    .insert(solveRows);
  if (solveError)
    throw new Error('풀이 기록 저장에 실패했습니다: ' + solveError.message);
}

/** 학생의 OCR 결과 조회 */
export async function getOCRResults(studentId: string): Promise<OCRResult[]> {
  const { data, error } = await supabase
    .from('ocr_results')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error)
    throw new Error('OCR 결과를 불러오지 못했습니다: ' + error.message);
  return (data ?? []).map(toOCRResult);
}
