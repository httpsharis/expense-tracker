/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Global CSS Variable Tokens (Single Source of Truth in app/global.css)
        canvas: {
          DEFAULT: 'var(--color-canvas)',
          dark: 'var(--color-canvas)',
        },
        surface: {
          DEFAULT: 'var(--color-surface-flat)',
          dark: 'var(--color-surface-flat)',
          flat: 'var(--color-surface-flat)',
          'flat-dark': 'var(--color-surface-flat)',
          'flat-border': 'var(--color-surface-flat-border)',
          'flat-border-dark': 'var(--color-surface-flat-border)',
          raised: 'var(--color-surface-raised)',
          'raised-dark': 'var(--color-surface-raised)',
          muted: 'var(--color-surface-tint)',
          'muted-dark': 'var(--color-surface-tint)',
          border: 'var(--color-surface-flat-border)',
          'border-dark': 'var(--color-surface-flat-border)',
          divider: 'var(--color-divider)',
          'divider-dark': 'var(--color-divider)',
          blur: 'var(--color-surface-blur)',
          pill: 'var(--color-surface-pill)',
        },
        ink: {
          DEFAULT: 'var(--color-text-primary)',
          light: 'var(--color-text-primary)',
          muted: 'var(--color-text-secondary)',
          'muted-dark': 'var(--color-text-secondary)',
          whisper: 'var(--color-text-tertiary)',
          'whisper-dark': 'var(--color-text-tertiary)',
        },
        btn: {
          fill: 'var(--color-btn-fill)',
          text: 'var(--color-btn-text)',
        },

        // Alias tokens mapped to Global CSS Variables (Neutral surfaces)
        forest: {
          DEFAULT: '#18181B',
          surface: 'var(--color-surface-flat)',
          deep: 'var(--color-canvas)',
          border: 'var(--color-surface-flat-border)',
        },
        botanical: {
          canvas: 'var(--color-canvas)',
          pearl: 'var(--color-surface-tint)',
          border: 'var(--color-surface-flat-border)',
          divider: 'var(--color-divider)',
          surface: 'var(--color-surface-flat)',
          'surface-dark': 'var(--color-surface-flat)',
        },

        // Primary Green for Buttons & Positive Accents Only
        primary: {
          DEFAULT: '#22C55E',
          dark: '#16A34A',
          tint: '#DCFCE7',
        },
        lime: {
          DEFAULT: '#22C55E',
          bright: '#22C55E',
          tint: '#DCFCE7',
        },
        emerald: {
          DEFAULT: '#16A34A',
          dim: 'rgba(22, 163, 74, 0.12)',
        },
        coral: {
          DEFAULT: '#EF4444',
          dim: 'rgba(239, 68, 68, 0.12)',
        },
        gold: {
          DEFAULT: '#C9A24B',
          dim: 'rgba(201, 162, 75, 0.14)',
        },

        // Legacy & Backward-Compatible Palette
        background: 'var(--color-canvas)',
        muted: 'var(--color-text-secondary)',
        brand: {
          bg: 'var(--color-canvas)',
          body: 'var(--color-text-primary)',
          surface: 'var(--color-surface-flat)',
          "surface-border": 'var(--color-surface-flat-border)',
          "text-primary": 'var(--color-text-primary)',
          "text-secondary": 'var(--color-text-secondary)',
          "text-muted": 'var(--color-text-tertiary)',
          blue: "#1A85FF",
          coral: "#EF4444",
          success: "#22C55E",
        }
      },
      borderRadius: {
        '4xl': '32px',
        '3xl': '28px',
        '2xl': '24px',
        screen: '22px',
        card: '18px',
        input: '12px',
      }
    },
  },
  plugins: [],
}