import { useEffect } from 'react';
import type { Academy } from '../types';

/** PWA manifest를 학원 정보에 맞게 동적 생성 */
export function useManifest(academy: Academy | null) {
  useEffect(() => {
    const manifest = {
      name: academy?.name ?? '마이매쓰',
      short_name: academy?.name ?? '마이매쓰',
      description: '소형 수학학원 관리 시스템',
      start_url: '/',
      display: 'standalone',
      background_color: '#f9fafb',
      theme_color: '#2563eb',
      icons: academy?.logoUrl
        ? [
            { src: academy.logoUrl, sizes: '192x192', type: 'image/png' },
            { src: academy.logoUrl, sizes: '512x512', type: 'image/png' },
          ]
        : [
            { src: '/vite.svg', sizes: '192x192', type: 'image/svg+xml' },
          ],
    };

    /** 기존 manifest link 제거 후 재생성 */
    const existing = document.querySelector('link[rel="manifest"]');
    if (existing) existing.remove();

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = url;
    document.head.appendChild(link);

    /** apple-touch-icon도 학원 로고로 설정 */
    if (academy?.logoUrl) {
      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = academy.logoUrl;
    }

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [academy?.name, academy?.logoUrl]);
}
