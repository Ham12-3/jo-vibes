import defaultTheme from 'tailwindcss/defaultTheme'
import animatePlugin from 'tailwindcss-animate'

export default {
  content: [
    './src/**/*.{ts,tsx,jsx,js}',
    './app/**/*.{ts,tsx,jsx,js}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7F5AF0',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#FF66FF',
          foreground: '#FFFFFF',
        },
        background: '#F8F9FC',
        muted: '#1f2937',
        'muted-foreground': '#9ca3af',
      },
      fontFamily: {
        sans: ['var(--font-geist)', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [animatePlugin],
}