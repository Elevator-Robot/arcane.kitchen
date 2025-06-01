/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,css}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arcane: {
          purple: {
            dark: '#2a1b3d',    // Dark mystical purple
            DEFAULT: '#5e3a8a',  // Deep purple
            light: '#8a63c8',    // Lighter purple
          },
          amber: {
            dark: '#8c5e2a',     // Dark amber
            DEFAULT: '#a67c52',  // Warm amber
            light: '#d4a76a',    // Light amber
          },
          green: {
            dark: '#1a4d45',     // Dark herbal green
            DEFAULT: '#2d7d6f',  // Herbal green
            light: '#4aaa99',    // Light herbal green
          },
          parchment: {
            dark: '#e8dcc5',     // Darker parchment
            DEFAULT: '#f5f0e8',  // Parchment
            light: '#faf7f2',    // Light parchment
          },
          text: {
            dark: '#382a40',     // Dark text
            DEFAULT: '#4a3b54',  // Main text
            light: '#7a6b84',    // Light text
          }
        }
      },
      fontFamily: {
        heading: ['Cormorant Garamond', 'Garamond', 'serif'],
        body: ['Raleway', 'Open Sans', 'sans-serif'],
      },
      backgroundImage: {
        'parchment': "url('/textures/parchment.jpg')",
        'magic-gradient': 'linear-gradient(135deg, rgba(94, 58, 138, 0.9), rgba(45, 125, 111, 0.8))',
        'hero-pattern': "url('/images/magical-kitchen.jpg')",
      },
      boxShadow: {
        'magical': '0 4px 20px -2px rgba(94, 58, 138, 0.25), 0 0 8px rgba(94, 58, 138, 0.1)',
        'recipe-card': '0 4px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(94, 58, 138, 0.1)',
        'recipe-hover': '0 8px 16px rgba(94, 58, 138, 0.2), 0 2px 5px rgba(94, 58, 138, 0.15)',
      },
      container: {
        center: true,
        padding: '2rem',
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
      },
      animation: {
        'magical-glow': 'magical-glow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'magical-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(94, 58, 138, 0.5), 0 0 10px rgba(94, 58, 138, 0.3)' },
          '50%': { boxShadow: '0 0 15px rgba(94, 58, 138, 0.8), 0 0 20px rgba(94, 58, 138, 0.5)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
