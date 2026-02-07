import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Acessível na rede local (ex: http://192.168.x.x:5173)
    port: 5173,
  },
  preview: {
    host: true, // Build de produção acessível na rede (ex: http://192.168.x.x:4173)
    port: 4173,
  },
})
