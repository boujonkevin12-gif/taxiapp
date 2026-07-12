/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fondo y superficies (tema oscuro VOXA)
        base: {
          950: '#08080c',
          900: '#0d0d14',
          800: '#131320',
          700: '#1a1a2b',
          600: '#23233a',
          500: '#33334f',
        },
        // Acento principal: violeta
        primary: {
          50: '#f3f0ff',
          100: '#e5deff',
          200: '#cabdff',
          300: '#a894ff',
          400: '#8b6bff',
          500: '#7c4dff',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3b1878',
        },
        // Acento secundario: verde
        accent: {
          50: '#ecfdf3',
          100: '#d1fae0',
          200: '#a7f3c6',
          300: '#6ee7a4',
          400: '#34d17e',
          500: '#1db866',
          600: '#149a54',
          700: '#127b45',
          800: '#12613a',
          900: '#0f5031',
        },
        yellow: {
          400: '#facc15',
          500: '#eab308',
        },
        // Acento del panel de administración: azul
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(124, 77, 255, 0.35)',
        'glow-accent': '0 0 40px -10px rgba(29, 184, 102, 0.35)',
      },
      borderRadius: {
        '2xl': '1.1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
