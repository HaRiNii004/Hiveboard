import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false
      },
      // STOMP over WebSocket (real-time board updates, presence, cursors).
      // Origin is kept as the dev server's, which the backend allows (app.frontend-url).
      '/ws': {
        target: 'http://localhost:8081',
        ws: true
      }
    }
  }
})
