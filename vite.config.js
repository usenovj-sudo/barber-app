import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Название приложения для PWA зависит от VITE_APP (тот же репозиторий,
// два проекта Netlify: барбер и beauty).
const isBeauty = process.env.VITE_APP === 'beauty'

const appManifest = isBeauty
  ? {
      name: 'Beauty Booking — Казахстан',
      short_name: 'Beauty',
      description: 'Запись к мастеру красоты онлайн',
      theme_color: '#e11d48',
    }
  : {
      name: 'BarberBook — запись к парикмахеру',
      short_name: 'BarberBook',
      description: 'Запись к парикмахеру онлайн',
      theme_color: '#1a1a2e',
    }

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        ...appManifest,
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
