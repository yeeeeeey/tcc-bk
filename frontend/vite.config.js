import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Em desenvolvimento o Vite repassa /api para o backend local. Assim site e API
// ficam na mesma origem (igual à Vercel), o cookie de sessão funciona sem CORS
// e a navegação por URL (/login, /app/produtos...) cai no index.html.
const proxy = {
  '/api': { target: 'http://localhost:3000', changeOrigin: false },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
})
