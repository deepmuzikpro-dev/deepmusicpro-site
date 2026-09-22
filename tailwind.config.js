/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dmp: {
          black: '#0a0a0a',
          charcoal: '#141414',
          panel: '#1c1c1c',
          white: '#f5f5f5',
          green: '#1db954',
          greendark: '#14893a',
          red: '#e0263a',
          yellow: '#f2c14e',
        },
      },
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(29,185,84,0.35)',
      },
    },
  },
  plugins: [],
}
