import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    /** jsxgraph(934KB)는 동적 import로 lazy 로드되므로 경고 억제 */
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          /** 대형 라이브러리를 별도 청크로 분리하여 캐싱 효율 향상 */
          if (id.includes('node_modules')) {
            if (id.includes('jsxgraph')) return 'vendor-jsxgraph';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-recharts';
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('katex')) return 'vendor-katex';
            if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
          }
        },
      },
    },
  },
})
