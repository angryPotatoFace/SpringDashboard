import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const githubPagesRepoName = 'SpringDashboard'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? `/${githubPagesRepoName}/` : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
}))
