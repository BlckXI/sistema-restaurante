const token = (nombre) => `rgb(var(--${nombre}) / <alpha-value>)`;
const estado = (n) => ({ DEFAULT: token(n), soft: token(`${n}-soft`), ink: token(`${n}-ink`) });

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: token('app'),
        surface: { DEFAULT: token('surface'), muted: token('surface-muted') },
        line: token('line'),
        ink: { DEFAULT: token('ink'), muted: token('ink-muted') },
        brand: {
          DEFAULT: token('brand'),
          hover: token('brand-hover'),
          accent: token('brand-accent'),
          text: token('brand-text')
        },
        success: estado('success'),
        warning: estado('warning'),
        danger: estado('danger'),
        info: estado('info')
      }
    }
  },
  plugins: []
};