/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette PayLumo — dérivée du logo officiel (ampoule verte #288d3f)
        brand: {
          50: '#eef8f1',
          100: '#d5edda',
          200: '#aedcb8',
          300: '#7cc38c',
          400: '#46a660',
          500: '#288d3f',
          600: '#1e7134',
          700: '#1b592b',
          800: '#194724',
          900: '#153a20',
          950: '#07200f',
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
