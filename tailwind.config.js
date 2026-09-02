/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette PayLumo — dérivée du logo (ampoule verte)
        brand: {
          50: '#f0f9f1',
          100: '#dcf0de',
          200: '#bce2c0',
          300: '#8ecd96',
          400: '#5bb066',
          500: '#3e9e4e',
          600: '#2f7d3d',
          700: '#286432',
          800: '#24502c',
          900: '#1f4226',
          950: '#0d2413',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
