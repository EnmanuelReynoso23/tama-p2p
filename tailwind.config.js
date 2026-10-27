/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        ui: ['Nunito', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#2b2138',
        cream: '#fbf5ea',
        paper: '#fffaf2',
        blush: '#ffd6e0',
        mint: '#d8f3dc',
        lilac: '#6b4a80',
        leaf: { DEFAULT: '#4fb35f', dark: '#2f7d3b', soft: '#e3f6e6' },
        flame: { DEFAULT: '#ff7a1a', text: '#b93d00', soft: '#ffe5d0' },
      },
    },
  },
  plugins: [],
};
