/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Rubik', 'sans-serif'],
      },
      fontSize: {
        'xs': '11px',
        'sm': '13px',
        'base': '15px',
        'lg': '17px',
        'xl': '19px',
        '2xl': '23px',
        '3xl': '29px',
        '4xl': '35px',
        '5xl': '47px',
        'title': '20px',
      },
      colors: {
        water: {
          light: '#DBEAFE',
          DEFAULT: '#3B82F6',
          dark: '#1E40AF',
          glow: '#60A5FA'
        },
        status: {
          safe: '#10B981',
          'safe-bg': '#D1FAE5',
          caution: '#F59E0B',
          'caution-bg': '#FEF3C7',
          danger: '#DC2626',
          'danger-bg': '#FEE2E2',
          info: '#3B82F6',
          'info-bg': '#DBEAFE'
        }
      },
      spacing: {
        '15': '60px',
        '22.5': '90px',
        '30': '120px'
      },
      borderWidth: {
        'priority': '4px'
      },
      animation: {
        'pulse-red': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    },
  },
  plugins: [],
}
