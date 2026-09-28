import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use a relative base for both web and Capacitor so the same build works at
// kkiu.3dayweekendlab.com/ and at the GitHub Pages repository path.
export default defineConfig({
  root: 'app',
  envDir: '..',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
