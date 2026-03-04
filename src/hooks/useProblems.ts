import { useState, useCallback } from 'react';
import {
  generateProblems,
  getProblems,
} from '../services/problems';
import type { Problem } from '../types';

/** 문제 관리 훅 */
export function useProblems(academyId: string | null) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 문제 목록 조회 */
  const fetchProblems = useCallback(
    async (filters?: {
      grade?: string;
      topic?: string;
      difficulty?: string;
    }) => {
      if (!academyId) return;
      setLoading(true);
      try {
        const data = await getProblems(academyId, filters);
        setProblems(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '문제 목록을 불러오지 못했습니다.'
        );
      } finally {
        setLoading(false);
      }
    },
    [academyId]
  );

  /** AI 문제 생성 (세부 성취기준 선택 가능) */
  const generate = useCallback(
    async (
      grade: string,
      topic: string,
      difficulty: string,
      count: number,
      subTopic?: string
    ) => {
      setGenerating(true);
      try {
        /** generateProblems → generateProblemsWithRAG가 이미 DB 저장 수행 */
        const generated = await generateProblems(
          grade,
          topic,
          difficulty,
          count,
          subTopic
        );
        setProblems((prev) => [...generated, ...prev]);
        return generated;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '문제 생성에 실패했습니다.'
        );
        return [];
      } finally {
        setGenerating(false);
      }
    },
    [academyId]
  );

  return { problems, loading, generating, error, fetchProblems, generate };
}
