/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#030712',
          900: '#070b19',
          850: '#0b132b',
          800: '#111c44',
          700: '#1c2541',
          600: '#3a506b',
        },
        astro: {
          green: '#00ff88',
          cyan: '#00f0ff',
          yellow: '#ffd166',
          orange: '#ff9f1c',
          red: '#ff3366',
          purple: '#a855f7'
        },
        pastel: {
          cyan: '#8DE8F4',
          sky: '#A9C9FF',
          lavender: '#C9B8FF',
          pink: '#FFC3D8',
          yellow: '#FFE69A',
          mint: '#7AE582',
          white: '#F8FCFF',
          deep: '#0D1326',
          mid: '#161F38',
        }
      },
      fontFamily: {
        cairo: ['Cairo', 'Fredoka', 'system-ui', 'sans-serif'],
        tajawal: ['Tajawal', 'sans-serif'],
        orbitron: ['Orbitron', 'sans-serif'],
        fredoka: ['Cairo', 'Fredoka', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        }
      }
    },
  },
  plugins: [],
}
