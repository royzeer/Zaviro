/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Zaviro',
        short_name: 'Zaviro',
        description: 'Tu espacio personal de estudio, adaptado a tu nivel académico.',
        lang: 'es-CO',
        dir: 'ltr',
        categories: ['education', 'productivity'],
        theme_color: '#3e2f25',
        background_color: '#e9e5dd',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icono.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        shortcuts: [
          { name: 'Repasar', short_name: 'Repasar', url: './#/repasar' },
          { name: 'Registrar un error', short_name: 'Errores', url: './#/errores' },
          { name: 'Notas y plan', short_name: 'Plan', url: './#/notas' },
        ],
      },
      workbox: {
        // mjs: el lector de PDF, para poder subir documentos sin conexión.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    // El lector de PDF pesa algo más de 500 kB, pero solo se descarga al subir un documento.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Librerías en archivos aparte: cambian poco y el navegador las conserva en caché.
        manualChunks: {
          react: ['react', 'react-dom'],
          datos: ['dexie', 'zod', 'zustand'],
          graficos: ['d3-hierarchy', 'd3-force'],
          fechas: ['date-fns'],
        },
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
});
