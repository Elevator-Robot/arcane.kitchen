/** @type {import('tailwindcss').Config} */
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
            dark: '#1a0d2e',      // Deep midnight purple
            DEFAULT: '#4c1d95',   // Rich royal purple
            light: '#7c3aed',     // Bright mystical purple
            glow: '#a855f7',      // Glowing purple
          },
          emerald: {
            dark: '#064e3b',      // Deep forest emerald
            DEFAULT: '#059669',   // Potion emerald
            light: '#10b981',     // Bright emerald
            poison: '#22c55e',    // Poison green
          },
          amber: {
            dark: '#92400e',      // Dark amber
            DEFAULT: '#d97706',   // Golden amber
            light: '#f59e0b',     // Bright amber
            glow: '#fbbf24',      // Glowing amber
          },
          crimson: {
            dark: '#7f1d1d',      // Dark blood red
            DEFAULT: '#dc2626',   // Crimson red
            light: '#ef4444',     // Bright red
            poison: '#f87171',    // Poison red
          },
          parchment: {
            dark: '#e8dcc5',      // Darker parchment
            DEFAULT: '#f5f0e8',   // Main parchment
            light: '#faf7f2',     // Light parchment
            cream: '#fffbf0',     // Cream white
          },
          text: {
            dark: '#1f2937',      // Dark text
            DEFAULT: '#374151',   // Main text
            light: '#6b7280',     // Light text
            muted: '#9ca3af',     // Muted text
          },
          cauldron: {
            dark: '#111827',      // Deep cauldron black
            DEFAULT: '#1f2937',   // Cauldron gray
            light: '#374151',     // Light cauldron
            rim: '#6b7280',       // Cauldron rim
          }
        }
      },
      fontFamily: {
        heading: ['Cormorant Garamond', 'Garamond', 'serif'],
        body: ['Raleway', 'Open Sans', 'sans-serif'],
        mystical: ['Cinzel', 'serif'],
        script: ['Dancing Script', 'cursive'],
      },
      backgroundImage: {
        'parchment': "url('/textures/parchment.jpg')",
        'magic-gradient': 'linear-gradient(135deg, rgba(76, 29, 149, 0.9), rgba(5, 150, 105, 0.8))',
        'potion-gradient': 'linear-gradient(135deg, rgba(76, 29, 149, 0.9), rgba(34, 197, 94, 0.8), rgba(217, 119, 6, 0.7))',
        'poison-gradient': 'linear-gradient(135deg, rgba(6, 78, 59, 0.9), rgba(34, 197, 94, 0.8))',
        'cauldron-gradient': 'radial-gradient(ellipse at center, rgba(31, 41, 55, 0.9), rgba(17, 24, 39, 1))',
        'mystical-smoke': 'linear-gradient(180deg, transparent 0%, rgba(168, 85, 247, 0.1) 50%, transparent 100%)',
        'hero-pattern': "url('/images/magical-kitchen.jpg')",
      },
      boxShadow: {
        'magical': '0 4px 20px -2px rgba(76, 29, 149, 0.25), 0 0 8px rgba(168, 85, 247, 0.2)',
        'potion': '0 4px 20px -2px rgba(34, 197, 94, 0.25), 0 0 12px rgba(34, 197, 94, 0.15)',
        'poison': '0 4px 20px -2px rgba(6, 78, 59, 0.3), 0 0 15px rgba(34, 197, 94, 0.2)',
        'cauldron': 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.2)',
        'recipe-card': '0 4px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(76, 29, 149, 0.1)',
        'recipe-hover': '0 8px 25px rgba(76, 29, 149, 0.2), 0 4px 10px rgba(168, 85, 247, 0.15)',
        'mystical-glow': '0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2)',
        'emerald-glow': '0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2)',
        'amber-glow': '0 0 20px rgba(251, 191, 36, 0.4), 0 0 40px rgba(251, 191, 36, 0.2)',
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
        'potion-bubble': 'potion-bubble 4s ease-in-out infinite',
        'poison-drip': 'poison-drip 6s ease-in-out infinite',
        'cauldron-steam': 'cauldron-steam 8s ease-in-out infinite',
        'mystical-float': 'mystical-float 6s ease-in-out infinite',
        'spell-cast': 'spell-cast 2s ease-out',
        'ingredient-drop': 'ingredient-drop 3s ease-in-out infinite',
        'smoke-rise': 'smoke-rise 10s linear infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'magical-entrance': 'magical-entrance 1s ease-out',
        'character-glow': 'character-glow 3s ease-in-out infinite',
      },
      keyframes: {
        'magical-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(168, 85, 247, 0.5), 0 0 10px rgba(168, 85, 247, 0.3)',
            transform: 'scale(1)'
          },
          '50%': { 
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.8), 0 0 30px rgba(168, 85, 247, 0.5)',
            transform: 'scale(1.02)'
          },
        },
        'potion-bubble': {
          '0%, 100%': { 
            transform: 'translateY(0) scale(1)',
            opacity: '0.7'
          },
          '50%': { 
            transform: 'translateY(-10px) scale(1.1)',
            opacity: '1'
          },
        },
        'poison-drip': {
          '0%': { 
            transform: 'translateY(-100%) scaleY(0)',
            opacity: '0'
          },
          '50%': { 
            transform: 'translateY(0) scaleY(1)',
            opacity: '0.8'
          },
          '100%': { 
            transform: 'translateY(100%) scaleY(0)',
            opacity: '0'
          },
        },
        'cauldron-steam': {
          '0%': { 
            transform: 'translateY(0) rotate(0deg) scale(1)',
            opacity: '0.8'
          },
          '50%': { 
            transform: 'translateY(-20px) rotate(180deg) scale(1.2)',
            opacity: '0.4'
          },
          '100%': { 
            transform: 'translateY(-40px) rotate(360deg) scale(0.8)',
            opacity: '0'
          },
        },
        'mystical-float': {
          '0%, 100%': { 
            transform: 'translateY(0) rotate(0deg)',
          },
          '33%': { 
            transform: 'translateY(-10px) rotate(120deg)',
          },
          '66%': { 
            transform: 'translateY(-5px) rotate(240deg)',
          },
        },
        'spell-cast': {
          '0%': { 
            transform: 'scale(0.8) rotate(0deg)',
            opacity: '0'
          },
          '50%': { 
            transform: 'scale(1.1) rotate(180deg)',
            opacity: '1'
          },
          '100%': { 
            transform: 'scale(1) rotate(360deg)',
            opacity: '1'
          },
        },
        'ingredient-drop': {
          '0%': { 
            transform: 'translateY(-20px) rotate(0deg)',
            opacity: '0'
          },
          '50%': { 
            transform: 'translateY(0) rotate(180deg)',
            opacity: '1'
          },
          '100%': { 
            transform: 'translateY(20px) rotate(360deg)',
            opacity: '0'
          },
        },
        'smoke-rise': {
          '0%': { 
            transform: 'translateY(100%) scale(0.5)',
            opacity: '0'
          },
          '50%': { 
            transform: 'translateY(0) scale(1)',
            opacity: '0.6'
          },
          '100%': { 
            transform: 'translateY(-100%) scale(1.5)',
            opacity: '0'
          },
        },
        'shimmer': {
          '0%': { 
            backgroundPosition: '-200% 0'
          },
          '100%': { 
            backgroundPosition: '200% 0'
          },
        },
        'pulse-glow': {
          '0%, 100%': { 
            opacity: '0.7',
            transform: 'scale(1)'
          },
          '50%': { 
            opacity: '1',
            transform: 'scale(1.05)'
          },
        },
      },
      backdropBlur: {
        'mystical': '12px',
      },
      blur: {
        'mystical': '8px',
      }
    },
  },
  plugins: [],
}
