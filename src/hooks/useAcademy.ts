import { useState, useEffect, useCallback } from 'react';
import {
  getAcademy,
  createAcademy,
  updateAcademy,
} from '../services/academy';
import type { Academy } from '../types';

/** 학원 정보 훅 */
export function useAcademy(ownerId: string | null) {
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 학원 정보 로드 */
  useEffect(() => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getAcademy(ownerId)
      .then(setAcademy)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ownerId]);

  /** 학원 생성 */
  const create = useCallback(
    async (name: string) => {
      if (!ownerId) return;
      try {
        const newAcademy = await createAcademy(name, ownerId);
        setAcademy(newAcademy);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '학원 생성에 실패했습니다.'
        );
      }
    },
    [ownerId]
  );

  /** 학원 정보 수정 */
  const update = useCallback(
    async (updates: { name?: string }) => {
      if (!academy) return;
      try {
        await updateAcademy(academy.id, updates);
        setAcademy((prev) => (prev ? { ...prev, ...updates } : null));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '학원 정보 수정에 실패했습니다.'
        );
      }
    },
    [academy]
  );

  return { academy, loading, error, create, update };
}
