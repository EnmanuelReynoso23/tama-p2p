/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', '"VT323"', 'monospace'],
        ui: ['Nunito', 'system-ui', 'sans-serif'],
      },
      colors: {
        device: {
          shell: '#f4b8c0',
          shellDark: '#d89098',
          screen: '#e8e3c0',
          screenDark: '#c8c090',
          button: '#f7a8c4',
          buttonDark: '#d8889f',
        },
      },
      boxShadow: {
        device:
          '0 20px 50px -12px rgba(0, 0, 0, 0.25), inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -4px 0 rgba(0,0,0,0.08)',
        screen:
          'inset 0 2px 8px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.6)',
        'btn-press': 'inset 0 3px 0 rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
};
