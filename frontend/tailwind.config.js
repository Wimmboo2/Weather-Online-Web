export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        pulseSlow: {
          '0%, 100%': { opacity: '0.9' },
          '50%': { opacity: '0.5' }
        }
      },
      animation: {
        pulseSlow: 'pulseSlow 2s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
