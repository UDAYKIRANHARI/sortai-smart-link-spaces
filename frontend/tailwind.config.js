/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sortai-black': '#000000',
        'sortai-jet': '#111111',
        'sortai-slate': '#6A6A6A',
        'sortai-silver': '#B5B5B5',
        'sortai-pale': '#E2E2E2',
        'sortai-white': '#F7F7F7',
        // Source accent colors
        'src-youtube': '#FF4444',
        'src-github': '#8B5CF6',
        'src-instagram': '#E1306C',
        'src-tiktok': '#25F4EE',
        'src-linkedin': '#0A66C2',
        'src-web': '#3B82F6',
        // Space accent colors
        'space-career': '#F59E0B',
        'space-study': '#3B82F6',
        'space-fashion': '#EC4899',
        'space-fitness': '#10B981',
        'space-tech': '#8B5CF6',
        'space-tools': '#F97316',
        'space-weblinks': '#6366F1',
        'space-entertainment': '#EF4444',
        'space-life': '#14B8A6',
        'space-other': '#6B7280',
      },
      fontFamily: {
        heading: ['Unbounded', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'spin-slow': 'spin 20s linear infinite',
        'check-in': 'checkIn 0.3s ease-out forwards',
        'step-reveal': 'stepReveal 0.4s ease-out forwards',
        'expand-in': 'expandIn 0.3s ease-out forwards',
        'success-pop': 'successPop 0.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(3deg)' },
        },
        checkIn: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        stepReveal: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        expandIn: {
          '0%': { opacity: '0', maxHeight: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', maxHeight: '500px', transform: 'translateY(0)' },
        },
        successPop: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
