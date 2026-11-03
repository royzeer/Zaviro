import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-tema="oscuro"]'],
  theme: {
    extend: {
      colors: {
        fondo: token('fondo'),
        superficie: token('superficie'),
        'superficie-2': token('superficie-2'),
        lateral: token('lateral'),
        'lateral-tinta': token('lateral-tinta'),
        tinta: token('tinta'),
        'tinta-suave': token('tinta-suave'),
        linea: token('linea'),
        primario: token('primario'),
        'sobre-primario': token('sobre-primario'),
        acento: token('acento'),
        exito: token('exito'),
        peligro: token('peligro'),
        oxido: token('oxido'),
        brillo: token('brillo'),
      },
      fontFamily: {
        sans: ['"Manrope Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        tarjeta: '1.25rem',
      },
      boxShadow: {
        tarjeta: '0 1px 2px rgb(var(--sombra) / 0.06), 0 8px 24px -12px rgb(var(--sombra) / 0.18)',
        flotante: '0 12px 40px -12px rgb(var(--sombra) / 0.35)',
      },
      keyframes: {
        aparecer: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        aparecer: 'aparecer 320ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
