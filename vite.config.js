import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'app',
  base: '/kkiu-todo/',
  plugins: [react()],
  build: {
    outDir: '..',
    emptyOutDir: false,
  },
})
