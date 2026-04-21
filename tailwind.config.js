/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f8ff',
          100: '#d9eeff',
          200: '#b7dcff',
          300: '#84c2ff',
          400: '#4da2ff',
          500: '#257fff',
          600: '#0f5de5',
          700: '#124bb6',
          800: '#163f8f',
          900: '#17386f',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
};
