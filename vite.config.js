import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 번들 크기 최적화
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
          supabase: ['@supabase/supabase-js']
        }
      }
    },
    // 압축 최적화
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 프로덕션에서 console.log 제거
        drop_debugger: true,
      },
    },
    // 청크 크기 경고 임계값 증가
    chunkSizeWarningLimit: 1000,
  },
  // 개발 서버 최적화
  server: {
    hmr: {
      overlay: true, // 에러 오버레이 활성화
    },
    host: true, // 네트워크 접근 허용
    port: 5173, // 기본 포트
    strictPort: false, // 포트 사용 중일 때 다음 포트 시도
    open: true, // 서버 시작 시 브라우저 자동 실행
    cors: true, // CORS 활성화
    proxy: {
      // Supabase API 프록시 설정
      '/api': {
        target: process.env.VITE_SUPABASE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    },
    watch: {
      usePolling: true, // Windows에서 파일 변경 감지 개선
    }
  },
  // 의존성 사전 번들링 최적화
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', '@supabase/supabase-js'],
  },
  // 테스트 설정
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
})
