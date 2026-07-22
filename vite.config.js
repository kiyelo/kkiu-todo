import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CAPACITOR_BUILD=1 vite build → relative base for the Android (Capacitor) WebView.
// Default build keeps the GitHub Pages base (/kkiu-todo/).
export default defineConfig({
  root: 'app',
  envDir: '..',
  base: process.env.CAPACITOR_BUILD ? './' : '/kkiu-todo/',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
