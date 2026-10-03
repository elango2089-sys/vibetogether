/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        lux: {
          bg: '#090b0e',
          card: '#11141c',
          cardHover: '#161a25',
          border: '#202533',
          gold: '#d4af37',
          goldLight: '#f3e5ab',
          silver: '#94a3b8',
          text: '#f8fafc',
          textMuted: '#64748b'
        }
      }
    },
  },
  plugins: [],
}
