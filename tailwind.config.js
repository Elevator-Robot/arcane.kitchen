/** @type {import('tailwindcss').Config} */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,css}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cottage: {
          cream: {
            dark: '#f5e6d3',
            DEFAULT: '#fffaf5',
            light: '#fffdf9',
          },
          parchment: {
            dark: '#e8dcc5',
            DEFAULT: '#faf0e6',
            light: '#fdf6ee',
          },
          pumpkin: {
            dark: '#b45309',
            DEFAULT: '#d97706',
            light: '#f59e0b',
            glow: '#fbbf24',
          },
          sage: {
            dark: '#4a663a',
            DEFAULT: '#5a7a4a',
            light: '#7a9a6a',
            herb: '#94a87a',
          },
          earth: {
            dark: '#2c1810',
            DEFAULT: '#4a3520',
            light: '#6b5035',
            muted: '#8b7355',
          },
          hearth: {
            dark: '#b8a48a',
            DEFAULT: '#d4c4a8',
            light: '#e8dcc8',
          },
          ember: {
            dark: '#7f1d1d',
            DEFAULT: '#dc2626',
            light: '#ef4444',
          },
        },
      },
      fontFamily: {
        heading: ['Fraunces', 'Georgia', 'ui-serif', 'serif'],
        body: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'warm-gradient':
          'linear-gradient(135deg, rgba(217, 119, 6, 0.08), rgba(90, 122, 74, 0.06))',
        'pumpkin-gradient':
          'linear-gradient(135deg, rgba(217, 119, 6, 0.9), rgba(180, 83, 9, 0.85))',
        'sage-gradient':
          'linear-gradient(135deg, rgba(90, 122, 74, 0.9), rgba(74, 102, 58, 0.85))',
        'ember-gradient':
          'linear-gradient(135deg, rgba(220, 38, 38, 0.9), rgba(127, 29, 29, 0.85))',
        'parchment-texture': "url('/textures/parchment.jpg')",
      },
      boxShadow: {
        cozy: '0 4px 16px rgba(44, 24, 16, 0.08)',
        'cozy-lg': '0 8px 30px rgba(44, 24, 16, 0.1)',
        'cozy-xl': '0 12px 40px rgba(44, 24, 16, 0.12)',
        'pumpkin-glow':
          '0 0 16px rgba(217, 119, 6, 0.25), 0 0 30px rgba(217, 119, 6, 0.1)',
        'sage-glow':
          '0 0 16px rgba(90, 122, 74, 0.25), 0 0 30px rgba(90, 122, 74, 0.1)',
        inset: 'inset 0 2px 4px rgba(44, 24, 16, 0.06)',
      },
      container: {
        center: true,
        padding: '1.5rem',
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
      },
      borderRadius: {
        cozy: '0.75rem',
        'cozy-lg': '1rem',
        'cozy-xl': '1.25rem',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'gentle-pulse': 'gentle-pulse 3s ease-in-out infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'gentle-pulse': {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
