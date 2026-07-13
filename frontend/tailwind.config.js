/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Pretendard', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#101010',
        chalk: '#e8e8e8',
        board: '#154866',
        panel: '#111111',
      },
      boxShadow: {
        chalk: '0 0 0 2px rgba(232,232,232,0.9), 0 0 28px rgba(232,232,232,0.08)',
      },
    },
  },
  plugins: [],
};
