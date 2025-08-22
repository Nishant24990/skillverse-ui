import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standard React + Vite config
export default defineConfig({
  plugins: [react()],
  server: { host: true }
})
