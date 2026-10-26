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
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendors so app updates don't re-download React/XState/Trystero.
        manualChunks: {
          react: ['react', 'react-dom', 'framer-motion'],
          state: ['xstate', '@xstate/react', 'zustand'],
          p2p: ['trystero/nostr'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
