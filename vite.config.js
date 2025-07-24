import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/GetChatbotResponse': {
        target: 'http://20.124.64.147:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
