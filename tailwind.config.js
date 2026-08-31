/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette relevee sur les maquettes validees par SOGECO.
        navy: {
          900: '#0B1730',   // fond de la barre laterale
          800: '#12234A',
          700: '#1B3266',
          600: '#24408A',
        },
        accent: {
          DEFAULT: '#1E5EFF',
          hover: '#1749CC',
          soft: '#E8EFFF',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F7FA',   // fond d'application
          border: '#E4E8EF',
        },
        status: {
          moving: '#16A34A',
          idle: '#F59E0B',
          alert: '#DC2626',
          offline: '#94A3B8',
          maintenance: '#6366F1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Chiffres a chasse fixe : les colonnes de montants et de
        // kilometrages restent alignees d'une ligne a l'autre.
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)',
        panel: '-4px 0 24px rgba(16, 24, 40, 0.08)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Anneau qui se dilate et s'efface : utilise pour un camion
        // "en mouvement" sur la carte, en pur CSS — un tableau peut
        // afficher des dizaines de badges simultanement, la encore
        // une animation CSS legere convient mieux qu'une animation
        // pilotee par JavaScript pour chaque ligne.
        'pulse-ring': {
          '0%':   { transform: 'scale(0.9)', opacity: '0.7' },
          '70%':  { transform: 'scale(1.7)', opacity: '0' },
          '100%': { transform: 'scale(1.7)', opacity: '0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.2, 0.6, 0.4, 1) infinite',
      },
      backgroundImage: {
        shimmer: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
      },
    },
  },
  plugins: [],
};
