/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Exact User-Specified Colors
        primary: "#3b82f6", 
        "primary-light": "#60a5fa",
        secondary: "#10b981", 
        surface: "#0a1128", 
        "surface-card": "#111827",
        "on-surface": "#f8fafc", 
        "on-surface-variant": "#94a3b8", 
        error: "#ef4444",

        // Mapped Brand & Glass Tokens
        brand: {
          canvas: '#0a1128',
          base: '#111827',
          raised: 'rgba(17, 25, 40, 0.45)',
          overlay: 'rgba(255, 255, 255, 0.05)',
          subtle: '#1e293b',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-strong': 'rgba(255, 255, 255, 0.15)',
          primary: '#3b82f6',
          'primary-hover': '#60a5fa',
          'primary-subtle': 'rgba(59, 130, 246, 0.15)',
          ice: '#38bdf8',
          'ice-subtle': 'rgba(56, 189, 248, 0.15)',
        },
        status: {
          verified: '#10b981',
          'verified-subtle': 'rgba(16, 185, 129, 0.15)',
          pending: '#f59e0b',
          'pending-subtle': 'rgba(245, 158, 11, 0.15)',
          failed: '#ef4444',
          'failed-subtle': 'rgba(239, 68, 68, 0.15)',
          active: '#3b82f6',
          'active-subtle': 'rgba(59, 130, 246, 0.15)',
        },
        text: {
          primary: '#f8fafc',
          secondary: '#cbd5e1',
          muted: '#94a3b8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'panel': '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
        'modal': '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
        'card': '0 10px 30px -5px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
      }
    },
  },
  plugins: [],
}
