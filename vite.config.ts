/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Link previews (WhatsApp, Telegram…) need absolute og:image URLs. Uses
 * SITE_URL, or the production domain Vercel exposes at build time.
 */
function absoluteOgImage(): Plugin {
  const site =
    process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  return {
    name: 'absolute-og-image',
    transformIndexHtml(html) {
      if (!site) return html;
      const base = site.replace(/\/$/, '');
      return html
        .replace('content="/og.png"', `content="${base}/og.png"`)
        .replace('<meta property="og:type"', `<meta property="og:url" content="${base}/" />\n    <meta property="og:type"`);
    },
  };
}

export default defineConfig({
  plugins: [react(), absoluteOgImage()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Nombres que usa el firmware de Moddable para el nucleo compartido (solo para las pruebas).
      'animo-core': path.resolve(__dirname, './core/animo.js'),
      'animo-sprites': path.resolve(__dirname, './core/sprites.js'),
      'animo-relay': path.resolve(__dirname, './core/relay.js'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Librerias aparte: al actualizar la app no se vuelven a bajar.
        manualChunks: {
          react: ['react', 'react-dom', 'framer-motion'],
          state: ['zustand'],
          p2p: ['yjs', 'y-webrtc', 'y-indexeddb'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // Modulos de Moddable que no existen en Node: imitaciones para las pruebas.
    alias: {
      timer: path.resolve(__dirname, './firmware/test/timer-stub.js'),
    },
  },
});
