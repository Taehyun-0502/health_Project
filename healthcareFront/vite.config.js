import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // PORT 환경변수 지정 시 해당 포트 사용 (기본 5173 유지) - 5173이 이미 떠 있을 때 검증용 서버 병행 실행 지원
  server: { port: Number(process.env.PORT) || 5173 },
})
